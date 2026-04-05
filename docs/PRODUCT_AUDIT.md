# NetRadar Product Audit

**Date:** 2026-04-05
**Scope:** Performance, data accuracy, and usability — no styling/visual changes
**Auditor:** Fabius (Product Design)

---

## 1. Current State Assessment

NetRadar is an Electron + React desktop application with five panels:

| Panel | Purpose | Implementation |
|---|---|---|
| **Dashboard** (Speed Test) | Download/upload speed measurement, latency, jitter, composite scoring | Renderer-side `fetch`/XHR against configurable servers (default: Cloudflare `speed.cloudflare.com`) |
| **Network** | Local IP identity, DNS servers, Wi-Fi info, LAN/gateway details | Main-process diagnostics via `os`, `execSync`, Node `dns` |
| **Privacy** | VPN/proxy/tunnel detection, censorship probing, NAT type | Mix of main-process `execSync` and renderer-side WebRTC STUN |
| **History** | Table of past speed test results with grade/score summary | Stored in the YAML config file alongside all other settings |
| **Settings** | Server management, test parameters, language, censorship target URLs | Full YAML config read/write via IPC |

### Key Architectural Observations

- Speed test runs entirely in the renderer process (browser `fetch` + `XMLHttpRequest`).
- Diagnostics (IP, DNS, Wi-Fi, LAN, system context) run in the main process using synchronous shell commands (`execSync`).
- NAT detection runs in the renderer via WebRTC STUN.
- All persistent state (config + history) lives in a single YAML file.
- Two supported languages: English, Chinese.
- The app ships with two servers: Cloudflare (full test) and Fastly/GitHub (latency only, no download/upload paths).

---

## 2. Performance Issues

### P1. Main-process thread blocking via `execSync`

**File:** `src/main/networkDiagnostics.js` (lines 215, 233, 302, 431, 442, 445, 458, 465, 473)

Every diagnostics function uses `execSync` to shell out to `netstat`, `arp`, `airport`, `scutil`, `ps`, `lsappinfo`, and `tasklist`. These calls block the Electron main process for up to 3-5 seconds each. Because IPC handlers run on the main thread, this means:

- The window becomes unresponsive during diagnostics (no resize, no drag, no minimize).
- Multiple `execSync` calls chain sequentially even within a single function (`getLocalNetworkInfo` calls both `getDefaultGateway` and `getGatewayMac`, each blocking).
- On Windows, `tasklist /fo csv /nh` and `reg query` can be particularly slow.

**Impact:** The app visibly freezes during diagnostics. Users may think it has crashed.

### P2. Download speed measurement uses cumulative average, not windowed sampling

**File:** `src/renderer/src/hooks/useSpeedTest.js`, `measureDownload` (line 95)

```js
const speedMbps = (received * 8) / elapsed / 1e6
```

The live speed calculation divides total bytes received by total elapsed time. This gives a cumulative mean that:

- Responds sluggishly to speed changes (slow-start TCP bias depresses the number).
- Never reflects the current instantaneous speed; instead it always reflects the average since the test began.
- Masks congestion events and bandwidth spikes that occur during the test.

The `samples` array stores these cumulative averages, not true interval samples, so the final speed figure is simply the same cumulative average recomputed at the end.

### P3. Upload test allocates the entire payload synchronously in memory

**File:** `src/renderer/src/hooks/useSpeedTest.js`, `measureUpload` (lines 120-124)

```js
const data = new Uint8Array(sizeBytes)
for (let i = 0; i < sizeBytes; i++) {
  data[i] = (i * 137 + 53) & 0xff
}
```

For a 10 MB upload this allocates 10 MB of memory and fills it with a byte-by-byte loop (10,485,760 iterations). For large upload sizes configured by the user (up to 100 MB per the config panel max), this will:

- Cause a noticeable UI freeze during buffer allocation.
- Consume significant heap memory unnecessarily.

### P4. Latency measurement uses `mode: 'no-cors'`, producing unreliable timing

**File:** `src/renderer/src/hooks/useSpeedTest.js`, `measureLatency` (line 22)

```js
await fetch(`${url}${cacheBust}`, { cache: 'no-store', mode: 'no-cors', signal })
```

With `mode: 'no-cors'`, the response is opaque. The `catch` on line 27 silently swallows errors. This means:

- A non-2xx response (e.g. 403, 502) is indistinguishable from success — the timing still counts.
- The measured latency includes HTTPS handshake overhead on the first request but not subsequent ones (connection reuse), skewing results.
- There is no warm-up request to establish the TCP/TLS connection before timing begins.

