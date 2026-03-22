export const DEFAULT_CONFIG = {
  version: '1.0',
  meta: {
    author: 'soizoktantas',
    repo: 'https://github.com/soizoktantas/NetRadar'
  },
  app: {
    name: 'NetRadar',
    titlebar_title: 'NetRadar',
    config_backup_prefix: 'netradarconfig'
  },
  ui: {
    view_paths: {
      dashboard: 'NetRadar/Speed Test',
      network: 'NetRadar/Network Diagnostics',
      privacy: 'NetRadar/Privacy & Anonymity',
      history: 'NetRadar/History',
      config: 'NetRadar/Settings'
    }
  },
  window: {
    width: 1200,
    height: 780,
    min_width: 960,
    min_height: 640,
    rounded_corners: false,
    auto_hide_menu_bar: true,
    background_color: '#050505'
  },
  settings: {
    theme: 'xp-terminal',
    language: 'en',
    save_history: true,
    history_limit: 100
  },
  diagnostics: {
    censorship_targets: []
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

export function cloneConfig(config = DEFAULT_CONFIG) {
  return JSON.parse(JSON.stringify(config))
}

export function deepMerge(defaults, overrides) {
  const result = Array.isArray(defaults) ? [...defaults] : { ...defaults }

  for (const key of Object.keys(overrides || {})) {
    if (
      overrides[key] !== null &&
      typeof overrides[key] === 'object' &&
      !Array.isArray(overrides[key]) &&
      typeof defaults?.[key] === 'object' &&
      defaults?.[key] !== null &&
      !Array.isArray(defaults[key])
    ) {
      result[key] = deepMerge(defaults[key], overrides[key])
    } else {
      result[key] = overrides[key]
    }
  }

  return result
}

export function normalizeConfig(input) {
  const merged = deepMerge(DEFAULT_CONFIG, input || {})
  const asPositiveInt = (value, fallback) => {
    const normalized = Number(value)
    return Number.isFinite(normalized) && normalized > 0 ? Math.round(normalized) : fallback
  }

  if (!Array.isArray(merged.history)) {
    merged.history = []
  }

  if (!Array.isArray(merged.servers) || merged.servers.length === 0) {
    merged.servers = cloneConfig(DEFAULT_CONFIG.servers)
  }

  merged.settings.history_limit = asPositiveInt(merged?.settings?.history_limit, DEFAULT_CONFIG.settings.history_limit)

  merged.settings.language = merged?.settings?.language || DEFAULT_CONFIG.settings.language
  merged.settings.theme = merged?.settings?.theme || DEFAULT_CONFIG.settings.theme
  merged.settings.save_history = typeof merged?.settings?.save_history === 'boolean'
    ? merged.settings.save_history
    : DEFAULT_CONFIG.settings.save_history
  merged.diagnostics.censorship_targets = Array.isArray(merged?.diagnostics?.censorship_targets)
    ? merged.diagnostics.censorship_targets
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    : [...DEFAULT_CONFIG.diagnostics.censorship_targets]

  merged.test_settings.download_size_mb = asPositiveInt(
    merged?.test_settings?.download_size_mb,
    DEFAULT_CONFIG.test_settings.download_size_mb
  )
  merged.test_settings.upload_size_mb = asPositiveInt(
    merged?.test_settings?.upload_size_mb,
    DEFAULT_CONFIG.test_settings.upload_size_mb
  )
  merged.test_settings.latency_samples = asPositiveInt(
    merged?.test_settings?.latency_samples,
    DEFAULT_CONFIG.test_settings.latency_samples
  )
  merged.test_settings.timeout_ms = asPositiveInt(
    merged?.test_settings?.timeout_ms,
    DEFAULT_CONFIG.test_settings.timeout_ms
  )

  if (merged.history.length > merged.settings.history_limit) {
    merged.history = merged.history.slice(-merged.settings.history_limit)
  }

  const firstEnabledServer = merged.servers.find((server) => server?.enabled) || merged.servers[0]
  const hasDefaultServer = merged.servers.some((server) => server?.default)
  merged.servers = merged.servers.map((server) => ({
    ...server,
    default: hasDefaultServer ? Boolean(server?.default) : server?.id === firstEnabledServer?.id
  }))

  merged.app.name = merged?.app?.name || DEFAULT_CONFIG.app.name
  merged.app.titlebar_title = merged?.app?.titlebar_title || merged.app.name
  merged.app.config_backup_prefix = merged?.app?.config_backup_prefix || DEFAULT_CONFIG.app.config_backup_prefix

  merged.ui.view_paths = deepMerge(DEFAULT_CONFIG.ui.view_paths, merged?.ui?.view_paths || {})
  merged.window = deepMerge(DEFAULT_CONFIG.window, merged?.window || {})
  merged.window.width = asPositiveInt(merged.window.width, DEFAULT_CONFIG.window.width)
  merged.window.height = asPositiveInt(merged.window.height, DEFAULT_CONFIG.window.height)
  merged.window.min_width = asPositiveInt(merged.window.min_width, DEFAULT_CONFIG.window.min_width)
  merged.window.min_height = asPositiveInt(merged.window.min_height, DEFAULT_CONFIG.window.min_height)
  merged.window.rounded_corners = typeof merged.window.rounded_corners === 'boolean'
    ? merged.window.rounded_corners
    : DEFAULT_CONFIG.window.rounded_corners
  merged.window.auto_hide_menu_bar = typeof merged.window.auto_hide_menu_bar === 'boolean'
    ? merged.window.auto_hide_menu_bar
    : DEFAULT_CONFIG.window.auto_hide_menu_bar
  merged.window.background_color = merged.window.background_color || DEFAULT_CONFIG.window.background_color

  return merged
}
