const fs = require('fs').promises
const path = require('path')
const { withPlugins, withXcodeProject, withDangerousMod } = require('@expo/config-plugins')
const addSwiftPackage = require('../swift-package')
const { pack } = require('../../stow')
const defaults = require('../../defaults').ios

module.exports = function withNotificationServiceExtension(config, opts = {}) {
  return withPlugins(config, [
    [withWorker, opts],
    [withProjectConfiguration, opts],
    [withProjectFiles, opts]
  ])
}

function withWorker(config, opts = {}) {
  const { worker } = opts

  return withDangerousMod(config, [
    'ios',
    async (config) => {
      await pack(config, {
        worker,
        language: 'swift',
        hosts: defaults.hosts,
        out: path.join(config.modRequest.platformProjectRoot, defaults.notifications.worker)
      })

      return config
    }
  ])
}

function withProjectConfiguration(config, opts = {}) {
  const { targetName = defaults.notifications.targetName } = opts

  return withXcodeProject(config, (config) => {
    const { modResults: project } = config

    if (project.pbxTargetByName(targetName)) return config

    const group = project.addPbxGroup(
      ['NotificationService.swift', `${targetName}-Info.plist`, `${targetName}.entitlements`],
      targetName,
      targetName
    )

    const objects = project.hash.project.objects

    objects.PBXTargetDependency = objects.PBXTargetDependency || {}
    objects.PBXContainerItemProxy = objects.PBXContainerItemProxy || {}

    const groups = objects.PBXGroup

    for (const key in groups) {
      if (
        typeof groups[key] === 'object' &&
        groups[key].name === undefined &&
        groups[key].path === undefined
      ) {
        project.addToPbxGroup(group.uuid, key)
      }
    }

    const target = project.addTarget(
      targetName,
      'app_extension',
      targetName,
      `${config.ios.bundleIdentifier}.${targetName}`
    )

    project.addBuildPhase(
      ['NotificationService.swift'],
      'PBXSourcesBuildPhase',
      'Sources',
      target.uuid
    )
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid)
    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid)

    const configurations = project.pbxXCBuildConfigurationSection()

    for (const key in configurations) {
      if (configurations[key].buildSettings?.PRODUCT_NAME === `"${targetName}"`) {
        const settings = configurations[key].buildSettings

        settings.CODE_SIGN_ENTITLEMENTS = `${targetName}/${targetName}.entitlements`
        settings.CODE_SIGN_STYLE = 'Automatic'
        settings.IPHONEOS_DEPLOYMENT_TARGET =
          config.ios.deploymentTarget || defaults.deploymentTarget
        settings.SWIFT_VERSION = '5.0'
        settings.TARGETED_DEVICE_FAMILY = '"1,2"'
      }
    }

    addSwiftPackage(project, target.uuid, defaults.addons, defaults.addons)
    addSwiftPackage(
      project,
      target.uuid,
      defaults.notifications.worker,
      defaults.notifications.worker
    )

    return config
  })
}

