import { useState, useRef, useCallback } from 'react'
import { calculateNetworkScore } from '../utils/scoring.js'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function timestamp() {
  return new Date().toTimeString().slice(0, 8)
}

async function measureLatency(baseUrl, path, samples = 10, signal) {
  const times = []
  const url = `${baseUrl}${path}`

  for (let i = 0; i < samples; i++) {
    if (signal?.aborted) throw new Error('Aborted')
    const cacheBust = `${url.includes('?') ? '&' : '?'}_nr=${Date.now()}`
    const t0 = performance.now()
    try {
      await fetch(`${url}${cacheBust}`, {
        cache: 'no-store',
        mode: 'no-cors',
        signal
      })
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('Aborted')
      // Ignore network errors for latency (no-cors may cause opaque responses)
    }
    const elapsed = performance.now() - t0
    if (elapsed > 0) times.push(elapsed)
    await sleep(100)
  }

  if (times.length === 0) {
    return { latencyMs: 0, jitterMs: 0, minMs: 0, maxMs: 0 }
  }

  times.sort((a, b) => a - b)
  const trimCount = Math.max(1, Math.floor(times.length * 0.1))
  const trimmed = times.length > 3 ? times.slice(trimCount, times.length - trimCount) : times

  const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length
  const variance = trimmed.reduce((sq, t) => sq + Math.pow(t - avg, 2), 0) / trimmed.length

  return {
    latencyMs: Math.round(avg * 10) / 10,
    jitterMs: Math.round(Math.sqrt(variance) * 10) / 10,
    minMs: Math.round(times[0] * 10) / 10,
    maxMs: Math.round(times[times.length - 1] * 10) / 10
  }
}

async function measureDownload(baseUrl, path, sizeBytes, onProgress, signal) {
  const cacheBust = `${path.includes('?') ? '&' : '?'}bytes=${sizeBytes}&_nr=${Date.now()}`
  const url = `${baseUrl}${path}${cacheBust}`

  let response
  try {
    response = await fetch(url, { cache: 'no-store', signal })
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Aborted')
    throw err
  }

  if (!response.ok && response.type !== 'opaque') {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    const blob = await response.blob()
    const elapsed = 0.1
    const speedMbps = (blob.size * 8) / elapsed / 1e6
    return { speedMbps, samples: [speedMbps] }
  }

  const startTime = performance.now()
  let received = 0
  let lastSample = startTime
  const samples = []

  while (true) {
    if (signal?.aborted) {
      reader.cancel()
      throw new Error('Aborted')
    }
    const { done, value } = await reader.read()
    if (done) break
    received += value.length
    const now = performance.now()
    const elapsed = (now - startTime) / 1000

    if (elapsed > 0 && now - lastSample > 200) {
      const speedMbps = (received * 8) / elapsed / 1e6
      samples.push(speedMbps)
      lastSample = now
      onProgress?.({
        received,
        total: sizeBytes,
        speedMbps,
        percent: Math.min(100, (received / sizeBytes) * 100)
      })
    }
  }

  const totalElapsed = (performance.now() - startTime) / 1000
  const finalSpeed = totalElapsed > 0 ? (received * 8) / totalElapsed / 1e6 : 0
  return { speedMbps: finalSpeed, samples, bytesReceived: received }
}

function measureUpload(baseUrl, path, sizeBytes, onProgress, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'))
      return
    }

    // Generate pseudo-random data
    const data = new Uint8Array(sizeBytes)
    for (let i = 0; i < sizeBytes; i++) {
      data[i] = (i * 137 + 53) & 0xff
    }

    const xhr = new XMLHttpRequest()
    const startTime = performance.now()
    const samples = []

    xhr.upload.addEventListener('progress', (e) => {
      if (e.loaded > 0) {
        const elapsed = (performance.now() - startTime) / 1000
        if (elapsed > 0) {
          const speedMbps = (e.loaded * 8) / elapsed / 1e6
          samples.push(speedMbps)
          onProgress?.({
            sent: e.loaded,
            total: sizeBytes,
            speedMbps,
            percent: Math.min(100, (e.loaded / sizeBytes) * 100)
          })
        }
      }
    })

    xhr.addEventListener('load', () => {
      const elapsed = (performance.now() - startTime) / 1000
      const finalSpeed = elapsed > 0 ? (sizeBytes * 8) / elapsed / 1e6 : 0
      resolve({ speedMbps: finalSpeed, samples })
    })

    xhr.addEventListener('error', () => reject(new Error('Upload request failed')))
    xhr.addEventListener('abort', () => reject(new Error('Aborted')))
    xhr.addEventListener('timeout', () => reject(new Error('Upload timed out')))

    const cacheBust = `${path.includes('?') ? '&' : '?'}_nr=${Date.now()}`
    xhr.open('POST', `${baseUrl}${path}${cacheBust}`)
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    xhr.timeout = 60000

    if (signal) {
      signal.addEventListener('abort', () => xhr.abort())
    }

    xhr.send(data.buffer)
  })
}

