const fs = require('fs').promises
const path = require('path')
const {
  IOSConfig,
  withDangerousMod,
  withPlugins,
  withXcodeProject
} = require('@expo/config-plugins')
const addSwiftPackage = require('./swift-package')
const addFolderResource = require('./folder-resource')
const { link, resources } = require('../stow')
const defaults = require('../defaults').ios

module.exports = function withBareKit(config, opts = {}) {
  return withPlugins(config, [
    [withAddons, opts],
    [withAddonsPackage, opts]
  ])
}

function withAddons(config, opts = {}) {
  const { workers } = opts

  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const out = path.join(config.modRequest.platformProjectRoot, defaults.addons)

      await link(config, { workers, language: 'swift', hosts: defaults.hosts, out })

      // Xcode requires the folder of the assets, even if there are none.
      await fs.mkdir(path.join(out, resources), { recursive: true })

      return config
    }
  ])
}

function withAddonsPackage(config) {
  return withXcodeProject(config, (config) => {
    const { modResults: project, modRequest } = config

    const { uuid } = IOSConfig.XcodeUtils.getApplicationNativeTarget({
      project,
      projectName: modRequest.projectName
    })

    addSwiftPackage(project, uuid, defaults.addons, defaults.addons)
    addFolderResource(project, uuid, `${defaults.addons}/${resources}`)

    return config
  })
}
