# NetRadar Bug Report

**Date:** 2026-04-05
**Scope:** Full source audit -- main process, preload, renderer, config, i18n, build
**Verdict:** CONCERNS -- 4 High, 14 Medium, 8 Low severity issues

---

### Issue #1: Latency Measured via HTTP, Not ICMP -- Inflated and Inaccurate

- **Severity:** High
- **Files:** `src/renderer/src/hooks/useSpeedTest.js:12-52`
- **Description:** Latency uses `fetch()` in `no-cors` mode measuring full HTTP round-trip (TCP + TLS + HTTP), not network-layer latency. First sample includes TLS establishment overhead. Results are 2-10x higher than `ping`.
- **Reproduction:** Run speed test, compare reported latency against `ping speed.cloudflare.com`.
- **Fix:** Warm-up request before sampling. Consider main-process TCP SYN/ACK timing.

### Issue #2: Download Speed Uses Cumulative Average -- Masks Throttling

- **Severity:** High
- **Files:** `src/renderer/src/hooks/useSpeedTest.js:54-110`
- **Description:** `(received * 8) / elapsed / 1e6` is cumulative average from start. ISP burst-then-throttle policies produce inflated blended results. Progress % uses requested size, not actual content-length.
- **Fix:** Interval-based sliding window measurement.

### Issue #3: Upload Allocates Entire Payload in Memory -- Potential OOM

- **Severity:** High
- **Files:** `src/renderer/src/hooks/useSpeedTest.js:112-166`
- **Description:** `new Uint8Array(sizeBytes)` with synchronous fill loop. Config allows unlimited size via YAML editing. 500 MB = OOM crash.
- **Fix:** Enforce max upload size. Use `crypto.getRandomValues()` in chunks.

### Issue #4: `webSecurity: false` Disables Same-Origin Policy

- **Severity:** High
- **Files:** `src/main/index.js:199`
- **Description:** Combined with `sandbox: false`, any renderer script can make unrestricted cross-origin requests. Malicious server URL in config = unrestricted network access.
- **Fix:** Remove `webSecurity: false`. Proxy speed test through main process.

### Issue #5: `sandbox: false` Weakens Security Model

- **Severity:** Medium
- **Files:** `src/main/index.js:197`
- **Description:** Preload runs with full Node.js access. Current preload only uses `contextBridge` and `ipcRenderer`, which work sandboxed.
- **Fix:** Set `sandbox: true`.

### Issue #6: Concurrent Speed Tests Not Prevented -- State Corruption

- **Severity:** Medium
- **Files:** `src/renderer/src/hooks/useSpeedTest.js:183-343`
- **Description:** No guard against double-clicking "Start Test". Two concurrent tests interleave state updates. `abortControllerRef` overwritten, first test uncancellable.
- **Fix:** Guard with running-state ref. Abort previous test on new start.

### Issue #7: Concurrent Diagnostics Runs Not Guarded

- **Severity:** Medium
- **Files:** `src/renderer/src/hooks/useDiagnostics.js:53-115`
- **Description:** `run()` resets and starts without checking in-flight state. Phase 1 IPC calls complete and update state from stale run.
- **Fix:** Track run ID, discard stale results.

### Issue #8: DNS Latency Samples Run in Parallel

- **Severity:** Medium
- **Files:** `src/main/networkDiagnostics.js:147-155`
- **Description:** Three lookups via `Promise.all`. First populates cache, others are near-instant.
- **Fix:** Run sequentially with different domains.

### Issue #9: `channelToBand()` Overlapping Ranges

- **Severity:** Medium
- **Files:** `src/main/networkDiagnostics.js:288-295`
- **Description:** 6 GHz branch unreachable for channels 1-14 and 36-177 due to earlier matches.
- **Fix:** Parse band from system tool output instead of inferring from channel.

### Issue #10: `onMenuNavigate` Listener Never Cleaned Up

- **Severity:** Medium
- **Files:** `src/renderer/src/App.jsx:52-55`, `src/preload/index.js:30`
- **Description:** No unsubscribe function returned. Listeners accumulate in StrictMode.
- **Fix:** Return unsubscribe from preload.

### Issue #11: TitleBar `useEffect` Dependency on `api` Object

- **Severity:** Low
- **Files:** `src/renderer/src/components/TitleBar.jsx:8,38`
- **Description:** `window.api || {}` creates new object each render when undefined, causing continuous effect re-runs.
- **Fix:** Remove `api` from deps or use ref.

### Issue #12: Failed Latency (0ms) Scores as Perfect

- **Severity:** Medium
- **Files:** `src/renderer/src/utils/scoring.js:18-19`
- **Description:** `measureLatency` returns `{ latencyMs: 0 }` on all-fail. Scoring gives 100 for 0ms latency.
- **Fix:** Return null for failed measurements. Score null as 0.

### Issue #13: Jitter Score Cliff at 33ms

- **Severity:** Low
- **Files:** `src/renderer/src/utils/scoring.js:24`
- **Description:** `100 - jitterMs * 3` means anything above 33.3ms scores 0. No differentiation.
- **Fix:** Use exponential decay.

### Issue #14: VPN Process Detection False Positives

