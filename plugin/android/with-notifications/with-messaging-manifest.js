const { withAndroidManifest } = require('@expo/config-plugins')
const defaults = require('../../defaults').android.notifications

module.exports = function withMessagingManifest(config, opts = {}) {
  const { serviceName = defaults.serviceName } = opts

  return withAndroidManifest(config, (config) => {
    const { modResults } = config

    const application = modResults.manifest.application[0]

    application.service = application.service || []

    const exists = application.service.some(
      (s) => s.$['android:name'] === `.${serviceName}`
    )

    if (exists) return config

    application.service.push({
      $: {
        'android:name': `.${serviceName}`,
        'android:exported': 'false'
      },
      'intent-filter': [
        {
          action: [
            {
              $: {
                'android:name': 'com.google.firebase.MESSAGING_EVENT'
              }
            }
          ]
        }
      ]
    })

    return config
  })
}
