const path = require('path')
const { withPodfile } = require('@expo/config-plugins')
const defaults = require('../../defaults').ios.notifications

module.exports = function withPodTarget (config, opts = {}) {
  const {
    targetName = defaults.targetName
  } = opts

  return withPodfile(config, (config) => {
    const { modResults } = config

    modResults.contents = addPodTarget(modResults.contents, modResults.path, targetName)

    return config
  })
}

function addPodTarget (podfile, podfilePath, targetName) {
  if (podfile.includes(`target '${targetName}'`)) return podfile

  const podspec = path.relative(
    path.dirname(podfilePath),
    path.resolve(require.resolve('react-native-bare-kit/package'), '..', 'ios')
  )

  return (
    podfile + '\n' +
    `target '${targetName}' do\n` +
    `  pod 'BareKit', path: '${podspec}'\n` +
    'end\n'
  )
}