### P5. DNS latency measurement fires three lookups in parallel, not sequentially

**File:** `src/main/networkDiagnostics.js`, `getDnsInfo` (lines 151-156)

```js
const samples = await Promise.all([
  measureDnsLatency(), measureDnsLatency(), measureDnsLatency()
])
```

All three DNS lookups run concurrently. After the first resolves, the OS DNS cache serves the remaining two nearly instantly. The "average" therefore measures one real lookup and two cache hits, producing an artificially low and misleading latency figure.

### P6. Config file I/O on every save includes full history serialisation

**Files:** `src/main/configManager.js`, `src/shared/appConfig.js`

History is stored inside the main config YAML. Every `saveConfig` call serialises the entire config including potentially 100+ history entries. After each speed test completes, `handleTestComplete` in `App.jsx` calls `handleSaveConfig` which writes the full config. With 100 entries at ~200 bytes each, this is approximately 20 KB of YAML re-serialised and flushed to disk.

More critically, `normalizeConfig` is called on every save (line 47 of `configManager.js`), re-processing all history entries. This is wasteful and could corrupt history data if normalisation logic changes.

### P7. No AbortController / cancellation support for diagnostics

**File:** `src/renderer/src/hooks/useDiagnostics.js`

The `abortRef` is set but never checked during async operations. The `reset` callback sets `abortRef.current = true` and resets state, but the IPC calls (`diagIpIdentity`, `diagCensorship`, etc.) continue running in the main process and their `.then()` handlers still fire, potentially overwriting the reset state.

### P8. DiagnosticsPanel creates its own `useDiagnostics` instance

**File:** `src/renderer/src/components/DiagnosticsPanel.jsx` (line 399)

`DiagnosticsPanel` calls `useDiagnostics()` independently, while `App.jsx` also calls `useDiagnostics(config)` and passes the result to `NetworkPanel` and `PrivacyPanel`. The `DiagnosticsPanel` component appears to be unused in the current routing, but if ever mounted it would create a duplicate diagnostics instance that does not receive `config` (censorship targets would be empty).

---

## 3. Usability Gaps

### U1. No public IP detection

The "IP Identity" in the Network panel shows only the local machine's hostname, platform, and local interface addresses. There is no external/public IP lookup. For a network diagnostics tool, the public IP is the single most important piece of information. The Privacy panel's `DiagnosticsPanel.jsx` (unused) references `data.ip` with fields like `ip`, `country`, `isp`, `asn` — but the actual `getIpIdentity()` backend function only returns local OS data. These fields are never populated.

### U2. Censorship check passes `null` as the country code

**File:** `src/renderer/src/hooks/useDiagnostics.js` (line 98)

```js
window.api.diagCensorship(null, censorshipTargets)
```

The country code is hardcoded to `null`. Since `checkCensorshipConnectivity` uses this to determine if the user is in a censored region (line 96 of `networkDiagnostics.js`), the `inCensoredRegion` flag is always `false`. This means:

- The censorship detection logic can never identify a "bypassed" state.
- The only detectable state is "all blocked + Cloudflare reachable = GFW detected".
- Users in censored regions who successfully bypass the firewall will see "No censorship detected" instead of "Censorship detected — bypassed".

This is a direct consequence of U1: without a public IP lookup, there is no country code to pass.

### U3. Only one server has download/upload capability

**File:** `src/shared/appConfig.js` (lines 46-68)

The default Fastly server has `download_path: null` and `upload_path: null`. If a user selects it as default, the speed test silently skips download and upload, reporting 0 Mbps for both. The only feedback is a warning log entry in the terminal. The user receives a meaningless score based on latency alone, with no clear indication that the test was incomplete.

### U4. No data export or sharing

There is no way to export test results. Users cannot:

- Copy results to clipboard.
- Export history as CSV/JSON.
- Share a result (even as text).
- Generate a screenshot or report.

For a speed test tool, shareability is a core use case ("look at my speed" or "here's proof of poor performance for my ISP").

### U5. No individual history entry deletion

**File:** `src/renderer/src/components/HistoryPanel.jsx`

The only history management operation is "Clear All". Users cannot delete individual bad/test runs, making the history and its statistics (average score, best grade) unreliable.

### U6. Speed gauge max values are hardcoded

**File:** `src/renderer/src/components/Dashboard.jsx` (lines 90-91)

