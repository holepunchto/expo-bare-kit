const { withPlugins } = require('@expo/config-plugins')

const withApplyPlugin = require('./with-apply-plugin')
const withBuildscriptDependency = require('./with-buildscript-dependency')
const withServicesManifest = require('./with-services-manifest')
const withMessagingService = require('./with-messaging-service')

module.exports = function withNotifications(config, opts = {}) {
  return withPlugins(config, [
    [withApplyPlugin, opts],
    [withBuildscriptDependency, opts],
    [withServicesManifest, opts],
    [withMessagingService, opts]
  ])
}
