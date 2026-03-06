const { withPlugins } = require('@expo/config-plugins')

const withNotificationsIos = require('./ios/with-notifications')
const withNotificationsAndroid = require('./android/with-notifications')

module.exports = function withBareKit(config, opts = {}) {
  const { ios = {}, android = {} } = opts

  const plugins = []

  if (typeof ios.notifications === 'object' && ios.notifications !== null) {
    plugins.push([withNotificationsIos, ios.notifications])
  }

  if (typeof android.notifications === 'object' && android.notifications !== null) {
    plugins.push([withNotificationsAndroid, android.notifications])
  }

  return withPlugins(config, plugins)
}
