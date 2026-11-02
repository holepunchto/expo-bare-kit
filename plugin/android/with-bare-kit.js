const path = require('path')
const {
  WarningAggregator,
  withDangerousMod,
  withGradleProperties: withGradlePropertiesMod,
  withPlugins,
  withProjectBuildGradle
} = require('@expo/config-plugins')
const withModule = require('./with-module')
const { link } = require('../stow')
const defaults = require('../defaults').android

const repository = 'https://www.jitpack.io'

module.exports = function withBareKit(config, opts = {}) {
  return withPlugins(config, [
    [withAddons, opts],
    [withModule, defaults.addons],
    [withRepository, opts],
    [withGradleProperties, opts]
  ])
}

function withAddons(config, opts = {}) {
  const { workers } = opts

  return withDangerousMod(config, [
    'android',
    async (config) => {
      await link(config, {
        workers,
        language: 'kotlin',
        languageOptions: { package: `${config.android.package}.addons` },
        out: path.join(config.modRequest.platformProjectRoot, defaults.addons)
      })

      return config
    }
  ])
}

function withRepository(config) {
  return withProjectBuildGradle(config, (config) => {
    const { modResults } = config

    if (modResults.language !== 'groovy') {
      WarningAggregator.addWarningAndroid(
        'expo-bare-kit',
        'Cannot configure non-Groovy buildscript repositories'
      )

      return config
    }

    modResults.contents = addRepository(modResults.contents)

    return config
  })
}

function addRepository(buildscript) {
  if (/jitpack\.io/.test(buildscript)) return buildscript

  return buildscript.replace(
    /allprojects\s*{\s*repositories\s*{/,
    (match) => `${match}\n    maven { url '${repository}' }`
  )
}

// Bare Kit requires Android 10 or later, and its Kotlin bindings Kotlin 2.4 or
// later.
function withGradleProperties(config) {
  return withGradlePropertiesMod(config, (config) => {
    const { modResults } = config

    raiseProperty(modResults, 'android.minSdkVersion', String(defaults.minSdkVersion))
    raiseProperty(modResults, 'android.kotlinVersion', defaults.kotlinVersion)

    return config
  })
}

function raiseProperty(properties, key, minimum) {
  const property = properties.find((item) => item.type === 'property' && item.key === key)

  if (property === undefined) {
    properties.push({ type: 'property', key, value: minimum })
  } else if (compareVersions(property.value, minimum) < 0) {
    property.value = minimum
  }
}

function compareVersions(a, b) {
  const x = a.split('.').map(Number)
  const y = b.split('.').map(Number)

  for (let i = 0, n = Math.max(x.length, y.length); i < n; i++) {
    const d = (x[i] || 0) - (y[i] || 0)

    if (d !== 0) return d
  }

  return 0
}
