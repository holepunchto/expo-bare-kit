const { WarningAggregator, withAppBuildGradle } = require('@expo/config-plugins')

const googleServicesPlugin = 'com.google.gms.google-services'

module.exports = function withApplyPlugin (config, opts = {}) {
  return withAppBuildGradle(config, (config) => {
    const { modResults } = config

    if (modResults.language !== 'groovy') {
      WarningAggregator.addWarningAndroid(
        'expo-bare-kit',
        'Cannot configure non-Groovy buildscript plugins'
      )

      return config
    }

    modResults.contents = addGoogleServicesPlugin(modResults.contents)

    return config
  })
}

function addGoogleServicesPlugin (buildscript) {
  if (buildscript.includes(googleServicesPlugin)) return buildscript

  return (
    `apply plugin: "${googleServicesPlugin}"\n` +
    buildscript
  )
}
