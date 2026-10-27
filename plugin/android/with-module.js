const {
  WarningAggregator,
  withAppBuildGradle,
  withPlugins,
  withSettingsGradle
} = require('@expo/config-plugins')

// Includes the Gradle module in the directory `name` of the project and adds it
// to the dependencies of the application.
module.exports = function withModule(config, name) {
  return withPlugins(config, [
    [withInclude, name],
    [withDependency, name]
  ])
}

function withInclude(config, name) {
  return withSettingsGradle(config, (config) => {
    const { modResults } = config

    if (!modResults.contents.includes(`include ':${name}'`)) {
      modResults.contents += `\ninclude ':${name}'\n`
    }

    return config
  })
}

function withDependency(config, name) {
  return withAppBuildGradle(config, (config) => {
    const { modResults } = config

    if (modResults.language !== 'groovy') {
      WarningAggregator.addWarningAndroid(
        'expo-bare-kit',
        'Cannot configure non-Groovy app build.gradle dependencies'
      )

      return config
    }

    const dependency = `implementation project(':${name}')`

    if (!modResults.contents.includes(dependency)) {
      modResults.contents = modResults.contents.replace(
        /dependencies\s*{/,
        (match) => `${match}\n    ${dependency}`
      )
    }

    return config
  })
}
