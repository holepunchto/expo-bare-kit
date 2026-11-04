const fs = require('fs')
const path = require('path')
const { fileURLToPath, pathToFileURL } = require('url')
const { getConfig } = require('expo/config')
const Bundle = require('bare-bundle')
const stow = require('bare-stow')
const target = require('bare-stow-target-react-native')
const workers = require('./plugin/workers')

const prefix = 'expo-bare-kit/workers/'

// Packs the workers listed in the options of the plugin before Metro starts,
// and again whenever a module of one of them changes, so that the application
// can import them as `expo-bare-kit/workers/<name>`.
module.exports = async function withBareKit(config) {
  const { projectRoot } = config

  const out = path.join(projectRoot, '.expo', 'bare-kit')

  const packed = new Map()

  for (const { entry, options } of workers(pluginOptions(projectRoot))) {
    const worker = new Worker(projectRoot, entry, options, out)

    packed.set(worker.name, worker)
  }

  await Promise.all([...packed.values()].map((worker) => worker.pack()))

  const upstream = config.resolver?.resolveRequest

  return {
    ...config,
    resolver: {
      ...config.resolver,
      resolveRequest(context, moduleName, platform) {
        const resolve = upstream ?? context.resolveRequest

        if (moduleName.startsWith(prefix)) {
          const worker = packed.get(moduleName.slice(prefix.length))

          if (worker) return { type: 'sourceFile', filePath: worker.harness }
        }

        // The harnesses import the dependencies of this package, which the
        // application need not depend on itself.
        if (isBare(moduleName) && context.originModulePath.startsWith(out + path.sep)) {
          return resolve({ ...context, originModulePath: __filename }, moduleName, platform)
        }

        return resolve(context, moduleName, platform)
      }
    }
  }
}

class Worker {
  constructor(projectRoot, entry, options, out) {
    this.entry = path.resolve(projectRoot, entry)
    this.options = options

    const relative = path.relative(projectRoot, this.entry)

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Worker '${entry}' is outside the project`)
    }

    this.name = relative
      .split(path.sep)
      .join('/')
      .replace(/\.[^./]+$/, '')
    this.out = path.join(out, ...this.name.split('/'))
    this.harness = path.join(this.out, 'index.js')

    this._watcher = null
    this._base = null
    this._sources = new Set()
    this._timer = null
    this._packing = null
    this._stale = false
  }

  async pack() {
    let bundle = null

    for await (const artifact of stow(
      pathToFileURL(this.entry),
      target,
      pathToFileURL(this.out),
      this.options
    )) {
      if (artifact.base) bundle = artifact
    }

    this._sources = sources(bundle)
    this._watch(fileURLToPath(bundle.base))
  }

  // On macOS, the watchers of a process share one event stream with those of
  // Metro, which drops events while it's reconfigured. Watching the base of the
  // bundle keeps the watcher in place as long as the base doesn't move.
  _watch(base) {
    if (base === this._base) return

    if (this._watcher) this._watcher.close()

    this._base = base

    this._watcher = fs.watch(base, { recursive: true, persistent: false }, (event, name) => {
      if (name === null || this._sources.has(path.join(base, name))) this._schedule()
    })

    this._watcher.on('error', () => {})
  }

  // Saving a file may fire several events, which are batched into one pack.
  _schedule() {
    clearTimeout(this._timer)

    this._timer = setTimeout(() => this._update(), 50)
  }

  _update() {
    if (this._packing) {
      this._stale = true
      return
    }

    this._packing = this.pack()
      .catch((err) => {
        console.error(`Worker '${this.name}' could not be packed:`, err)
      })
      .finally(() => {
        this._packing = null

        if (this._stale) {
          this._stale = false
          this._update()
        }
      })
  }
}

// The plugin records its options in the config, which also covers plugins that
// apply it with options of their own.
function pluginOptions(projectRoot) {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true })

  const opts = exp._internal?.['expo-bare-kit']

  if (opts === undefined) throw new Error("Plugin 'expo-bare-kit' is not configured")

  return opts
}

function sources({ url, base }) {
  const source = fs.readFileSync(url, 'utf8')

  const bundle = Bundle.from(JSON.parse(source.replace(/^export default /, '')))

  return new Set([...bundle.keys()].map((key) => fileURLToPath(new URL('.' + key, base))))
}

function isBare(specifier) {
  return !specifier.startsWith('.') && !path.isAbsolute(specifier)
}
