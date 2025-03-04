const path = require('path');
const fs = require('fs');

const { withPlugins, withAndroidManifest } = require('@expo/config-plugins');

function withServiceManifest(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    const app = manifest.application.find(app => app['$']['android:name']);

    if (!app.service) {
      app.service = [];
    }

    app.service.push({
      $: {
        // TOOD: add a const for the filename
        'android:name': '.ExpoMessagingService',
        'android:exported': 'false',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'com.google.firebase.MESSAGING_EVENT' } }],
        },
      ],
    });

    return config;
  })
}

function withInlineMessagingService(config, opts) {
  const worklet = opts.worklet;
  const workletFileName = path.basename(worklet);
  const INLINE_MESSAGING_SERVICE = `package ${config.android.package};

import android.content.SharedPreferences;
import java.io.IOException;
import to.holepunch.bare.kit.Worklet;
import to.holepunch.bare.kit.MessagingService;

public class ExpoMessagingService extends MessagingService {
    public ExpoMessagingService() throws IOException {
        super(new Worklet.Options());

        this.start("app.js", getAssets().open("${workletFileName}"), null);
    }
}
`;
  const androidPath = path.join(config._internal.projectRoot, 'android');
  const packageDir = config.android.package.replace(/\./g, path.sep);
  const packagePath = path.join(androidPath, 'app', 'src', 'main', 'java', packageDir);
  const filePath = path.join(packagePath, 'ExpoMessagingService.java');

  fs.writeFileSync(filePath, INLINE_MESSAGING_SERVICE, 'utf8');

  return config;
}

module.exports = function withMessagingService(config, opts) {
  console.log('Running withMessagingService');
  return withPlugins(config, [
    [withServiceManifest, opts],
    [withInlineMessagingService, opts]
  ]);
}
