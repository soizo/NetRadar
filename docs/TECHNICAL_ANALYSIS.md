# NetRadar -- Technical Analysis

> Generated 2026-04-05. Based on commit `2e3ea58` (master).

---

## 1. Speed Test Implementation

### Measurement Methodology

The speed test runs entirely in the **renderer process** via `useSpeedTest` (`src/renderer/src/hooks/useSpeedTest.js`). Four sequential phases: latency, download, upload, scoring.

**Latency** (lines 12-52): Sends N sequential HTTP requests (default 10) to the server's `latency_path` using `fetch()` with `mode: 'no-cors'` and `cache: 'no-store'`. 100 ms sleep between samples. Top/bottom 10% trimmed, then mean and standard deviation computed. Jitter = standard deviation (not ITU-T mean-of-absolute-differences).

**Download** (lines 54-110): Single `fetch()` GET to `{base_url}{download_path}?bytes={sizeBytes}`. Reads via `ReadableStream.getReader()`. Samples cumulative throughput every 200 ms. Final speed = total bytes / total time.

**Upload** (lines 112-166): Generates pseudo-random `Uint8Array` synchronously in renderer, sends via `XMLHttpRequest` POST (XHR used for upload progress events which `fetch` lacks).

**Scoring** (lines 294-328): `calculateNetworkScore()` in `scoring.js`. Weighted composite: download 35% (log scale), latency 30% (exponential decay), upload 20% (log scale), jitter 15% (linear penalty).

### Servers

| ID | Name | Base URL | Download | Upload | Latency |
|---|---|---|---|---|---|
| `cloudflare` | Cloudflare | `https://speed.cloudflare.com` | `/__down` | `/__up` | `/__down?bytes=0` |
| `fastly` | Fastly CDN | `https://github.com` | `null` | `null` | `/` |

Only Cloudflare supports download/upload. Fastly is latency-only.

### Flaws

1. **Single-connection throughput**: One HTTP stream cannot saturate high-bandwidth, high-latency links (TCP window scaling limits).
2. **Cumulative speed includes TCP slow-start ramp-up**. No sliding window or warm-up discard.
3. **Upload data generation blocks renderer** (`useSpeedTest.js:121-123`): Synchronous loop over `sizeBytes` bytes. 10 MB = ~10M iterations freezes UI 50-200 ms. 100 MB = seconds.
4. **`no-cors` latency** (`useSpeedTest.js:22`): Opaque responses. First sample includes DNS+TLS. Trimming only removes 10%.
5. **`timeout_ms` config is never used**: Upload has hardcoded 60s timeout. Download has none.
6. **Progress % based on requested size, not content-length** (`useSpeedTest.js:102`).
7. **Fallback download path broken** (`useSpeedTest.js:71-75`): Hardcoded `elapsed = 0.1`.
8. **`webSecurity: false`** (`main/index.js:199`): Required for cross-origin fetch but broadens attack surface.

---

## 2. Network Diagnostics

### Diagnostics Performed

| Diagnostic | Process | Method |
|---|---|---|
| IP Identity | Main | `os.networkInterfaces()`, `os.hostname()` -- local only |
| Censorship | Main | TCP probes to 5 sites on port 443 |
| DNS Info | Main | `dns.getServers()` + 3x `dns.resolve4('cloudflare.com')` |
| Local Network | Main | `netstat -rn` + `arp -a` + OUI lookup |
| Wi-Fi | Main | macOS `airport -I`, Windows `netsh`, Linux `nmcli` |
| System Context | Main | Tunnel ifaces + proxy settings + VPN process scan |
| NAT Detection | Renderer | WebRTC STUN with 2 servers |

### Data Flow

Renderer -> preload `ipcRenderer.invoke` -> main handler -> `networkDiagnostics.js` function -> IPC return -> `useDiagnostics` hook state update.

Two phases: Phase 1 (parallel, local): IP, sysContext, localNet, wifi. Phase 2 (parallel, network): censorship, DNS, NAT.

### Issues

1. **Country code always `null`** (`useDiagnostics.js:98`): No public IP lookup means `inCensoredRegion` is always false. "GFW detected + bypassed" path is dead code.
2. **DNS latency samples run in parallel** (`networkDiagnostics.js:151-155`): Cache effects mean 2nd/3rd samples understate real latency.
3. **macOS `airport` deprecated**: Removed in macOS 15+. Silent null return.
4. **`execSync` blocks main process**: All shell commands. Hang = app freeze.
5. **`abortRef` doesn't cancel IPC** (`useDiagnostics.js:117-123`): Reset sets flag but in-flight calls continue and update state.

---

## 3. State Management

Single `App` component owns all state. No external state library.

- **Config**: Loaded on mount via IPC, stored in `useState`. Passed as props to all panels.
- **Speed test**: `useSpeedTest()` hook in App. `{status, progress, results, logs}` passed to Dashboard.
- **Diagnostics**: `useDiagnostics(config)` hook in App. Shared between NetworkPanel and PrivacyPanel.

### Re-render Patterns

1. **Every progress update (200 ms) re-renders entire App tree**: No `React.memo` or `useMemo` anywhere.
2. **`VIEW_META`, `STATUS_COPY`, `DIAG_COPY` recreated every render** (`App.jsx:137-160`).
3. **`TerminalLog` gets new array ref on every log append** (`useSpeedTest.js:177`).
4. **Views unmount on navigation**: Components remount when returning. Diagnostics hook state persists in App but component-level state is lost.

