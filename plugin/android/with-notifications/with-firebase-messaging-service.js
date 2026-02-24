const fs = require('fs').promises
const path = require('path')
const { withDangerousMod } = require('@expo/config-plugins')
const defaults = require('../../defaults').android.notifications

module.exports = function withFirebaseMessagingService(config, opts = {}) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const {
        worklet,
        channelId = defaults.channelId,
        channelName = defaults.channelName,
        serviceName = defaults.serviceName
      } = opts

      const packageName = config.android.package
      const packagePath = packageName.replace(/\./g, '/')
      const workletBasename = path.basename(worklet)

      const javaDest = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        packagePath
      )

      const assetsDest = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'assets'
      )

      await fs.mkdir(javaDest, { recursive: true })
      await fs.mkdir(assetsDest, { recursive: true })

      // Copy the worklet bundle into android assets
      const workletSrc = path.resolve(config.modRequest.projectRoot, worklet)

      await fs.copyFile(workletSrc, path.join(assetsDest, workletBasename))

      const source =
        `package ${packageName}\n` +
        '\n' +
        'import android.app.Notification\n' +
        'import android.app.NotificationChannel\n' +
        'import android.app.NotificationManager\n' +
        'import android.util.Log\n' +
        'import org.json.JSONObject\n' +
        'import to.holepunch.bare.kit.Worklet\n' +
        'import to.holepunch.bare.kit.MessagingService as BaseMessagingService\n' +
        '\n' +
        `class ${serviceName} : BaseMessagingService(Worklet.Options()) {\n` +
        '  private var notificationManager: NotificationManager? = null\n' +
        '\n' +
        '  override fun onCreate() {\n' +
        '    super.onCreate()\n' +
        '\n' +
        '    notificationManager = getSystemService(NotificationManager::class.java)\n' +
        '\n' +
        '    notificationManager!!.createNotificationChannel(\n' +
        '      NotificationChannel(\n' +
        `        "${channelId}",\n` +
        `        "${channelName}",\n` +
        '        NotificationManager.IMPORTANCE_DEFAULT\n' +
        '      )\n' +
        '    )\n' +
        '\n' +
        '    try {\n' +
        `      this.start("/${workletBasename}", assets.open("${workletBasename}"), null)\n` +
        '    } catch (e: Exception) {\n' +
        '      throw RuntimeException(e)\n' +
        '    }\n' +
        '  }\n' +
        '\n' +
        '  override fun onWorkletReply(reply: JSONObject) {\n' +
        '    try {\n' +
        '      notificationManager!!.notify(\n' +
        '        System.currentTimeMillis().toInt(),\n' +
        `        Notification.Builder(this, "${channelId}")\n` +
        '          .setSmallIcon(android.R.drawable.ic_dialog_info)\n' +
        '          .setContentTitle(reply.optString("title", "Notification"))\n' +
        '          .setContentText(reply.optString("body", ""))\n' +
        '          .setAutoCancel(true)\n' +
        '          .build()\n' +
        '      )\n' +
        '    } catch (e: Exception) {\n' +
        '      throw RuntimeException(e)\n' +
        '    }\n' +
        '  }\n' +
        '\n' +
        '  override fun onNewToken(token: String) {\n' +
        `    Log.v("${serviceName}", "Token: ${'$'}token")\n` +
        '  }\n' +
        '}\n'

      await addFileIfNotExists(path.join(javaDest, `${serviceName}.kt`), source)

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
