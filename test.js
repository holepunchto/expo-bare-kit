const fs = require('fs')
const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')
const test = require('brittle')
const tmp = require('test-tmp')
const Bundle = require('bare-bundle')
const { getConfig } = require('expo/config')
const { compileModsAsync } = require('@expo/config-plugins')

const worker = "require('bare-os')\n"

test('metro packs each worker for its own hosts', async (t) => {
  const root = await project(t, {
    'app.json': app([
      [
        'expo-bare-kit',
        {
          workers: [['narrow.js', { hosts: ['ios-arm64'] }], 'wide.js']
        }
      ]
    ]),
    'narrow.js': worker,
    'wide.js': worker
  })

  await metro(root)

  t.is(typeof addon(root, 'narrow'), 'string')
  t.alike(Object.keys(addon(root, 'wide')), ['ios', 'android'])
})

test('prebuild links the addons of the workers for the hosts they combine', async (t) => {
  const root = await project(t, {
    'app.json': app([
      [
        'expo-bare-kit',
        {
          workers: [
            ['a.js', { hosts: ['ios-arm64', 'android-arm64'] }],
            ['b.js', { hosts: ['android-x64'] }]
          ]
        }
      ]
    ]),
    'a.js': worker,
    'b.js': worker
  })

  await prebuild(root)

  t.alike(linked(root), ['arm64-v8a', 'x86_64'])
})

test('prebuild leaves out the workers not stowed for the platform', async (t) => {
  const root = await project(t, {
    'app.json': app([
      [
        'expo-bare-kit',
        {
          workers: [['ios.js', { hosts: ['ios-arm64'] }], 'core.js']
        }
      ]
    ]),
    'ios.js': worker,
    'core.js': 'module.exports = function start() {}\n'
  })

  await prebuild(root)

  t.alike(linked(root), [])
})

test('prebuild links the addons of the workers with their imports', async (t) => {
  const root = await project(t, {
    'app.json': app([
      ['expo-bare-kit', { workers: [['core.js', { imports: { os: 'bare-os' } }]] }]
    ]),
    'core.js': "require('os')\n"
  })

  await prebuild(root)

  t.alike(linked(root), ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'])
})

test('prebuild rejects workers linked with different imports', async (t) => {
  const root = await project(t, {
    'app.json': app([
      [
        'expo-bare-kit',
        {
          workers: [['a.js', { imports: { os: 'bare-os' } }], 'b.js']
        }
      ]
    ]),
    'a.js': worker,
    'b.js': worker
  })

  await t.exception(prebuild(root), /Workers 'a\.js' and 'b\.js' must agree on option 'imports'/)
})

test('another plugin can apply the plugin with its own options', async (t) => {
  const root = await project(t, {
    'app.json': app(['./with-app.js']),
    'with-app.js':
      "const { withPlugins } = require('expo/config-plugins')\n" +
      '\n' +
      'module.exports = (config) =>\n' +
      "  withPlugins(config, [['expo-bare-kit', { workers: [['core.js', { hosts: ['android-arm64'] }]] }]])\n",
    'core.js': worker
  })

  await metro(root)

  t.is(typeof addon(root, 'core'), 'string')

  await prebuild(root)

  t.alike(linked(root), ['arm64-v8a'])
})

test('plugin rejects unknown options of a worker', async (t) => {
  const root = await project(t, {
    'app.json': app([['expo-bare-kit', { workers: [['core.js', { linked: true }]] }]]),
    'core.js': worker
  })

  await t.exception(prebuild(root), /Unknown option 'linked' for worker 'core\.js'/)
})

function app(plugins) {
  return JSON.stringify({
    expo: {
      name: 'app',
      slug: 'app',
      android: { package: 'com.example.app' },
      plugins
    }
  })
}

// Builds an application in a temporary directory, with a skeleton of the
// Android project for the mods of the plugin to change.
async function project(t, files) {
  // The projects link the modules of this package, which on Windows must be on
  // the same drive for the modules of a worker to share a base. Under
  // `node_modules`, they're also left out of coverage, which would otherwise
  // read them after they're removed.
  const root = await tmp(t, { dir: path.join(__dirname, 'node_modules', '.tmp') })

  files = {
    'package.json': JSON.stringify({ name: 'app', version: '1.0.0' }),
    'android/settings.gradle': "rootProject.name = 'app'\n",
    'android/build.gradle': 'allprojects {\n  repositories {\n  }\n}\n',
    'android/app/build.gradle': 'dependencies {\n}\n',
    'android/gradle.properties': '',
    ...files
  }

  for (const [name, source] of Object.entries(files)) {
    await fs.promises.mkdir(path.dirname(path.join(root, name)), { recursive: true })
    await fs.promises.writeFile(path.join(root, name), source)
  }

  await fs.promises.mkdir(path.join(root, 'node_modules'))

  for (const name of ['bare-os', 'bare-stow-runtime', 'expo']) {
    await fs.promises.symlink(
      path.join(__dirname, 'node_modules', name),
      path.join(root, 'node_modules', name)
    )
  }

  await fs.promises.symlink(__dirname, path.join(root, 'node_modules', 'expo-bare-kit'))

  return root
}

// Metro configures the workers in a process of its own, which keeps watching
// them until it exits.
async function metro(root) {
  await promisify(execFile)(
    process.execPath,
    ['-e', "require('expo-bare-kit/metro')({ projectRoot: process.cwd() })"],
    { cwd: root }
  )
}

async function prebuild(root) {
  const { exp } = getConfig(root, { skipSDKVersionRequirement: true, isModdedConfig: true })

  await compileModsAsync(exp, { projectRoot: root, platforms: ['android'] })
}

function addon(root, name) {
  const source = fs.readFileSync(path.join(root, '.expo', 'bare-kit', name, 'index.bundle.mjs'))

  const bundle = Bundle.from(JSON.parse(source.toString().replace(/^export default /, '')))

  for (const imports of Object.values(bundle.resolutions)) {
    if (imports['.']?.addon) return imports['.'].addon
  }

  return null
}

function linked(root) {
  const dir = path.join(root, 'android', 'bare-kit-addons', 'src', 'main', 'addons')

  return fs.existsSync(dir) ? fs.readdirSync(dir).sort() : []
}
