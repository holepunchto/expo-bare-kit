const { withEntitlementsPlist } = require('@expo/config-plugins')
const options = require('../options')

// V8 is built with pointer compression, which reserves more virtual memory when
// it's initialized than the address space of an app allows by default. See
// https://github.com/holepunchto/chromium-prebuilds.
const entitlement = 'com.apple.developer.kernel.extended-virtual-addressing'

module.exports = exports = function withExtendedVirtualAddressing(config) {
  return withEntitlementsPlist(config, (config) => {
    exports.add(config, config.modResults)

    return config
  })
}

exports.add = function add(config, entitlements) {
  if (options.engine(config, 'ios') === 'v8') entitlements[entitlement] = true
}
