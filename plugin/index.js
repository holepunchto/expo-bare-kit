const { withPlugins } = require('@expo/config-plugins')

const withBareKitIos = require('./ios/with-bare-kit')
const withBareKitAndroid = require('./android/with-bare-kit')
const withNotificationsIos = require('./ios/with-notifications')
const withNotificationsAndroid = require('./android/with-notifications')

module.exports = function withBareKit(config, opts = {}) {
  const { workers, ios = {}, android = {} } = opts

  if (!Array.isArray(workers) || workers.length === 0) {
    throw new Error("Option 'workers' must list the entry points of the workers")
  }

  // The addons of the workers handling notifications are linked with the rest.
  const linked = [
    ...new Set([...workers, ios.notifications?.worker, android.notifications?.worker])
  ].filter(Boolean)

  const plugins = [
    [withBareKitIos, { workers: linked }],
    [withBareKitAndroid, { workers: linked }]
  ]

  if (typeof ios.notifications === 'object' && ios.notifications !== null) {
    plugins.push([withNotificationsIos, ios.notifications])
  }

  if (typeof android.notifications === 'object' && android.notifications !== null) {
    plugins.push([withNotificationsAndroid, android.notifications])
  }

  return withPlugins(config, plugins)
}
