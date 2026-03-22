```
███╗   ██╗███████╗████████╗██████╗  █████╗ ██████╗  █████╗ ██████╗
████╗  ██║██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗
██╔██╗ ██║█████╗     ██║   ██████╔╝███████║██║  ██║███████║██████╔╝
██║╚██╗██║██╔══╝     ██║   ██╔══██╗██╔══██║██║  ██║██╔══██║██╔══██╗
██║ ╚████║███████╗   ██║   ██║  ██║██║  ██║██████╔╝██║  ██║██║  ██║
╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
[ ELEGANT NETWORK SPEED TESTING TOOL ]  ◈  by soizoktantas
```

NetRadar is a cross-platform desktop app for measuring network performance and inspecting local connectivity. It is built with Electron, React, and Vite, and ships with a terminal-inspired UI for speed tests, diagnostics, history, and privacy-related network details.

![NetRadar screenshot](docs/images/NetRadar%20Screenshot.png)

## Features

- Download, upload, latency, and jitter testing
- Built-in server support with configurable custom endpoints
- Local connection diagnostics, DNS inspection, and gateway detection
- History tracking stored in a YAML config file
- Configurable test parameters and UI settings
- English and Chinese localization
- Electron desktop builds for macOS, Windows, and Linux

## Tech Stack

- Electron
- React
- Vite
- `js-yaml`

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Install

```bash
git clone https://github.com/soizoktantas/NetRadar.git
cd NetRadar
npm install
```

### Run in Development

```bash
npm run dev
```

## Build

### Build for the current platform

```bash
npm run build
```

### Platform-specific builds

```bash
npm run build:win
npm run build:mac
npm run build:linux
npm run build:all
```

Build artifacts are generated in `dist/`.

## Configuration

NetRadar stores its runtime configuration in a YAML file.

| Platform | Path                                                 |
| -------- | ---------------------------------------------------- |
| macOS    | `~/Library/Application Support/netradar/config.yaml` |
| Linux    | `~/.config/netradar/config.yaml`                     |
| Windows  | `%APPDATA%\NetRadar\config.yaml`                     |

Example configuration:

```yaml
version: "1.0"
meta:
    author: "soizoktantas"
    repo: "https://github.com/soizoktantas/NetRadar"

app:
    name: "NetRadar"
    titlebar_title: "NetRadar"
    config_backup_prefix: "netradarconfig"

ui:
    view_paths:
        dashboard: "NetRadar/Speed Test"
        network: "NetRadar/Network Diagnostics"
        privacy: "NetRadar/Privacy & Anonymity"
        history: "NetRadar/History"
        config: "NetRadar/Settings"

window:
    width: 1200
    height: 780
    min_width: 960
    min_height: 640
    rounded_corners: false
    auto_hide_menu_bar: true
    background_color: "#050505"

settings:
    theme: "xp-terminal"
    language: "en"
    save_history: true
    history_limit: 100

diagnostics:
    censorship_targets: []

test_settings:
    download_size_mb: 25
    upload_size_mb: 10
    latency_samples: 10
    timeout_ms: 30000

servers:
    - id: "cloudflare"
      name: "Cloudflare"
      location: "Global CDN"
      base_url: "https://speed.cloudflare.com"
      download_path: "/__down"
      upload_path: "/__up"
      latency_path: "/__down?bytes=0"
      enabled: true
      default: true

    - id: "fastly"
      name: "Fastly CDN"
      location: "Global"
      base_url: "https://github.com"
      download_path: null
      upload_path: null
      latency_path: "/"
      enabled: true
      default: false

history: []
```

## Custom Test Servers

Custom servers should expose endpoints compatible with the app's test flow:

- Download endpoint for fetching a known payload
- Upload endpoint for accepting a binary payload
- Latency endpoint for lightweight round-trip checks

## Project Structure

```text
src/
  main/       Electron main-process code
  preload/    Electron preload bridge
  renderer/   React UI
  shared/     Shared config and helpers
```

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.
