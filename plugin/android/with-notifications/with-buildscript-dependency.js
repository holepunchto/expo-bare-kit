const { WarningAggregator, withProjectBuildGradle } = require('@expo/config-plugins')

const googleServicesClassPath = 'com.google.gms:google-services'
const googleServicesVersion = '4.4.2'

module.exports = function withBuildscriptDependency (config, opts = {}) {
  return withProjectBuildGradle(config, (config) => {
    const { modResults } = config

    if (modResults.language !== 'groovy') {
      WarningAggregator.addWarningAndroid(
        'expo-bare-kit',
        'Cannot configure non-Groovy buildscript dependencies'
      )

      return config
    }

    modResults.contents = addGoogleServicesDependency(modResults.contents)

    return config
  })
}

function addGoogleServicesDependency (buildscript) {
  if (buildscript.includes(googleServicesClassPath)) return buildscript

  return buildscript.replace(
    /dependencies\s*{\s*([^}]*)}/,
    'dependencies {\n' +
    `        classpath('${googleServicesClassPath}:${googleServicesVersion}')\n` +
    '        $1' +
    '}'
  )
}
