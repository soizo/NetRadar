```
 ███╗   ██╗███████╗████████╗██████╗  █████╗ ██████╗  █████╗ ██████╗
 ████╗  ██║██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗
 ██╔██╗ ██║█████╗     ██║   ██████╔╝███████║██║  ██║███████║██████╔╝
 ██║╚██╗██║██╔══╝     ██║   ██╔══██╗██╔══██║██║  ██║██╔══██║██╔══██╗
 ██║ ╚████║███████╗   ██║   ██║  ██║██║  ██║██████╔╝██║  ██║██║  ██║
 ╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝

 [ ELEGANT NETWORK SPEED TESTING TOOL ]  ◈  by soizoktantas
 ┌─────────────────────────────────────────────────────────────┐
 │  https://github.com/soizoktantas/NetRadar                   │
 └─────────────────────────────────────────────────────────────┘
```

# NetRadar

> Elegant network speed testing with a hacker terminal aesthetic.

NetRadar is a cross-platform desktop application built with Electron, React, and Vite. It features a beautiful Windows XP terminal / hacker-inspired UI with phosphor green on black, CRT scanlines, and ASCII-style borders. Test your network speed with precision and style.

---

## Features

- **Real Speed Testing** — Download, upload, and latency measurements via live streaming fetch
- **Hacker Aesthetic UI** — Phosphor green terminal look with CRT scanlines and glow effects
- **Circular SVG Gauges** — Animated 270-degree arc speed gauges for download and upload
- **Scoring Algorithm** — Logarithmic/exponential scoring with S+, S, A+, A, B+, B, C, D, F grades
- **Live Terminal Log** — Real-time log output during tests with color-coded entries
- **Test History** — Persistent history stored in your config YAML file
- **Custom Servers** — Add and manage your own speed test servers
- **Multiple Servers** — Cloudflare and Fastly CDN included by default
- **YAML Config** — Human-readable configuration file with full customization
- **Frameless Window** — Custom title bar with native minimize/maximize/close controls
- **Cross-Platform** — Windows (x64/ia32), macOS (Intel + Apple Silicon), Linux (x64/arm64)

---

## Screenshots

```
┌──────────────────────────────────────────────────────────────┐
│ ◈ NetRadar v1.0.0                          [─] [□] [×]      │
├──────────────────────────────────────────────────────────────┤
│ [⬡ DASHBOARD]  [◈ HISTORY]  [⚙ CONFIG]                      │
├────────────────────────────────┬─────────────────────────────┤
│  ╔═ DOWNLOAD ═╗  ╔= UPLOAD =╗  │  ◈ METRICS                  │
│  ║  [gauge]   ║  ║ [gauge]  ║  │  LATENCY:    12.4 ms        │
│  ║  247.3 Mbps║  ║ 94.1Mbps ║  │  JITTER:      2.1 ms        │
│  ╚════════════╝  ╚══════════╝  │  MIN:         9.8 ms        │
│                                │  MAX:        18.2 ms        │
├────────────────────────────────┴─────────────────────────────┤
│  ◈ SCORE: 87/100  [A+]  EXCELLENT                            │
│  ▸ DOWNLOAD  ████████████████░░░░  85                        │
│  ▸ UPLOAD    ████████████░░░░░░░░  72                        │
│  ▸ LATENCY   ████████████████████  98                        │
│  ▸ JITTER    ████████████████████  94                        │
├──────────────────────────────────────────────────────────────┤
│  ◈ TERMINAL LOG                                              │
│  [14:23:01] > Initializing speed test...                     │
│  [14:23:02] > Testing latency to Cloudflare...               │
│  [14:23:03] > Latency: 12.4ms | Jitter: 2.1ms               │
│  [14:23:04] > Download: 247.3 Mbps ▓▓▓▓▓▓▓▓░░              │
│  [14:23:07] > Upload: 94.1 Mbps ▓▓▓▓░░░░                   │
│  [14:23:10] > Score: 87/100 [A+] EXCELLENT  _               │
└──────────────────────────────────────────────────────────────┘
```

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm v9 or later

### Clone and Install

```bash
git clone https://github.com/soizoktantas/NetRadar.git
cd NetRadar
npm install
```

### Run in Development Mode

```bash
npm run dev
```

This starts the Electron app with hot-reload via Vite.

---

## Building

### Build for Current Platform

```bash
npm run build
```

### Platform-Specific Builds

```bash
# Windows (NSIS installer + portable)
npm run build:win

# macOS (DMG + ZIP for Intel and Apple Silicon)
npm run build:mac

# Linux (AppImage + .deb)
npm run build:linux

# All platforms
npm run build:all
```

Build outputs are placed in the `dist/` directory.

### macOS Code Signing

For distribution, set these environment variables before building:

```bash
export CSC_LINK="path/to/cert.p12"
export CSC_KEY_PASSWORD="your-password"
export APPLE_ID="your@apple.id"
export APPLE_APP_SPECIFIC_PASSWORD="app-specific-password"
```

---

## Configuration

