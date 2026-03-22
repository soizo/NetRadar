import { app } from 'electron'
import { join, dirname, extname } from 'path'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import yaml from 'js-yaml'
import { cloneConfig, DEFAULT_CONFIG, normalizeConfig } from '../shared/appConfig.js'

export function getConfigPath() {
  const appDataPath = app.getPath('appData')
  if (process.platform === 'win32') {
    return join(appDataPath, 'NetRadar', 'config.yaml')
  } else {
    return join(appDataPath, 'netradar', 'config.yaml')
  }
}

function serializeConfig(config) {
  const header = [
    '# NetRadar configuration',
    '# Edit this file to customize the app window, language, routes, test parameters, servers, and history behavior.',
    ''
  ].join('\n')

  return `${header}${yaml.dump(config, { lineWidth: 120, quotingType: '"', noRefs: true })}`
}

function ensureConfigDir() {
  const configDir = dirname(getConfigPath())
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }
}

function formatBackupTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('') + '-' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('')
}

function writeConfigFile(configPath, config) {
  writeFileSync(configPath, serializeConfig(normalizeConfig(config)), 'utf8')
}

export function getConfig() {
  const configPath = getConfigPath()
  ensureConfigDir()

  if (!existsSync(configPath)) {
    writeConfigFile(configPath, DEFAULT_CONFIG)
    return cloneConfig(DEFAULT_CONFIG)
  }

  try {
    const raw = readFileSync(configPath, 'utf8')
    const parsed = yaml.load(raw)
    if (!parsed || typeof parsed !== 'object') {
      return cloneConfig(DEFAULT_CONFIG)
    }
    return normalizeConfig(parsed)
  } catch (err) {
    console.error('Failed to read config:', err)
    return cloneConfig(DEFAULT_CONFIG)
  }
}

export function saveConfig(config) {
  const configPath = getConfigPath()
  ensureConfigDir()
  writeConfigFile(configPath, config)
  return true
}

export async function resetConfigWithBackup(trashItem) {
  const configPath = getConfigPath()
  ensureConfigDir()

  if (existsSync(configPath)) {
    const backupPrefix = getConfig()?.app?.config_backup_prefix || DEFAULT_CONFIG.app.config_backup_prefix
    const backupName = `${backupPrefix}-${formatBackupTimestamp()}${extname(configPath) || '.yaml'}`
    const backupPath = join(dirname(configPath), backupName)

    renameSync(configPath, backupPath)

    if (trashItem) {
      await trashItem(backupPath)
    }
  }

  writeConfigFile(configPath, DEFAULT_CONFIG)
  return cloneConfig(DEFAULT_CONFIG)
}
