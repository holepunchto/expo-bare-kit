const fs = require('fs').promises
const path = require('path')
const { withDangerousMod } = require('@expo/config-plugins')
const { pack } = require('../../stow')
const defaults = require('../../defaults').android.notifications

module.exports = function withFirebaseMessagingService(config, opts = {}) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const { worker, channelId = defaults.channelId, channelName = defaults.channelName } = opts

      const serviceName = 'MessagingService'

      const packageName = config.android.package
      const packagePath = packageName.replace(/\./g, '/')

      await pack(config, {
        worker,
        language: 'kotlin',
        languageOptions: { package: `${packageName}.push` },
        out: path.join(config.modRequest.platformProjectRoot, defaults.worker)
      })

      const javaDest = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        packagePath
      )

      await fs.mkdir(javaDest, { recursive: true })

      const source =
        `package ${packageName}\n` +
        '\n' +
        'import android.app.Notification\n' +
        'import android.app.NotificationChannel\n' +
        'import android.app.NotificationManager\n' +
        'import android.util.Log\n' +
        'import com.google.firebase.messaging.FirebaseMessagingService\n' +
        'import com.google.firebase.messaging.RemoteMessage\n' +
        'import kotlin.time.Duration.Companion.seconds\n' +
        'import kotlinx.coroutines.flow.firstOrNull\n' +
        'import kotlinx.coroutines.runBlocking\n' +
        'import kotlinx.coroutines.withTimeoutOrNull\n' +
        'import org.json.JSONObject\n' +
        `import ${packageName}.push.start\n` +
        '\n' +
        `class ${serviceName} : FirebaseMessagingService() {\n` +
        '  private lateinit var notificationManager: NotificationManager\n' +
        '\n' +
        '  override fun onCreate() {\n' +
        '    super.onCreate()\n' +
        '\n' +
        '    notificationManager = getSystemService(NotificationManager::class.java)\n' +
        '\n' +
        '    notificationManager.createNotificationChannel(\n' +
        '      NotificationChannel(\n' +
        `        "${channelId}",\n` +
        `        "${channelName}",\n` +
        '        NotificationManager.IMPORTANCE_DEFAULT,\n' +
        '      )\n' +
        '    )\n' +
        '  }\n' +
        '\n' +
        '  override fun onMessageReceived(message: RemoteMessage) {\n' +
        '    val reply =\n' +
        '      runBlocking { withTimeoutOrNull(15.seconds) { reply(JSONObject(message.data as Map<*, *>)) } }\n' +
        '        ?: return\n' +
        '\n' +
        '    notificationManager.notify(\n' +
        '      System.currentTimeMillis().toInt(),\n' +
        `      Notification.Builder(this, "${channelId}")\n` +
        '        .setSmallIcon(android.R.drawable.ic_dialog_info)\n' +
        '        .setContentTitle(reply.optString("title", "Notification"))\n' +
        '        .setContentText(reply.optString("body", ""))\n' +
        '        .setAutoCancel(true)\n' +
        '        .build(),\n' +
        '    )\n' +
        '  }\n' +
        '\n' +
        '  override fun onNewToken(token: String) {\n' +
        `    Log.v("${serviceName}", "Token: ${'$'}token")\n` +
        '  }\n' +
        '\n' +
        '  private suspend fun reply(payload: JSONObject): JSONObject? {\n' +
        '    val started = start(this)\n' +
        '\n' +
        '    try {\n' +
        '      started.ipc.write(payload.toString().encodeToByteArray())\n' +
        '\n' +
        '      return started.ipc.data.firstOrNull()?.let { JSONObject(it.decodeToString()) }\n' +
        '    } finally {\n' +
        '      started.ipc.terminate()\n' +
        '    }\n' +
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
