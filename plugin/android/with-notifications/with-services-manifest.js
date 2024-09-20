const fs = require('fs').promises
const path = require('path')
const { withDangerousMod } = require('@expo/config-plugins')

module.exports = function withServicesManifest (config, opts = {}) {
  return withDangerousMod(config, ['android', async (config) => {
    const src = path.resolve(config.modRequest.projectRoot, opts.googleServices)

    const dest = path.resolve(config.modRequest.platformProjectRoot, 'app', 'google-services.json')

    await fs.copyFile(src, dest)

    return config
  }])
}
