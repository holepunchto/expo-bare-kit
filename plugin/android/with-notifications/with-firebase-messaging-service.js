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

      const dest = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        packagePath
      )

      await fs.mkdir(dest, { recursive: true })

      const source =
        `package ${packageName}\n` +
        '\n' +
        'import android.app.NotificationChannel\n' +
        'import android.app.NotificationManager\n' +
        'import android.os.Build\n' +
        'import android.util.Log\n' +
        'import androidx.core.app.NotificationCompat\n' +
        'import org.json.JSONObject\n' +
        'import to.holepunch.bare.kit.MessagingService\n' +
        '\n' +
        `class ${serviceName} : MessagingService() {\n` +
        '  override fun onCreate() {\n' +
        '    super.onCreate()\n' +
        '\n' +
        '    val manager = getSystemService(NotificationManager::class.java)\n' +
        '\n' +
        '    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {\n' +
        '      val channel = NotificationChannel(\n' +
        `        "${channelId}",\n` +
        `        "${channelName}",\n` +
        '        NotificationManager.IMPORTANCE_DEFAULT\n' +
        '      )\n' +
        '\n' +
        '      manager.createNotificationChannel(channel)\n' +
        '    }\n' +
        '\n' +
        `    start("${worklet}")\n` +
        '  }\n' +
        '\n' +
        '  override fun onWorkletReply(reply: ByteArray) {\n' +
        '    val response = JSONObject(String(reply))\n' +
        '\n' +
        '    val notification = NotificationCompat.Builder(this, ' +
        `"${channelId}")\n` +
        '      .setSmallIcon(android.R.drawable.ic_dialog_info)\n' +
        '      .setContentTitle(response.getString("title"))\n' +
        '      .setContentText(response.getString("body"))\n' +
        '      .setPriority(NotificationCompat.PRIORITY_DEFAULT)\n' +
        '      .build()\n' +
        '\n' +
        '    val manager = getSystemService(NotificationManager::class.java)\n' +
        '\n' +
        '    manager.notify(System.currentTimeMillis().toInt(), notification)\n' +
        '  }\n' +
        '\n' +
        '  override fun onNewToken(token: String) {\n' +
        `    Log.d("${serviceName}", "New token: ${'$'}token")\n` +
        '  }\n' +
        '}\n'

      await addFileIfNotExists(path.join(dest, `${serviceName}.kt`), source)

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