export function useSpeedTest() {
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState({ phase: '', percent: 0, currentSpeed: 0 })
  const [results, setResults] = useState(null)
  const [logs, setLogs] = useState([])
  const abortControllerRef = useRef(null)

  function addLog(message, type = 'info') {
    setLogs(prev => [...prev, { time: timestamp(), type, message }])
  }

  function clearLogs() {
    setLogs([])
  }

  const startTest = useCallback(async (server, settings = {}) => {
    if (!server) return

    const abortController = new AbortController()
    abortControllerRef.current = abortController
    const signal = abortController.signal

    clearLogs()
    setResults(null)
    setProgress({ phase: '', percent: 0, currentSpeed: 0 })

    const downloadSizeBytes = (settings.download_size_mb || 25) * 1024 * 1024
    const uploadSizeBytes = (settings.upload_size_mb || 10) * 1024 * 1024
    const latencySamples = settings.latency_samples || 10

    try {
      // ── Latency ────────────────────────────────────────────────
      setStatus('latency')
      addLog(`Connecting to ${server.name} (${server.location})...`, 'info')
      addLog(`Target: ${server.base_url}`, 'info')
      addLog(`Measuring latency with ${latencySamples} samples...`, 'info')

      setProgress({ phase: 'latency', percent: 0, currentSpeed: 0 })

      const latencyPath = server.latency_path || '/'
      const latencyResult = await measureLatency(server.base_url, latencyPath, latencySamples, signal)

      addLog(
        `Latency: ${latencyResult.latencyMs} ms | Jitter: ${latencyResult.jitterMs} ms | Min: ${latencyResult.minMs} ms | Max: ${latencyResult.maxMs} ms`,
        'data'
      )

      setProgress({ phase: 'latency', percent: 100, currentSpeed: 0 })

      if (signal.aborted) throw new Error('Aborted')

      // ── Download ───────────────────────────────────────────────
      setStatus('download')
      addLog(`Starting download test (${settings.download_size_mb || 25} MB)...`, 'info')
      setProgress({ phase: 'download', percent: 0, currentSpeed: 0 })

      let downloadResult = { speedMbps: 0, samples: [] }

      if (server.download_path) {
        try {
          downloadResult = await measureDownload(
            server.base_url,
            server.download_path,
            downloadSizeBytes,
            ({ speedMbps, percent }) => {
              setProgress({ phase: 'download', percent: percent || 0, currentSpeed: speedMbps })
              if (Math.floor((percent || 0) % 25) === 0) {
                addLog(
                  `Download: ${speedMbps.toFixed(1)} Mbps (${Math.round(percent || 0)}%)`,
                  'data'
                )
              }
            },
            signal
          )
        } catch (err) {
          if (err.message === 'Aborted') throw err
          addLog(`Download test failed: ${err.message}`, 'warning')
          addLog('Continuing with upload test...', 'info')
        }
      } else {
        addLog('No download path configured for this server, skipping...', 'warning')
      }

      addLog(
        `Download complete: ${downloadResult.speedMbps.toFixed(2)} Mbps`,
        downloadResult.speedMbps > 0 ? 'success' : 'warning'
      )
      setProgress(prev => ({ ...prev, phase: 'download', percent: 100, currentSpeed: downloadResult.speedMbps }))

      if (signal.aborted) throw new Error('Aborted')

      // ── Upload ─────────────────────────────────────────────────
      setStatus('upload')
      addLog(`Starting upload test (${settings.upload_size_mb || 10} MB)...`, 'info')
      setProgress({ phase: 'upload', percent: 0, currentSpeed: 0 })

      let uploadResult = { speedMbps: 0 }

      if (server.upload_path) {
        try {
          uploadResult = await measureUpload(
            server.base_url,
            server.upload_path,
            uploadSizeBytes,
            ({ speedMbps, percent }) => {
              setProgress({ phase: 'upload', percent: percent || 0, currentSpeed: speedMbps })
            },
            signal
          )
          addLog(
            `Upload complete: ${uploadResult.speedMbps.toFixed(2)} Mbps`,
            'success'
          )
        } catch (err) {
          if (err.message === 'Aborted') throw err
          addLog(`Upload test failed: ${err.message}`, 'warning')
        }
      } else {
        addLog('No upload path configured for this server, skipping...', 'warning')
      }

      setProgress(prev => ({ ...prev, phase: 'upload', percent: 100, currentSpeed: uploadResult.speedMbps }))

      if (signal.aborted) throw new Error('Aborted')

      // ── Scoring ────────────────────────────────────────────────
      setStatus('scoring')
      addLog('Calculating network score...', 'phase')
      setProgress({ phase: 'scoring', percent: 100, currentSpeed: 0 })

      await sleep(300)

      const metrics = {
        downloadMbps: downloadResult.speedMbps,
        uploadMbps: uploadResult.speedMbps,
        latencyMs: latencyResult.latencyMs,
        jitterMs: latencyResult.jitterMs
      }
      const score = calculateNetworkScore(metrics)

      const finalResults = {
        ...metrics,
        minMs: latencyResult.minMs,
        maxMs: latencyResult.maxMs,
        score,
        serverId: server.id,
        serverName: server.name,
        timestamp: new Date().toISOString()
      }

      setResults(finalResults)
      setStatus('complete')

      addLog('─'.repeat(48), 'info')
      addLog(`DOWNLOAD   : ${downloadResult.speedMbps.toFixed(2)} Mbps`, 'data')
      addLog(`UPLOAD     : ${uploadResult.speedMbps.toFixed(2)} Mbps`, 'data')
      addLog(`LATENCY    : ${latencyResult.latencyMs} ms`, 'data')
      addLog(`JITTER     : ${latencyResult.jitterMs} ms`, 'data')
      addLog(`SCORE      : ${score.overall}/100 [${score.grade}] ${score.rating}`, 'success')
      addLog('─'.repeat(48), 'info')
      addLog('Test complete.', 'success')

    } catch (err) {
      if (err.message === 'Aborted') {
        setStatus('idle')
        addLog('Test cancelled by user.', 'warning')
        setProgress({ phase: '', percent: 0, currentSpeed: 0 })
      } else {
        setStatus('error')
        addLog(`ERROR: ${err.message}`, 'error')
        addLog('Test failed. Check your connection and try again.', 'error')
        console.error('Speed test error:', err)
      }
    }
  }, [])

  const cancelTest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  return { status, progress, results, logs, startTest, cancelTest }
}
