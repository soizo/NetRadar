import { useState, useCallback, useRef } from 'react'
import { detectNat } from '../utils/natDetect.js'

const INITIAL_DATA = {
  ip: null,
  publicIp: null,
  sysContext: null,
  censorship: null,
  dns: null,
  nat: null,
  localNet: null,
  wifi: null
}

const INITIAL_LOADING = {
  ip: false,
  publicIp: false,
  sysContext: false,
  censorship: false,
  dns: false,
  nat: false,
  localNet: false,
  wifi: false
}

const INITIAL_ERRORS = {
  ip: null,
  publicIp: null,
  sysContext: null,
  censorship: null,
  dns: null,
  nat: null,
  localNet: null,
  wifi: null
}

export function useDiagnostics(config = null) {
  const [status, setStatus] = useState('idle') // idle | running | complete | error
  const [data, setData] = useState(INITIAL_DATA)
  const [loading, setLoading] = useState(INITIAL_LOADING)
  const [errors, setErrors] = useState(INITIAL_ERRORS)
  const abortRef = useRef(false)
  const runIdRef = useRef(0)

  const setField = useCallback((field, value) => {
    setData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const setFieldLoading = useCallback((field, value) => {
    setLoading((prev) => ({ ...prev, [field]: value }))
  }, [])

  const setFieldError = useCallback((field, value) => {
    setErrors((prev) => ({ ...prev, [field]: value }))
  }, [])

  const run = useCallback(async () => {
    abortRef.current = false
    runIdRef.current += 1
    const currentRunId = runIdRef.current
    setStatus('running')
    setData(INITIAL_DATA)
    setLoading(INITIAL_LOADING)
    setErrors(INITIAL_ERRORS)

    // ── Phase 1: All local + public IP (fully parallel) ────────────────────
    setFieldLoading('ip', true)
    setFieldLoading('publicIp', true)
    setFieldLoading('sysContext', true)
    setFieldLoading('localNet', true)
    setFieldLoading('wifi', true)

    const stale = () => runIdRef.current !== currentRunId

    let publicIpCountryCode = null

    await Promise.all([
      window.api.diagIpIdentity()
        .then((v) => { if (!stale()) setField('ip', v) })
        .catch((e) => { if (!stale()) setFieldError('ip', e?.message || 'error') })
        .finally(() => { if (!stale()) setFieldLoading('ip', false) }),

      window.api.diagPublicIp()
        .then((v) => {
          if (!stale()) setField('publicIp', v)
          publicIpCountryCode = v?.countryCode || null
        })
        .catch((e) => { if (!stale()) setFieldError('publicIp', e?.message || 'error') })
        .finally(() => { if (!stale()) setFieldLoading('publicIp', false) }),

      window.api.diagSysContext()
        .then((v) => { if (!stale()) setField('sysContext', v) })
        .catch((e) => { if (!stale()) setFieldError('sysContext', e?.message || 'error') })
        .finally(() => { if (!stale()) setFieldLoading('sysContext', false) }),

      window.api.diagLocalNetwork()
        .then((v) => { if (!stale()) setField('localNet', v) })
        .catch((e) => { if (!stale()) setFieldError('localNet', e?.message || 'error') })
        .finally(() => { if (!stale()) setFieldLoading('localNet', false) }),

      window.api.diagWifi()
        .then((v) => { if (!stale()) setField('wifi', v) })
        .catch((e) => { if (!stale()) setFieldError('wifi', e?.message || 'error') })
        .finally(() => { if (!stale()) setFieldLoading('wifi', false) })
    ])

    if (abortRef.current || stale()) { setStatus('idle'); return }

    // ── Phase 2: Network checks — censorship + DNS + NAT ──────────────────
    setFieldLoading('censorship', true)
    setFieldLoading('dns', true)
    setFieldLoading('nat', true)

    const censorshipTargets = config?.diagnostics?.censorship_targets || []

    await Promise.all([
      window.api.diagCensorship(publicIpCountryCode, censorshipTargets)
        .then((v) => { if (!stale()) setField('censorship', v) })
        .catch((e) => { if (!stale()) setFieldError('censorship', e?.message || 'error') })
        .finally(() => { if (!stale()) setFieldLoading('censorship', false) }),

      window.api.diagDns()
        .then((v) => { if (!stale()) setField('dns', v) })
        .catch((e) => { if (!stale()) setFieldError('dns', e?.message || 'error') })
        .finally(() => { if (!stale()) setFieldLoading('dns', false) }),

      detectNat()
        .then((v) => { if (!stale()) setField('nat', v) })
        .catch((e) => { if (!stale()) setFieldError('nat', e?.message || 'error') })
        .finally(() => { if (!stale()) setFieldLoading('nat', false) })
    ])

    if (!stale()) setStatus('complete')
  }, [config, setField, setFieldLoading, setFieldError])

  const reset = useCallback(() => {
    abortRef.current = true
    setStatus('idle')
    setData(INITIAL_DATA)
    setLoading(INITIAL_LOADING)
    setErrors(INITIAL_ERRORS)
  }, [])

  return { status, data, loading, errors, run, reset }
}