```jsx
<SpeedGauge value={liveDownload} maxValue={1000} unit="Mbps" label={...} />
<SpeedGauge value={liveUpload}   maxValue={500}  unit="Mbps" label={...} />
```

The download gauge maxes at 1000 Mbps and the upload gauge at 500 Mbps. For users with connections under 50 Mbps (the global majority), the gauge needle barely moves. There is no auto-scaling. Conversely, users with multi-gigabit connections will always see a full gauge with no differentiation.

### U7. No test-in-progress protection

There is no guard against navigating away from the Dashboard while a speed test is running. The test continues in the background (`useSpeedTest` is mounted at the `App` level), but the user loses visual feedback. Worse, there is no warning when closing the app during a test.

### U8. `webSecurity: false` in production

**File:** `src/main/index.js` (line 199)

```js
webSecurity: false
```

This disables the same-origin policy for all requests. While this is likely needed for the cross-origin speed test fetches, it is a significant security risk in production. It means any renderer-side code can make arbitrary requests to any origin, including local network resources.

### U9. No error detail propagation from diagnostics

When a diagnostic IPC call fails, the error handler in `useDiagnostics.js` stores only `e?.message || 'error'`. All diagnostic card components display a generic "Error" string with no detail. The user has no way to know whether the failure was a timeout, a permission denial, a missing binary (`airport` on newer macOS), or a network error.

### U10. `onMenuNavigate` listener is never cleaned up

**File:** `src/renderer/src/App.jsx` (lines 53-55)

```js
api.onMenuNavigate((_, view) => setCurrentView(view))
```

This adds an `ipcRenderer.on` listener in a `useEffect` with no cleanup return. In development with React Strict Mode (double-mount), this will register two listeners. More importantly, the preload `onMenuNavigate` function does not return an unsubscribe handle, so there is no way to clean it up.

### U11. History timestamps use client clock only

History entries record `new Date().toISOString()` from the renderer. There is no server-side timestamp or NTP verification. If the user's clock is wrong, all history data is timestamped incorrectly. This is a minor issue but relevant when comparing results over time.

### U12. No connection pre-check before speed test

The speed test immediately begins the latency phase. If the network is down or the server is unreachable, the user waits through multiple timeout cycles before seeing an error. A fast pre-flight check (single HEAD request with a short timeout) would provide instant feedback.

### U13. The `airport` command is deprecated/removed on newer macOS

**File:** `src/main/networkDiagnostics.js` (lines 301-302)

The `airport` CLI tool used for Wi-Fi info on macOS has been deprecated since macOS Sonoma and is removed in some configurations. When it is missing, `getWifiInfo` silently returns `null`, and the Wi-Fi card shows "Connected via Ethernet" even when the user is on Wi-Fi. There is no fallback to `system_profiler SPAirPortDataType` or CoreWLAN.

### U14. Diagnostics data goes stale without indication

After running diagnostics, the results persist on screen indefinitely with no timestamp or staleness indicator. A user who ran diagnostics an hour ago still sees the old data with no visual cue that it may be outdated. Network conditions (IP, Wi-Fi signal, proxy state) change frequently.

### U15. Reputation/anonymity data sources are not connected

The `DiagnosticsPanel.jsx` (the full version) references `data.reputation` and `data.ip` with fields like `isProxy`, `isHosting`, `isVpn`, `isTor`, `riskScore`, `provider`, `country`, `isp`, `asn`, `org`. None of these are populated by any backend function. The `getIpIdentity()` function returns only local OS data. There is no external API call to ip-api.com, proxycheck.io, or any geolocation service.

The `PrivacyPanel.jsx` works around this by deriving anonymity status from `sysContext` (local process detection), but the `DiagnosticsPanel.jsx` expects richer data that does not exist.

---

## 4. Prioritised Recommendations

### Rank 1: Replace `execSync` with `execFile` (async) in all diagnostics

| | |
|---|---|
| **What** | Replace every `execSync` call in `networkDiagnostics.js` with `child_process.execFile` (promisified) or `exec` with `util.promisify`. |
| **Why** | Main-process blocking causes the entire app window to freeze during diagnostics. This is the most user-visible performance issue. |
| **Complexity** | **S** |
| **Files** | `src/main/networkDiagnostics.js` |

### Rank 2: Add public IP + geolocation lookup