function withProjectFiles(config, opts = {}) {
  const { targetName = defaults.notifications.targetName } = opts
  const worker = defaults.notifications.worker

  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const dest = path.join(config.modRequest.platformProjectRoot, targetName)

      await fs.mkdir(dest, { recursive: true })

      await addFileIfNotExists(
        path.join(dest, 'NotificationService.swift'),
        'import BareKitAddons\n' +
          `import ${worker}\n` +
          'import Foundation\n' +
          'import UserNotifications\n' +
          '\n' +
          'class NotificationService: UNNotificationServiceExtension {\n' +
          '  private static let configured: Void = Worklet.optimizeForMemory(true)\n' +
          '\n' +
          '  private let lock = NSLock()\n' +
          `  private var started: ${worker}.Started?\n` +
          '  private var content: UNMutableNotificationContent?\n' +
          '  private var contentHandler: ((UNNotificationContent) -> Void)?\n' +
          '\n' +
          '  override func didReceive(\n' +
          '    _ request: UNNotificationRequest,\n' +
          '    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void\n' +
          '  ) {\n' +
          '    let content = request.content.mutableCopy() as! UNMutableNotificationContent\n' +
          '\n' +
          '    lock.withLock {\n' +
          '      self.content = content\n' +
          '      self.contentHandler = contentHandler\n' +
          '    }\n' +
          '\n' +
          '    let payload = request.content.userInfo\n' +
          '\n' +
          '    Task {\n' +
          '      let reply = try? await reply(to: payload)\n' +
          '\n' +
          '      lock.withLock {\n' +
          '        if let title = reply?["title"] as? String { content.title = title }\n' +
          '        if let body = reply?["body"] as? String { content.body = body }\n' +
          '      }\n' +
          '\n' +
          '      deliver()\n' +
          '    }\n' +
          '  }\n' +
          '\n' +
          '  override func serviceExtensionTimeWillExpire() {\n' +
          '    lock.withLock { started }?.worklet.terminate()\n' +
          '\n' +
          '    deliver()\n' +
          '  }\n' +
          '\n' +
          '  private func reply(to payload: [AnyHashable: Any]) async throws -> [String: Any]? {\n' +
          '    _ = Self.configured\n' +
          '\n' +
          `    let started = try await ${worker}.start()\n` +
          '\n' +
          '    lock.withLock { self.started = started }\n' +
          '\n' +
          '    try await started.ipc.write(JSONSerialization.data(withJSONObject: payload))\n' +
          '\n' +
          '    var replies = started.ipc.makeAsyncIterator()\n' +
          '\n' +
          '    let reply = try await replies.next()\n' +
          '\n' +
          '    _ = await started.ipc.terminate()\n' +
          '\n' +
          '    guard let reply else { return nil }\n' +
          '\n' +
          '    return try JSONSerialization.jsonObject(with: reply) as? [String: Any]\n' +
          '  }\n' +
          '\n' +
          '  private func deliver() {\n' +
          '    let (content, contentHandler) = lock.withLock {\n' +
          '      defer {\n' +
          '        self.contentHandler = nil\n' +
          '        self.started = nil\n' +
          '      }\n' +
          '\n' +
          '      return (self.content, self.contentHandler)\n' +
          '    }\n' +
          '\n' +
          '    if let content, let contentHandler { contentHandler(content) }\n' +
          '  }\n' +
          '}\n'
      )

      await addFileIfNotExists(
        path.join(dest, `${targetName}-Info.plist`),
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
          '<plist version="1.0">\n' +
          '<dict>\n' +
          '  <key>CFBundleName</key>\n' +
          `  <string>${targetName}</string>\n` +
          '  <key>CFBundleIdentifier</key>\n' +
          `  <string>${config.ios.bundleIdentifier}.${targetName}</string>\n` +
          '  <key>CFBundleVersion</key>\n' +
          `  <string>${config.ios.buildNumber || config.version}</string>\n` +
          '  <key>CFBundleShortVersionString</key>\n' +
          `  <string>${config.version}</string>\n` +
          '  <key>CFBundleExecutable</key>\n' +
          `  <string>${targetName}</string>\n` +
          '  <key>CFBundlePackageType</key>\n' +
          '  <string>XPC!</string>\n' +
          '  <key>CFBundleSignature</key>\n' +
          '  <string>????</string>\n' +
          '  <key>NSExtension</key>\n' +
          '  <dict>\n' +
          '    <key>NSExtensionPointIdentifier</key>\n' +
          '    <string>com.apple.usernotifications.service</string>\n' +
          '    <key>NSExtensionPrincipalClass</key>\n' +
          '    <string>$(PRODUCT_MODULE_NAME).NotificationService</string>\n' +
          '  </dict>\n' +
          '</dict>\n' +
          '</plist>\n'
      )

      await addFileIfNotExists(
        path.join(dest, `${targetName}.entitlements`),
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
          '<plist version="1.0">\n' +
          '<dict>\n' +
          '  <key>com.apple.security.application-groups</key>\n' +
          '  <array>\n' +
          `    <string>group.${config.ios.bundleIdentifier}</string>\n` +
          '  </array>\n' +
          '  <key>com.apple.developer.usernotifications.filtering</key>\n' +
          '  <true/>\n' +
          '</dict>\n' +
          '</plist>\n'
      )

      return config
    }
  ])
}

async function addFileIfNotExists(dest, contents) {
  try {
    await fs.access(dest)
  } catch {
    await fs.writeFile(dest, contents)
  }
}
