const { withPlugins } = require('@expo/config-plugins')

const withNotificationsIos = require('./ios/with-notifications')

module.exports = function withBareKit(config, opts = {}) {
  const { ios = {} } = opts

  const plugins = []

  if (typeof ios.notifications === 'object' && ios.notifications !== null) {
    plugins.push([withNotificationsIos, ios.notifications])
  }

  return withPlugins(config, plugins)
}
