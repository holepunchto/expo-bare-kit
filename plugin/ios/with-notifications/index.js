const { withPlugins } = require('@expo/config-plugins')

const withAppGroupPermissions = require('./with-app-group-permissions')
const withApsEnvironment = require('./with-aps-environment')
const withNotificationServiceExtension = require('./with-notification-service-extension')
const withPodTarget = require('./with-pod-target')

module.exports = function withNotifications(config, opts = {}) {
  return withPlugins(config, [
    [withAppGroupPermissions, opts],
    [withApsEnvironment, opts],
    [withNotificationServiceExtension, opts],
    [withPodTarget, opts]
  ])
}
