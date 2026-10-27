module.exports = {
  ios: {
    addons: 'BareKitAddons',
    hosts: ['ios-arm64', 'ios-arm64-simulator', 'ios-x64-simulator'],
    deploymentTarget: '15.1',
    notifications: {
      targetName: 'NotificationServiceExtension',
      worker: 'BareKitPush'
    }
  },
  android: {
    addons: 'bare-kit-addons',
    minSdkVersion: 29,
    kotlinVersion: '2.4.20',
    notifications: {
      worker: 'bare-kit-push',
      channelId: 'default',
      channelName: 'Notifications'
    }
  }
}