- **Severity:** Medium
- **Files:** `src/main/networkDiagnostics.js:456-478`
- **Description:** `psOut.includes(name)` with short names like `'ssr'`, `'surge'`, `'clash'` match unrelated processes.
- **Fix:** Use word-boundary regex matching.

### Issue #15: `tcpProbe` Socket Not Destroyed on Error

- **Severity:** Medium
- **Files:** `src/main/networkDiagnostics.js:77-79`
- **Description:** Error handler resolves promise without `sock.destroy()`. Socket may remain open.
- **Fix:** Add `sock.destroy()` in error handler.

### Issue #16: Config YAML Parsed Without Schema Restriction

- **Severity:** Medium
- **Files:** `src/main/configManager.js:61`
- **Description:** `yaml.load(raw)` uses default schema. Safe in js-yaml v4 but fragile.
- **Fix:** Use `yaml.JSON_SCHEMA` explicitly.

### Issue #17: `handleTestComplete` Stale Closure Over Config

- **Severity:** Medium
- **Files:** `src/renderer/src/App.jsx:90-111`
- **Description:** Config changes during test are overwritten when history is appended.
- **Fix:** Use ref for latest config, or only update history field.

### Issue #18: Upload Speed Uses Intended Size, Not Actual

- **Severity:** Medium
- **Files:** `src/renderer/src/hooks/useSpeedTest.js:146-148`
- **Description:** Uses intended `sizeBytes` not actual `e.loaded` for final calculation.
- **Fix:** Use last `e.loaded` from progress event.

### Issue #19: NAT Detection Misreports with Multiple Interfaces

- **Severity:** Medium
- **Files:** `src/renderer/src/utils/natDetect.js:62-66`
- **Description:** Multiple interfaces produce multiple srflx candidates with different ports, falsely interpreted as SYMMETRIC NAT.
- **Fix:** Group candidates by `relatedAddr` before comparing.

### Issue #20: Address Bar Opens Arbitrary URL Schemes

- **Severity:** Medium
- **Files:** `src/renderer/src/App.jsx:170-186`, `src/main/index.js:220-223`
- **Description:** `file://`, `javascript://`, `data://` pass through to `shell.openExternal()`.
- **Fix:** Restrict to `https://` and `http://` only.

### Issue #21: macOS `airport` Command Removed in Sonoma 14.4+

- **Severity:** Medium
- **Files:** `src/main/networkDiagnostics.js:300-303`
- **Description:** Wi-Fi diagnostics silently fail on modern macOS.
- **Fix:** Fallback to `system_profiler SPAirPortDataType -json`.

### Issue #22: Synchronous File I/O in Main Process

- **Severity:** Low
- **Files:** `src/main/configManager.js:50-69`
- **Description:** `readFileSync` blocks main process event loop at startup.
- **Fix:** Use async I/O.

### Issue #23: `DiagnosticsPanel.jsx` Is Dead Code (470 lines)

- **Severity:** Low
- **Files:** `src/renderer/src/components/DiagnosticsPanel.jsx`
- **Description:** Never imported or rendered. Pre-split version of NetworkPanel + PrivacyPanel.
- **Fix:** Delete.

### Issue #24: `deepMerge` Replaces Arrays Entirely

- **Severity:** Low
- **Files:** `src/shared/appConfig.js:76-95`
- **Description:** User `servers: []` produces no servers.
- **Fix:** Document behaviour.

### Issue #25: History `id` Uses `Date.now()` -- Not Unique

- **Severity:** Low
- **Files:** `src/renderer/src/App.jsx:96`
- **Fix:** Use `crypto.randomUUID()`.

### Issue #26: Config `timeout_ms` Never Used by Speed Test

- **Severity:** Medium
- **Files:** `src/renderer/src/hooks/useSpeedTest.js:183-343`
- **Description:** Configurable in UI but never read. Download has no timeout. Upload hardcoded 60s.
- **Fix:** Apply `timeout_ms` to all measurement phases.

### Issue #27: Gateway MAC OUI Fails on Windows (No Zero-Padding)

- **Severity:** Low
- **Files:** `src/main/networkDiagnostics.js:230-244`
- **Description:** Windows `arp -a` outputs single-hex-digit octets. No zero-padding in normalise.
- **Fix:** Zero-pad each octet.

### Issue #28: Download Fallback Reports Fantasy Speed

- **Severity:** Medium
- **Files:** `src/renderer/src/hooks/useSpeedTest.js:71-76`
- **Description:** When `getReader()` is null, hardcoded `elapsed = 0.1`. 25 MB download reports ~2097 Mbps.
- **Fix:** Measure actual elapsed for `blob()` call.

### Issue #29: Unmounted State Updates from Timers

- **Severity:** Low
- **Files:** `src/renderer/src/components/ConfigPanel.jsx:157`, `src/renderer/src/components/HistoryPanel.jsx:54`
- **Description:** `setTimeout` callbacks may fire after unmount.
- **Fix:** Track timer with ref, clear on unmount.

### Issue #30: Upload Abort Signal Listener Never Removed

- **Severity:** Low
- **Files:** `src/renderer/src/hooks/useSpeedTest.js:160-162`
- **Description:** `signal.addEventListener('abort', ...)` keeps XHR reference, preventing GC.
- **Fix:** Use `{ once: true }` option.
