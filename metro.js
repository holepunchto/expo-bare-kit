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

  for (const entry of workers(options(projectRoot))) {
    const worker = new Worker(projectRoot, entry, out)

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
  constructor(projectRoot, entry, out) {
    this.entry = path.resolve(projectRoot, entry)

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

    this._watchers = []
    this._timer = null
    this._packing = null
    this._stale = false
  }

  async pack() {
    let bundle = null

    for await (const artifact of stow(pathToFileURL(this.entry), target, pathToFileURL(this.out))) {
      if (artifact.base) bundle = artifact
    }

    this._watch(sources(bundle))
  }

  _watch(files) {
    for (const watcher of this._watchers) watcher.close()

    this._watchers = []

    const dirs = new Map()

    for (const file of files) {
      const dir = path.dirname(file)

      if (!dirs.has(dir)) dirs.set(dir, new Set())

      dirs.get(dir).add(path.basename(file))
    }

    for (const [dir, names] of dirs) {
      let watcher

      try {
        watcher = fs.watch(dir, { persistent: false }, (event, name) => {
          if (name === null || names.has(name)) this._schedule()
        })
      } catch {
        continue
      }

      watcher.on('error', () => {})

      this._watchers.push(watcher)
    }
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

function options(projectRoot) {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true })

  for (const plugin of exp.plugins ?? []) {
    const [name, opts = {}] = Array.isArray(plugin) ? plugin : [plugin]

    if (name === 'expo-bare-kit') return opts
  }

  throw new Error("Plugin 'expo-bare-kit' is not configured")
}

function sources({ url, base }) {
  const source = fs.readFileSync(url, 'utf8')

  const bundle = Bundle.from(JSON.parse(source.replace(/^export default /, '')))

  return [...bundle.keys()].map((key) => fileURLToPath(new URL('.' + key, base)))
}

function isBare(specifier) {
  return !specifier.startsWith('.') && !path.isAbsolute(specifier)
}
