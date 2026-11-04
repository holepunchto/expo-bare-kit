const { withPlugins } = require('@expo/config-plugins')

const withBareKitIos = require('./ios/with-bare-kit')
const withBareKitAndroid = require('./android/with-bare-kit')
const withNotificationsIos = require('./ios/with-notifications')
const withNotificationsAndroid = require('./android/with-notifications')
const workers = require('./workers')

module.exports = function withBareKit(config, opts = {}) {
  const { ios = {}, android = {} } = opts

  const linked = workers(opts)

  // The addons of the workers handling notifications are linked with the rest.
  for (const worker of [ios.notifications?.worker, android.notifications?.worker]) {
    if (typeof worker === 'string' && !workers.find(linked, worker)) {
      linked.push({ entry: worker, options: {} })
    }
  }

  // Metro packs the workers in a process of its own, which evaluates the
  // plugins of the project to read the options back.
  config._internal = { ...config._internal, 'expo-bare-kit': opts }

  const plugins = [
    [withBareKitIos, { workers: linked }],
    [withBareKitAndroid, { workers: linked }]
  ]

  if (typeof ios.notifications === 'object' && ios.notifications !== null) {
    plugins.push([withNotificationsIos, notifications(ios.notifications, linked)])
  }

  if (typeof android.notifications === 'object' && android.notifications !== null) {
    plugins.push([withNotificationsAndroid, notifications(android.notifications, linked)])
  }

  return withPlugins(config, plugins)
}

function notifications(opts, linked) {
  if (typeof opts.worker !== 'string') {
    throw new Error("Option 'worker' must name the entry point of the notification worker")
  }

  return { ...opts, worker: workers.find(linked, opts.worker) }
}