| | |
|---|---|
| **What** | Add a new IPC handler that fetches the user's public IP and geolocation (country code, ISP, ASN, city) from a free API (e.g. `https://ipapi.co/json/`, `https://ip-api.com/json/`, or Cloudflare's `https://cloudflare.com/cdn-cgi/trace`). Pass the country code to the censorship check. |
| **Why** | Without a public IP, the IP Identity card is near-useless, the censorship bypass detection is broken (U2), and the reputation card in `DiagnosticsPanel` has no data to display. This is the single biggest functional gap. |
| **Complexity** | **M** |
| **Files** | `src/main/networkDiagnostics.js`, `src/main/index.js`, `src/preload/index.js`, `src/renderer/src/hooks/useDiagnostics.js`, `src/renderer/src/components/NetworkPanel.jsx`, `src/renderer/src/components/PrivacyPanel.jsx` |

### Rank 3: Fix download speed measurement to use windowed sampling

| | |
|---|---|
| **What** | Replace the cumulative-average speed calculation in `measureDownload` with an interval-based approach: track bytes received in the last N milliseconds (e.g. 1-second sliding window) to compute instantaneous speed. Use the median of the last 75% of interval samples as the final reported speed (discarding slow-start). |
| **Why** | The current cumulative average systematically under-reports speed on fast connections (TCP slow start depresses the early average) and is unresponsive to real-time speed changes. This is the core value proposition of the app. |
| **Complexity** | **M** |
| **Files** | `src/renderer/src/hooks/useSpeedTest.js` |

### Rank 4: Fix DNS latency measurement to run sequentially

| | |
|---|---|
| **What** | Change the three `measureDnsLatency()` calls from `Promise.all` to sequential execution, using a different domain for each (e.g. `cloudflare.com`, `google.com`, `example.com`) to defeat DNS caching. |
| **Why** | Current parallel execution measures one real lookup and two cache hits, producing artificially low DNS latency. |
| **Complexity** | **S** |
| **Files** | `src/main/networkDiagnostics.js` |

### Rank 5: Add connection pre-check before speed test

| | |
|---|---|
| **What** | Before entering the latency phase, perform a single `HEAD` request to the server's base URL with a 3-second timeout. If it fails, immediately report a clear error instead of entering the full test flow. |
| **Why** | Currently, a disconnected user waits through 10 latency samples (each with network timeout) before seeing anything useful. |
| **Complexity** | **S** |
| **Files** | `src/renderer/src/hooks/useSpeedTest.js` |

### Rank 6: Add a latency warm-up request

| | |
|---|---|
| **What** | Before timing begins in `measureLatency`, fire one untimed request to establish the TCP+TLS connection. Then start the timed samples. |
| **Why** | The first sample includes TLS handshake time (~50-200 ms extra), which inflates the average and is not representative of connection latency. Even with 10% trimming, this first sample biases the result. |
| **Complexity** | **S** |
| **Files** | `src/renderer/src/hooks/useSpeedTest.js` |

### Rank 7: Warn when server lacks download/upload paths

| | |
|---|---|
| **What** | Before starting the test, check if the selected server has `download_path` and `upload_path`. If either is null, show a clear warning to the user (not just a terminal log line) explaining that the test will be incomplete, and offer to switch to a capable server. |
| **Why** | Users who select Fastly as their default get a silent 0 Mbps result with no explanation visible outside the terminal log. |
| **Complexity** | **S** |
| **Files** | `src/renderer/src/App.jsx`, `src/renderer/src/components/Dashboard.jsx` |

### Rank 8: Auto-scale speed gauge maximum

| | |
|---|---|
| **What** | Instead of hardcoding `maxValue={1000}` and `maxValue={500}`, dynamically set the gauge maximum based on the current/final measured speed. Use a set of breakpoints (e.g. 10, 50, 100, 250, 500, 1000, 2500 Mbps) and snap to the nearest higher breakpoint. |
| **Why** | Most users see a nearly empty gauge because their connection is far below the 1 Gbps maximum. The gauge becomes uninformative visual noise. |
| **Complexity** | **S** |
| **Files** | `src/renderer/src/components/Dashboard.jsx`, `src/renderer/src/components/SpeedGauge.jsx` |

### Rank 9: Separate history storage from config

| | |
|---|---|
| **What** | Move history into a separate file (e.g. `history.json` alongside `config.yaml`). Add dedicated IPC handlers for `append-history`, `get-history`, `clear-history`, `delete-history-entry`. |
| **Why** | Currently every test completion re-serialises the entire config file including all history. Separating them eliminates redundant config re-writes, reduces I/O, enables individual entry deletion (U5), and reduces risk of config corruption from history mutations. |
| **Complexity** | **M** |
| **Files** | `src/main/configManager.js` (or new `historyManager.js`), `src/main/index.js`, `src/preload/index.js`, `src/renderer/src/App.jsx`, `src/renderer/src/components/HistoryPanel.jsx` |

