import { useState, useCallback, useRef } from 'react'
import { detectNat } from '../utils/natDetect.js'

const INITIAL_DATA = {
  ip: null,
  reputation: null,
  sysContext: null,
  censorship: null,
  dns: null,
  nat: null,
  localNet: null,
  wifi: null
}

const INITIAL_LOADING = {
  ip: false,
  reputation: false,
  sysContext: false,
  censorship: false,
  dns: false,
  nat: false,
  localNet: false,
  wifi: false
}

const INITIAL_ERRORS = {
  ip: null,
  reputation: null,
  sysContext: null,
  censorship: null,
  dns: null,
  nat: null,
  localNet: null,
  wifi: null
}

export function useDiagnostics() {
  const [status, setStatus] = useState('idle') // idle | running | complete | error
  const [data, setData] = useState(INITIAL_DATA)
  const [loading, setLoading] = useState(INITIAL_LOADING)
  const [errors, setErrors] = useState(INITIAL_ERRORS)
  const abortRef = useRef(false)

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
    setStatus('running')
    setData(INITIAL_DATA)
    setLoading(INITIAL_LOADING)
    setErrors(INITIAL_ERRORS)

    // ── Phase 1: IP Identity (reputation depends on it) ─────────────────────
    setFieldLoading('ip', true)
    let ipData = null
    try {
      ipData = await window.api.diagIpIdentity()
      setField('ip', ipData)
    } catch (err) {
      setFieldError('ip', err?.message || 'error')
    } finally {
      setFieldLoading('ip', false)
    }

    if (abortRef.current) { setStatus('idle'); return }

    // ── Phase 2: Parallel — reputation, sysContext, localNet, wifi ──────────
    setFieldLoading('reputation', true)
    setFieldLoading('sysContext', true)
    setFieldLoading('localNet', true)
    setFieldLoading('wifi', true)

    await Promise.all([
      window.api.diagIpReputation(ipData?.ip ?? null)
        .then((v) => setField('reputation', v))
        .catch((e) => setFieldError('reputation', e?.message || 'error'))
        .finally(() => setFieldLoading('reputation', false)),

      window.api.diagSysContext()
        .then((v) => setField('sysContext', v))
        .catch((e) => setFieldError('sysContext', e?.message || 'error'))
        .finally(() => setFieldLoading('sysContext', false)),

      window.api.diagLocalNetwork()
        .then((v) => setField('localNet', v))
        .catch((e) => setFieldError('localNet', e?.message || 'error'))
        .finally(() => setFieldLoading('localNet', false)),

      window.api.diagWifi()
        .then((v) => setField('wifi', v))
        .catch((e) => setFieldError('wifi', e?.message || 'error'))
        .finally(() => setFieldLoading('wifi', false))
    ])

    if (abortRef.current) { setStatus('idle'); return }

    // ── Phase 3: Parallel — censorship + DNS + NAT ─────────────────────────
    setFieldLoading('censorship', true)
    setFieldLoading('dns', true)
    setFieldLoading('nat', true)

    await Promise.all([
      window.api.diagCensorship(ipData?.countryCode ?? null)
        .then((v) => setField('censorship', v))
        .catch((e) => setFieldError('censorship', e?.message || 'error'))
        .finally(() => setFieldLoading('censorship', false)),

      window.api.diagDns()
        .then((v) => setField('dns', v))
        .catch((e) => setFieldError('dns', e?.message || 'error'))
        .finally(() => setFieldLoading('dns', false)),

      detectNat()
        .then((v) => setField('nat', v))
        .catch((e) => setFieldError('nat', e?.message || 'error'))
        .finally(() => setFieldLoading('nat', false))
    ])

    setStatus('complete')
  }, [setField, setFieldLoading, setFieldError])

  const reset = useCallback(() => {
    abortRef.current = true
    setStatus('idle')
    setData(INITIAL_DATA)
    setLoading(INITIAL_LOADING)
    setErrors(INITIAL_ERRORS)
  }, [])

  return { status, data, loading, errors, run, reset }
}
