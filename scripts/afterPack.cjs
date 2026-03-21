const { execSync } = require('child_process')

/** @param {import('electron-builder').AfterPackContext} context */
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appPath = `${context.appOutDir}/${context.packager.appInfo.productName}.app`

  try {
    // Strip all extended attributes (incl. com.apple.quarantine) from the
    // app bundle so Finder can copy it to /Applications without error -36
    execSync(`xattr -cr "${appPath}"`, { stdio: 'pipe' })
    console.log(`  • cleared xattrs on ${appPath}`)
  } catch (e) {
    console.warn('  ⚠ xattr -cr failed:', e.message)
  }
}
