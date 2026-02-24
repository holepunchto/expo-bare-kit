const { withPlugins } = require('@expo/config-plugins')

const withApplyPlugin = require('./with-apply-plugin')
const withBuildscriptDependency = require('./with-buildscript-dependency')
const withServicesManifest = require('./with-services-manifest')
const withFirebaseDependency = require('./with-firebase-dependency')
const withFirebaseMessagingService = require('./with-firebase-messaging-service')
const withMessagingManifest = require('./with-messaging-manifest')

module.exports = function withNotifications(config, opts = {}) {
  return withPlugins(config, [
    [withApplyPlugin, opts],
    [withBuildscriptDependency, opts],
    [withServicesManifest, opts],
    [withFirebaseDependency, opts],
    [withFirebaseMessagingService, opts],
    [withMessagingManifest, opts]
  ])
}
