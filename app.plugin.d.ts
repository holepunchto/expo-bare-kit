import type { ConfigPlugin } from '@expo/config-plugins'
import type { StowOptions } from 'bare-stow'

/**
 * The options a worker is stowed with. `hosts` narrows the hosts of the worker and may list hosts
 * of both platforms, such as `['ios-arm64', 'android-arm64']`. The addons of all the workers are
 * linked together, so the workers must agree on `imports` and `defer`.
 */
type WorkerOptions = Pick<StowOptions, 'imports' | 'defer' | 'hosts'>

/** A worker, given as its entry point or as a pair of its entry point and its options. */
type Worker = string | [entry: string, options: WorkerOptions]

interface IOSNotificationsOptions {
  /** The entry point of the push notification worker. */
  worker: string
  /** The name of the Xcode extension target. Defaults to `'NotificationServiceExtension'`. */
  targetName?: string
}

interface AndroidNotificationsOptions {
  /** The entry point of the push notification worker. */
  worker: string
  /** The path to `google-services.json` from Firebase. */
  googleServices: string
  /** The Android notification channel ID. Defaults to `'default'`. */
  channelId?: string
  /** The display name of the notification channel. Defaults to `'Notifications'`. */
  channelName?: string
}

interface BareKitPluginOptions {
  /** The workers of the application, relative to the project. */
  workers: Worker[]
  ios?: { notifications?: IOSNotificationsOptions | null }
  android?: { notifications?: AndroidNotificationsOptions | null }
}

declare const withBareKit: ConfigPlugin<BareKitPluginOptions>

declare namespace withBareKit {
  export {
    type WorkerOptions,
    type Worker,
    type IOSNotificationsOptions,
    type AndroidNotificationsOptions,
    type BareKitPluginOptions
  }
}

export = withBareKit
