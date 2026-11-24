const { withPlugins } = require('@expo/config-plugins')

const withBareKitIos = require('./ios/with-bare-kit')
const withBareKitAndroid = require('./android/with-bare-kit')
const withNotificationsIos = require('./ios/with-notifications')
const withNotificationsAndroid = require('./android/with-notifications')
const options = require('./options')

module.exports = function withBareKit(config, opts = {}) {
  const recorded = options.recorded(config)

  options.record(config, opts)

  const plugins = []

  if (recorded === undefined) plugins.push(withBareKitIos, withBareKitAndroid)

  for (const [platform, withNotifications] of [
    ['ios', withNotificationsIos],
    ['android', withNotificationsAndroid]
  ]) {
    const notifications = opts[platform]?.notifications

    if (
      options.isEnabled(notifications) &&
      !options.isEnabled(recorded?.[platform].notifications)
    ) {
      plugins.push([withNotifications, notifications])
    }
  }

  return withPlugins(config, plugins)
}
