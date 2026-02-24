module.exports = {
  ios: {
    notifications: {
      targetName: 'NotificationServiceExtension'
    }
  },
  android: {
    notifications: {
      serviceName: 'MessagingService',
      channelId: 'default',
      channelName: 'Notifications'
    }
  }
}
