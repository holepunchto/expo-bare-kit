const { WarningAggregator, withAppBuildGradle } = require('@expo/config-plugins')

const firebaseBomVersion = '33.10.0'

module.exports = function withFirebaseDependency(config, opts = {}) {
  return withAppBuildGradle(config, (config) => {
    const { modResults } = config

    if (modResults.language !== 'groovy') {
      WarningAggregator.addWarningAndroid(
        'expo-bare-kit',
        'Cannot configure non-Groovy app build.gradle dependencies'
      )

      return config
    }

    modResults.contents = addFirebaseDependencies(modResults.contents)

    return config
  })
}

function addFirebaseDependencies(buildGradle) {
  if (buildGradle.includes('firebase-messaging')) return buildGradle

  const bomLine = `    implementation platform('com.google.firebase:firebase-bom:${firebaseBomVersion}')`
  const messagingLine = "    implementation 'com.google.firebase:firebase-messaging'"

  return buildGradle.replace(/dependencies\s*{/, `dependencies {\n${bomLine}\n${messagingLine}`)
}
