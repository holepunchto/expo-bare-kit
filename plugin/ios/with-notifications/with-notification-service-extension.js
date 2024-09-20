const fs = require('fs').promises
const path = require('path')
const { withPlugins, withXcodeProject, withDangerousMod } = require('@expo/config-plugins')
const defaults = require('../../defaults').ios.notifications

module.exports = function withNotificationServiceExtension (config, opts = {}) {
  return withPlugins(config, [
    [withProjectConfiguration, opts],
    [withProjectFiles, opts]
  ])
}

function withProjectConfiguration (config, opts = {}) {
  const {
    targetName = defaults.targetName,
    worklet
  } = opts

  return withXcodeProject(config, (config) => {
    const { modResults: project } = config

    if (project.pbxTargetByName(targetName)) return config

    const workletPath = path.relative(
      path.join(config.modRequest.platformProjectRoot, targetName),
      path.join(config.modRequest.projectRoot, worklet)
    )

    const group = project.addPbxGroup(
      ['NotificationService.h', 'NotificationService.m', `${targetName}-Info.plist`, `${targetName}.entitlements`, workletPath],
      targetName,
      targetName
    )

    const objects = project.hash.project.objects

    objects.PBXTargetDependency = objects.PBXTargetDependency || {}
    objects.PBXContainerItemProxy = objects.PBXTargetDependency || {}

    const groups = objects.PBXGroup

    for (const key in groups) {
      if (typeof groups[key] === 'object' && groups[key].name === undefined && groups[key].path === undefined) {
        project.addToPbxGroup(group.uuid, key)
      }
    }

    const target = project.addTarget(
      targetName,
      'app_extension',
      targetName,
      `${config.ios.bundleIdentifier}.${targetName}`
    )

    project.addBuildPhase(['NotificationService.m'], 'PBXSourcesBuildPhase', 'Sources', target.uuid)
    project.addBuildPhase([workletPath], 'PBXResourcesBuildPhase', 'Resources', target.uuid)
    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid)

    const configurations = project.pbxXCBuildConfigurationSection()

    for (const key in configurations) {
      if (configurations[key].buildSettings?.PRODUCT_NAME === `"${targetName}"`) {
        const settings = configurations[key].buildSettings

        settings.CODE_SIGN_ENTITLEMENTS = `${targetName}/${targetName}.entitlements`
        settings.CODE_SIGN_STYLE = 'Automatic'
      }
    }

    return config
  })
}

function withProjectFiles (config, opts = {}) {
  const {
    targetName = defaults.targetName,
    worklet
  } = opts

  return withDangerousMod(config, ['ios', async (config) => {
    const dest = path.join(config.modRequest.platformProjectRoot, targetName)

    await fs.mkdir(dest, { recursive: true })

    await addFileIfNotExists(path.join(dest, 'NotificationService.h'),
      '#import <BareKit/BareKit.h>\n' +
      '\n' +
      '@interface NotificationService : BareNotificationService \n' +
      '\n' +
      '@end\n'
    )

    await addFileIfNotExists(path.join(dest, 'NotificationService.m'),
      '#import "NotificationService.h"\n' +
      '\n' +
      '@implementation NotificationService\n' +
      '\n' +
      '- (instancetype)init {\n' +
      `  return [super initWithResource:@"${path.basename(worklet, path.extname(worklet))}" ofType:@"${path.extname(worklet).substring(1)}" inBundle:[NSBundle mainBundle]];\n` +
      '}\n' +
      '\n' +
      '@end\n'
    )

    await addFileIfNotExists(path.join(dest, `${targetName}-Info.plist`),
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
      '    <string>NotificationService</string>\n' +
      '  </dict>\n' +
      '</dict>\n' +
      '</plist>\n'
    )

    await addFileIfNotExists(path.join(dest, `${targetName}.entitlements`),
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
  }])
}

async function addFileIfNotExists (dest, contents) {
  try {
    await fs.access(dest)
  } catch {
    await fs.writeFile(dest, contents)
  }
}
