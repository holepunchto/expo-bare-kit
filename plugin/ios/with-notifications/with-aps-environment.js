const { withEntitlementsPlist } = require('@expo/config-plugins')

module.exports = function withApsEnvironment(config, opts = {}) {
  const { mode = 'development' } = opts

  return withEntitlementsPlist(config, (config) => {
    const { modResults } = config

    modResults['aps-environment'] = mode

    return config
  })
}
