# expo-bare-kit

[Expo config plugin](https://docs.expo.dev/config-plugins/introduction/) for [`react-native-bare-kit`](https://github.com/holepunchto/react-native-bare-kit). Handles all native scaffolding so you can use Bare Kit in a managed Expo workflow.

## Install

```sh
npm install expo-bare-kit react-native-bare-kit
```

## Setup

Add the plugin to your `app.json` (or `app.config.js`):

```json
{
  "expo": {
    "plugins": [
      [
        "expo-bare-kit",
        {
          "ios": {
            "notifications": {
              "worklet": "push.bundle"
            }
          },
          "android": {
            "notifications": {
              "worklet": "push.bundle",
              "googleServices": "google-services.json"
            }
          }
        }
      ]
    ]
  }
}
```

Then run prebuild:

```sh
npx expo prebuild
```

## Plugin options

### iOS notifications

Enable by setting `ios.notifications` to an object. Omit or set to `null` to skip.

```json
[
  "expo-bare-kit",
  {
    "ios": {
      "notifications": {
        "worklet": "push.bundle",
        "targetName": "NotificationServiceExtension"
      }
    }
  }
]
```

| Option       | Type     | Default                          | Description                                  |
| ------------ | -------- | -------------------------------- | -------------------------------------------- |
| `worklet`    | `string` | **required**                     | Path to the push notification worklet bundle |
| `targetName` | `string` | `'NotificationServiceExtension'` | Name of the Xcode extension target           |

### Android notifications

Enable by setting `android.notifications` to an object. Omit or set to `null` to skip.

```json
[
  "expo-bare-kit",
  {
    "android": {
      "notifications": {
        "worklet": "push.bundle",
        "googleServices": "google-services.json",
        "channelId": "default",
        "channelName": "Notifications"
      }
    }
  }
]
```

| Option           | Type     | Default           | Description                                  |
| ---------------- | -------- | ----------------- | -------------------------------------------- |
| `worklet`        | `string` | **required**      | Path to the push notification worklet bundle |
| `googleServices` | `string` | **required**      | Path to `google-services.json` from Firebase |
| `channelId`      | `string` | `'default'`       | Android notification channel ID              |
| `channelName`    | `string` | `'Notifications'` | Display name for the notification channel    |

## Push worklet

The worklet is a JavaScript file that runs in a Bare runtime when a push notification arrives. It must be bundled with [`bare-pack`](https://github.com/holepunchto/bare-pack) before use:

```sh
npx bare-pack --preset <ios|android> --out push.bundle push.js
```

Example `push.js`:

```js
// BareKit is a global provided by the Bare runtime
BareKit.on('push', (payload, reply) => {
  const { data } = JSON.parse(payload)

  reply(
    null,
    JSON.stringify({
      title: data.title || 'Notification',
      body: data.body || 'New message received'
    })
  )
})
```

The worklet receives the push payload as a JSON string and must reply with a JSON string containing `title` and `body`.

## API

This package re-exports everything from `react-native-bare-kit`:

```js
import { Worklet } from 'expo-bare-kit'
```

## License

Apache-2.0
