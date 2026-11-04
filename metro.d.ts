import type { MetroConfig } from 'expo/metro-config'

/**
 * Packs the workers listed in the options of the plugin and resolves
 * `expo-bare-kit/workers/<name>` to them.
 */
declare function withBareKit<T extends MetroConfig>(config: T): Promise<T>

export = withBareKit