NetRadar stores its configuration in a YAML file:

| Platform | Config Path |
|----------|-------------|
| macOS/Linux | `~/.config/netradar/config.yaml` |
| Windows | `%APPDATA%\NetRadar\config.yaml` |

### Full Config Reference

```yaml
version: '1.0'
meta:
  author: soizoktantas
  repo: 'https://github.com/soizoktantas/NetRadar'

settings:
  theme: xp-terminal        # UI theme (only xp-terminal currently)
  save_history: true        # Save test results to history
  history_limit: 100        # Maximum history entries to keep

test_settings:
  download_size_mb: 25      # Download test payload size (MB)
  upload_size_mb: 10        # Upload test payload size (MB)
  latency_samples: 10       # Number of latency ping samples
  timeout_ms: 30000         # Per-request timeout (ms)

servers:
  - id: cloudflare
    name: Cloudflare
    location: Global CDN
    base_url: 'https://speed.cloudflare.com'
    download_path: '/__down'
    upload_path: '/__up'
    latency_path: '/__down?bytes=0'
    enabled: true
    default: true

  # Add custom servers here:
  - id: my-server
    name: My Custom Server
    location: Home Lab
    base_url: 'https://my.speedtest.server'
    download_path: '/download'
    upload_path: '/upload'
    latency_path: '/ping'
    enabled: true
    default: false

history: []   # Auto-populated by the app
```

### Custom Servers

Custom speed test servers must support:
- **Download**: `GET /path?bytes=N` — Returns N bytes of data
- **Upload**: `POST /path` — Accepts binary payload
- **Latency**: `GET /ping` — Responds quickly (used for RTT measurement)

Compatible servers: [Cloudflare Speed Test](https://speed.cloudflare.com), [LibreSpeed](https://librespeed.org/), custom nginx with appropriate endpoints.

---

## Scoring Algorithm

NetRadar uses a logarithmic/exponential scoring system:

| Component | Weight | Algorithm |
|-----------|--------|-----------|
| Download | 35% | Logarithmic: `20 + log10(speed+1) / log10(1001) * 80` |
| Upload | 20% | Logarithmic: `20 + log10(speed+1) / log10(501) * 80` |
| Latency | 30% | Exponential decay: `100 * 0.995^latencyMs` |
| Jitter | 15% | Linear penalty: `100 - jitter * 3` |

### Grade Scale

| Score | Grade | Rating |
|-------|-------|--------|
| 95-100 | S+ | OUTSTANDING |
| 90-94 | S | OUTSTANDING |
| 85-89 | A+ | EXCELLENT |
| 80-84 | A | EXCELLENT |
| 75-79 | B+ | GOOD |
| 70-74 | B | GOOD |
| 60-69 | C | FAIR |
| 50-59 | D | POOR |
| 0-49 | F | CRITICAL |

---

## Tech Stack

- **Electron** v29 — Desktop runtime
- **React** v18 — UI framework
- **Vite** v5 / **electron-vite** v2 — Build tooling
- **js-yaml** v4 — Config file parsing
- **Google Fonts** — VT323 (display) + Share Tech Mono (data)

---

## Project Structure

```
NetRadar/
├── src/
│   ├── main/
│   │   ├── index.js          # Electron main process
│   │   └── configManager.js  # YAML config read/write
│   ├── preload/
│   │   └── index.js          # Context bridge (IPC)
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.jsx
│           ├── App.jsx
│           ├── components/
│           │   ├── TitleBar.jsx
│           │   ├── Navbar.jsx
│           │   ├── Dashboard.jsx
│           │   ├── SpeedGauge.jsx
│           │   ├── StatsGrid.jsx
│           │   ├── ScoreBoard.jsx
│           │   ├── TerminalLog.jsx
│           │   ├── HistoryPanel.jsx
│           │   └── ConfigPanel.jsx
│           ├── hooks/
│           │   └── useSpeedTest.js
│           ├── utils/
│           │   └── scoring.js
│           └── styles/
│               └── global.css
├── resources/                # App icons (add your own)
├── package.json
├── electron.vite.config.mjs
├── electron-builder.yml
├── LICENSE
└── README.md
```

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

All contributions must maintain the attribution requirements defined in the LICENSE.

---

## License

This project is licensed under the **NetRadar Open Source License v1.0**.

Key points:
- Free to use, modify, and distribute (including commercially)
- **Must** include attribution to `soizoktantas` and `NetRadar`
- **Must** link to https://github.com/soizoktantas/NetRadar
- **Cannot** remove UI credits or attribution
- No warranty provided

See [LICENSE](LICENSE) for the full text.

---

## Attribution

This software was created by **soizoktantas**.

If you use, modify, or distribute NetRadar, you must include:

```
Powered by NetRadar — by soizoktantas
https://github.com/soizoktantas/NetRadar
```

---

<div align="center">

**◈ NetRadar** — Made with phosphor green and determination.

[soizoktantas](https://github.com/soizoktantas) · [NetRadar](https://github.com/soizoktantas/NetRadar)

</div>
