# expo-bare-kit

[Expo config plugin](https://docs.expo.dev/config-plugins/introduction/) for [`react-native-bare-kit`](https://github.com/holepunchto/react-native-bare-kit). It packs your workers on every bundle, links Bare Kit and the addons and assets of your workers into the native projects, and optionally sets up workers that handle push notifications.

```
npm i expo-bare-kit react-native-bare-kit
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
          "workers": ["core.js", "push.js"],
          "ios": {
            "notifications": {
              "worker": "push.js"
            }
          },
          "android": {
            "notifications": {
              "worker": "push.js",
              "googleServices": "google-services.json"
            }
          }
        }
      ]
    ]
  }
}
```

Wrap the Metro configuration in your `metro.config.js`:

```js
const { getDefaultConfig } = require('expo/metro-config')
const withBareKit = require('expo-bare-kit/metro')

module.exports = withBareKit(getDefaultConfig(__dirname))
```

Then run prebuild:

```sh
npx expo prebuild
```

Start a worker from the application by importing it as `expo-bare-kit/workers/<name>`, where the name is the path of its entry point without the extension:

```js
import core from 'expo-bare-kit/workers/core'
import b4a from 'b4a'

const { ipc } = await core.start()

ipc.on('data', (data) => console.log(b4a.toString(data)))
ipc.write(b4a.from('Hello from React Native!'))
```

## Plugin options

### Workers

`workers` lists the entry points of the workers of the application, relative to the project. Each worker exports a `start()` function that receives the IPC stream:

```js
module.exports = function start(ipc) {
  ipc.on('data', (data) => ipc.write(data))
}
```

`withBareKit()` packs the workers with `bare-stow` (<https://github.com/holepunchto/bare-stow>) into `.expo/bare-kit` whenever Metro starts, which also covers release builds and `expo export`. While Metro runs, it packs a worker again once one of its modules changes. If packing fails, such as when a worker imports a package that isn't installed yet, Metro logs the error and keeps the previous pack until one of the modules of the worker changes again.

The plugin links the addons and assets of the workers once with `bare-stow link` into a Swift package and a Gradle module, which also bring along Bare Kit, and adds both to the application. The notification extension also gets the Swift package. Run prebuild again when the workers start using other addons.

On Android, the plugin also adds JitPack (<https://jitpack.io>) to the repositories of the project, and raises the minimum SDK version to 29 and the Kotlin version to 2.4.20 if needed.

### iOS notifications

Enable by setting `ios.notifications` to an object. Omit or set to `null` to skip.

```json
[
  "expo-bare-kit",
  {
    "ios": {
      "notifications": {
        "worker": "push.js",
        "targetName": "NotificationServiceExtension"
      }
    }
  }
]
```

| Option       | Type     | Default                          | Description                                 |
| ------------ | -------- | -------------------------------- | ------------------------------------------- |
| `worker`     | `string` | **required**                     | Entry point of the push notification worker |
| `targetName` | `string` | `'NotificationServiceExtension'` | Name of the Xcode extension target          |

### Android notifications

Enable by setting `android.notifications` to an object. Omit or set to `null` to skip.

```json
[
  "expo-bare-kit",
  {
    "android": {
      "notifications": {
        "worker": "push.js",
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
| `worker`         | `string` | **required**      | Entry point of the push notification worker  |
| `googleServices` | `string` | **required**      | Path to `google-services.json` from Firebase |
| `channelId`      | `string` | `'default'`       | Android notification channel ID              |
| `channelName`    | `string` | `'Notifications'` | Display name for the notification channel    |

## Push worker

The push worker is stowed with `bare-stow` and runs in a worklet of its own when a push notification arrives. Like any other worker, it exports a `start()` function that receives the IPC stream. The payload of the notification arrives as one message of JSON, and the worker replies with one message of JSON containing the `title` and `body` to show. On iOS, the payload is the `userInfo` of the notification, including `aps`. On Android, it is the `data` of the message.

Example `push.js`:

```js
module.exports = function start(ipc) {
  ipc.on('data', (data) => {
    const payload = JSON.parse(data)

    ipc.write(
      JSON.stringify({
        title: payload.title || 'Notification',
        body: payload.body || 'New message received'
      })
    )
  })
}
```

If the worker does not reply in time, the notification is shown as it was received on iOS and dropped on Android.

## API

This package re-exports everything from `react-native-bare-kit`:

```js
import { Worklet } from 'expo-bare-kit'
```

## License

Apache-2.0
