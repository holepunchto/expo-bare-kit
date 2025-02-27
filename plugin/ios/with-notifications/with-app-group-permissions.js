const { withEntitlementsPlist } = require('@expo/config-plugins')

const applicationGroups = 'com.apple.security.application-groups'

module.exports = function withAppGroupPermissions(config, opts = {}) {
  return withEntitlementsPlist(config, (config) => {
    const { modResults } = config

    if (!Array.isArray(modResults[applicationGroups])) {
      modResults[applicationGroups] = []
    }

    const entitlement = `group.${config.ios.bundleIdentifier}`

    if (modResults[applicationGroups].includes(entitlement)) return config

    modResults[applicationGroups].push(entitlement)

    return config
  })
}