### Rank 10: Add result export (clipboard copy + CSV export)

| | |
|---|---|
| **What** | Add a "Copy Results" button to the Dashboard (after test completion) that copies a formatted text summary to the clipboard. Add an "Export CSV" button to the History panel that downloads all history as a CSV file. |
| **Why** | Speed test results are commonly shared (ISP complaints, team diagnostics, social). Currently there is no way to extract data from the app. |
| **Complexity** | **S** |
| **Files** | `src/renderer/src/components/Dashboard.jsx`, `src/renderer/src/components/HistoryPanel.jsx` |

### Rank 11: Fix upload buffer allocation

| | |
|---|---|
| **What** | Replace the byte-by-byte `Uint8Array` fill with `crypto.getRandomValues` on 64 KB chunks, or simply use a pre-allocated buffer filled with `TypedArray.fill()`. For large uploads, consider streaming from a `ReadableStream` instead of allocating the full buffer. |
| **Why** | The current `for` loop over millions of bytes causes a measurable UI jank before upload begins. |
| **Complexity** | **S** |
| **Files** | `src/renderer/src/hooks/useSpeedTest.js` |

### Rank 12: Add macOS Wi-Fi fallback for missing `airport` binary

| | |
|---|---|
| **What** | When the `airport -I` command fails (binary not found), fall back to `system_profiler SPAirPortDataType -json` to retrieve Wi-Fi information. |
| **Why** | The `airport` binary is deprecated/removed on newer macOS versions. Users on macOS Sonoma+ get no Wi-Fi data with no error message. |
| **Complexity** | **S** |
| **Files** | `src/main/networkDiagnostics.js` |

### Rank 13: Fix `webSecurity: false` in production

| | |
|---|---|
| **What** | Remove `webSecurity: false` from the `BrowserWindow` config. Instead, configure a proper CSP header or use Electron's `session.webRequest` to selectively allow cross-origin requests to speed test servers. |
| **Why** | Disabling web security in production exposes the app to XSS and SSRF risks. Any compromised renderer code can access local network resources, file:// URLs, and sensitive APIs. |
| **Complexity** | **M** |
| **Files** | `src/main/index.js` |

### Rank 14: Add diagnostics staleness indicator

| | |
|---|---|
| **What** | After diagnostics complete, display a "Last run: X minutes ago" timestamp. After 5+ minutes, show a visual cue suggesting the user re-run. |
| **Why** | Network state changes frequently. Stale diagnostics data with no indication of age can mislead users. |
| **Complexity** | **S** |
| **Files** | `src/renderer/src/hooks/useDiagnostics.js`, `src/renderer/src/components/DiagnosticsShared.jsx` |

### Rank 15: Fix `onMenuNavigate` listener leak

| | |
|---|---|
| **What** | Update `preload/index.js` to return an unsubscribe function from `onMenuNavigate` (matching the pattern used by `onWindowStateChange`). Update `App.jsx` to call it in the `useEffect` cleanup. |
| **Why** | Currently the listener accumulates on every React strict-mode remount (dev) and is never removed. |
| **Complexity** | **S** |
| **Files** | `src/preload/index.js`, `src/renderer/src/App.jsx` |

### Rank 16: Add individual history entry deletion

| | |
|---|---|
| **What** | Add a delete button/action per row in the history table. |
| **Why** | Users cannot remove outlier or test entries, which pollute their statistics. |
| **Complexity** | **S** |
| **Files** | `src/renderer/src/components/HistoryPanel.jsx`, `src/renderer/src/App.jsx` |

---

## Appendix: Issue Cross-Reference

| Issue ID | Category | Rank | Severity |
|---|---|---|---|
| P1 | Performance | 1 | High |
| U1, U2, U15 | Usability | 2 | High |
| P2 | Performance | 3 | High |
| P5 | Performance | 4 | Medium |
| U12 | Usability | 5 | Medium |
| P4 | Performance | 6 | Medium |
| U3 | Usability | 7 | Medium |
| U6 | Usability | 8 | Medium |
| P6 | Performance | 9 | Medium |
| U4 | Usability | 10 | Medium |
| P3 | Performance | 11 | Low |
| U13 | Usability | 12 | Low |
| U8 | Usability | 13 | Medium |
| U14 | Usability | 14 | Low |
| U10 | Usability | 15 | Low |
| U5 | Usability | 16 | Low |
