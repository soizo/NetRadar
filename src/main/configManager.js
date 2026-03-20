import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import yaml from 'js-yaml'

const DEFAULT_CONFIG = {
  version: '1.0',
  meta: {
    author: 'soizoktantas',
    repo: 'https://github.com/soizoktantas/NetRadar'
  },
  settings: {
    theme: 'xp-terminal',
    save_history: true,
    history_limit: 100
  },
  test_settings: {
    download_size_mb: 25,
    upload_size_mb: 10,
    latency_samples: 10,
    timeout_ms: 30000
  },
  servers: [
    {
      id: 'cloudflare',
      name: 'Cloudflare',
      location: 'Global CDN',
      base_url: 'https://speed.cloudflare.com',
      download_path: '/__down',
      upload_path: '/__up',
      latency_path: '/__down?bytes=0',
      enabled: true,
      default: true
    },
    {
      id: 'fastly',
      name: 'Fastly CDN',
      location: 'Global',
      base_url: 'https://github.com',
      download_path: null,
      upload_path: null,
      latency_path: '/',
      enabled: true,
      default: false
    }
  ],
  history: []
}

export function getConfigPath() {
  const appDataPath = app.getPath('appData')
  if (process.platform === 'win32') {
    return join(appDataPath, 'NetRadar', 'config.yaml')
  } else {
    return join(appDataPath, 'netradar', 'config.yaml')
  }
}

function deepMerge(defaults, overrides) {
  const result = { ...defaults }
  for (const key of Object.keys(overrides)) {
    if (
      overrides[key] !== null &&
      typeof overrides[key] === 'object' &&
      !Array.isArray(overrides[key]) &&
      typeof defaults[key] === 'object' &&
      !Array.isArray(defaults[key])
    ) {
      result[key] = deepMerge(defaults[key], overrides[key])
    } else {
      result[key] = overrides[key]
    }
  }
  return result
}

export function getConfig() {
  const configPath = getConfigPath()
  const configDir = join(configPath, '..')

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }

  if (!existsSync(configPath)) {
    const yamlContent = yaml.dump(DEFAULT_CONFIG, { lineWidth: 120, quotingType: '"' })
    writeFileSync(configPath, yamlContent, 'utf8')
    return { ...DEFAULT_CONFIG }
  }

  try {
    const raw = readFileSync(configPath, 'utf8')
    const parsed = yaml.load(raw)
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_CONFIG }
    }
    const merged = deepMerge(DEFAULT_CONFIG, parsed)
    if (!Array.isArray(merged.history)) {
      merged.history = []
    }
    if (!Array.isArray(merged.servers)) {
      merged.servers = DEFAULT_CONFIG.servers
    }
    return merged
  } catch (err) {
    console.error('Failed to read config:', err)
    return { ...DEFAULT_CONFIG }
  }
}

export function saveConfig(config) {
  const configPath = getConfigPath()
  const configDir = join(configPath, '..')

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }

  const limit = config?.settings?.history_limit ?? 100
  if (Array.isArray(config?.history) && config.history.length > limit) {
    config.history = config.history.slice(-limit)
  }

  const yamlContent = yaml.dump(config, { lineWidth: 120, quotingType: '"' })
  writeFileSync(configPath, yamlContent, 'utf8')
  return true
}
