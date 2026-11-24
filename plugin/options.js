const workers = require('./workers')

const key = 'expo-bare-kit'

const engines = {
  ios: ['v8', 'javascriptcore'],
  android: ['v8', 'quickjs']
}

// The plugin may be applied more than once, such as by the application and by
// another plugin, so it records the options of every application merged in the
// config. The mods read them back once they run, after every application, and
// Metro reads them in a process of its own, which evaluates the plugins of the
// project.
exports.recorded = function recorded(config) {
  return config._internal?.[key]
}

exports.record = function record(config, opts = {}) {
  config._internal = { ...config._internal, [key]: merge(exports.recorded(config), opts) }
}

exports.engine = function engine(config, platform) {
  return exports.recorded(config)[platform].engine ?? 'v8'
}

// The workers whose addons are linked, which include those handling
// notifications.
exports.linked = function linked(config) {
  const opts = exports.recorded(config)

  const linked = workers(opts)

  for (const platform of Object.keys(engines)) {
    const worker = opts[platform].notifications?.worker

    if (worker !== undefined && !workers.find(linked, worker)) {
      linked.push({ entry: worker, options: {} })
    }
  }

  return linked
}

exports.notifications = function notifications(config, platform) {
  const opts = exports.recorded(config)[platform].notifications

  return { ...opts, worker: workers.find(exports.linked(config), opts.worker) }
}

exports.isEnabled = isEnabled

function merge(recorded = { workers: [], ios: {}, android: {} }, opts) {
  const merged = { workers: [...recorded.workers] }

  const listed = workers({ workers: merged.workers })

  for (const worker of workers(opts)) {
    const existing = workers.find(listed, worker.entry)

    if (existing === undefined) {
      listed.push(worker)
      merged.workers.push([worker.entry, worker.options])
    } else if (JSON.stringify(existing.options) !== JSON.stringify(worker.options)) {
      throw new Error(`Worker '${worker.entry}' is listed more than once with different options`)
    }
  }

  for (const platform of Object.keys(engines)) {
    merged[platform] = mergePlatform(platform, recorded[platform], opts[platform] ?? {})
  }

  return merged
}

function mergePlatform(platform, recorded, opts) {
  let { engine = recorded.engine, notifications } = opts

  if (engine !== undefined && !engines[platform].includes(engine)) {
    const supported = engines[platform].map((name) => `'${name}'`)

    throw new Error(
      `Option '${platform}.engine' must be ${supported.join(' or ')}, got '${engine}'`
    )
  }

  if (recorded.engine !== undefined && engine !== recorded.engine) {
    throw new Error(
      `Option '${platform}.engine' is given as both '${recorded.engine}' and '${engine}'`
    )
  }

  if (isEnabled(notifications)) {
    if (typeof notifications.worker !== 'string') {
      throw new Error(
        `Option '${platform}.notifications.worker' must name the entry point of the notification worker`
      )
    }

    if (
      isEnabled(recorded.notifications) &&
      JSON.stringify(recorded.notifications) !== JSON.stringify(notifications)
    ) {
      throw new Error(`Option '${platform}.notifications' is given more than once`)
    }
  } else {
    notifications = recorded.notifications
  }

  return { engine, notifications }
}

function isEnabled(notifications) {
  return typeof notifications === 'object' && notifications !== null
}