---

## 4. IPC Architecture

### Channels

**invoke/handle**: `get-config`, `save-config`, `reset-config`, `get-config-path`, `reveal-config-path`, `get-app-info`, `get-window-state`, `diag-ip-identity`, `diag-censorship`, `diag-dns`, `diag-local-network`, `diag-wifi`, `diag-sys-context`

**fire-and-forget (on)**: `window-minimize`, `window-maximize`, `window-close`, `window-set-position`

**main->renderer (send)**: `window-state-changed`, `menu-navigate`

### Gaps

1. **No IPC for speed test**: Runs entirely in renderer. Requires `webSecurity: false`.
2. **`onMenuNavigate` listener never cleaned up** (`App.jsx:53-55`). No unsubscribe returned from preload.
3. **Window state events fire on every pixel** of move/resize. No throttling.

---

## 5. Configuration System

YAML file at `{appData}/netradar/config.yaml` (macOS/Linux) or `{appData}/NetRadar/config.yaml` (Windows). Sync read/write via `js-yaml`.

`normalizeConfig()` deep-merges with defaults and validates fields.

### Issues

1. **History inside config file**: Every test rewrites entire YAML. Up to 1000 entries.
2. **No atomic writes**: Direct `writeFileSync`. Crash mid-write = corruption.
3. **`deepMerge` array handling**: Spreads defaults then overwrites by index from overrides.
4. **Config version (`'1.0'`) vs app version (`1.1.0`)**: `appVersion` prop passes config version, not app version.
5. **Language: immediate i18n change vs deferred config save**: Navigate away without saving = localStorage has new lang, config has old. Next launch reverts.

---

## 6. Specific Code Issues

### Bugs

| # | Location | Severity | Description |
|---|---|---|---|
| B1 | `useSpeedTest.js:121-123` | Medium | Sync upload data gen blocks renderer. 10M iterations for 10 MB. |
| B2 | `useDiagnostics.js:98` | High | Country code always null. Censored-region detection is dead code. |
| B3 | `useSpeedTest.js:71-75` | Medium | Fallback download: hardcoded 0.1s elapsed. |
| B4 | `App.jsx:53-55` | Low | `onMenuNavigate` listener leak (no cleanup). |
| B5 | `useSpeedTest.js:234` | Low | Progress log condition `Math.floor(percent % 25) === 0` fires on nearly every callback (floats). |
| B6 | `DiagnosticsPanel.jsx` | Low | Dead code. Never imported. References nonexistent `reputation` field. |
| B7 | `TitleBar.jsx:38` | Low | `api` in useEffect deps is `window.api || {}` -- new object each render when falsy. |
| B8 | `networkDiagnostics.js:293` | Medium | `channelToBand()` 6 GHz range (`1-233`) overlaps 2.4 GHz (`1-14`). Works by accident. |
| B9 | `HistoryPanel.jsx:19` | Low | Date format hardcoded for en-US/zh-CN only. |

### Performance

| # | Location | Severity | Description |
|---|---|---|---|
| P1 | `App.jsx` | Medium | No memo/useMemo. Every 200ms progress update re-renders entire tree. |
| P2 | `main/index.js:211-218` | Low | Window move/resize events fire IPC per pixel. |
| P3 | `networkDiagnostics.js:214-228` | Low | `execSync('netstat -rn')` blocks main process. |
| P4 | `useSpeedTest.js:177` | Low | `addLog` copies entire array on every call. |

### Security

| # | Location | Severity | Description |
|---|---|---|---|
| S1 | `main/index.js:199` | Medium | `webSecurity: false` disables all CORS. |
| S2 | `main/index.js:198` | Low | `sandbox: false`. |
| S3 | `preload/index.js:30` | Low | `onMenuNavigate` leaks IpcRendererEvent to renderer context. |

### Correctness

| # | Location | Severity | Description |
|---|---|---|---|
| C1 | `scoring.js:18` | Low | Negative latency (edge case) scores 0 instead of being clamped. |
| C2 | `scoring.js:24` | Low | Jitter penalty cliff at 33.3 ms (10->0 in 4 ms). |
| C3 | `natDetect.js:66` | Medium | Multiple interfaces cause false symmetric NAT detection. |
| C4 | `networkDiagnostics.js:168` | Low | `customDns` variable computed but unused (dead code). |
| C5 | `App.jsx:168` | Low | `VIEW_PATHS` in useEffect deps is unstable reference. Runs every render. |
| C6 | `useSpeedTest.js:96` | Low | Binary MB (1024*1024) for size but decimal Mbps (1e6) for speed. |

### Architecture

| # | Description |
|---|---|
| A1 | No React error boundaries. Render crash = white screen. |
| A2 | Speed test in renderer requires `webSecurity: false`. Moving to main process would improve accuracy and security. |
| A3 | Shared diagnostics hook: NetworkPanel and PrivacyPanel always run all diagnostics together. |
| A4 | Config file doubles as data store (history). No separate persistence layer. |
| A5 | i18n inline in single 815-line file. No code splitting, no separate language files. |
| A6 | `DiagnosticsPanel.jsx` is orphaned dead code duplicating NetworkPanel/PrivacyPanel components. |
