const { pathToFileURL } = require('url')
const stow = require('bare-stow')
const options = require('./options')
const workers = require('./workers')

// Links the addons of the workers of the application into a package of the
// native project, along with Bare Kit itself.
exports.link = async function link(config, opts) {
  const { language, languageOptions, hosts, out } = opts
  const { platform } = config.modRequest

  const linked = options
    .linked(config)
    .map((worker) => narrow(config, worker))
    .filter(isStowed)

  if (linked.length === 0) {
    throw new Error(`No worker is stowed for platform '${platform}'`)
  }

  const entries = linked.map((worker) => entry(config, worker))

  for await (const _ of stow.link(entries, 'bare-kit', pathToFileURL(out), {
    hosts,
    ...shared(linked),
    language,
    languageOptions,
    targetOptions: { engine: options.engine(config, platform) }
  })) {
    //
  }
}

exports.resources = stow.resources

// Stows the worker handling notifications, which native code starts, leaving
// its addons to `link()`.
exports.pack = async function pack(config, opts) {
  const { language, languageOptions, hosts, out } = opts
  const { platform } = config.modRequest

  const worker = narrow(config, options.notifications(config, platform).worker)

  if (!isStowed(worker)) {
    throw new Error(
      `Worker '${worker.entry}' handles notifications on platform '${platform}' but is not stowed for it`
    )
  }

  for await (const _ of stow(entry(config, worker), 'bare-kit', pathToFileURL(out), {
    hosts,
    ...worker.options,
    language,
    languageOptions,
    targetOptions: { linking: 'app', engine: options.engine(config, platform) }
  })) {
    //
  }
}

function entry(config, worker) {
  return pathToFileURL(workers.resolve(config.modRequest.projectRoot, worker.entry).filename)
}

// The hosts of a worker span the platforms, of which the native project builds
// one.
function narrow(config, worker) {
  const { platform } = config.modRequest
  const { hosts } = worker.options

  if (!hosts) return worker

  return {
    ...worker,
    options: { ...worker.options, hosts: hosts.filter((host) => host.startsWith(platform + '-')) }
  }
}

function isStowed(worker) {
  return worker.options.hosts?.length !== 0
}

// The graphs of the workers are linked in one traversal, so the options shaping
// it must agree. Linking addons for more hosts than a worker needs is harmless,
// so the hosts are combined instead.
function shared(linked) {
  const [first, ...rest] = linked

  const agreed = {}

  for (const option of ['imports', 'defer']) {
    const value = first.options[option]

    for (const worker of rest) {
      if (JSON.stringify(worker.options[option]) !== JSON.stringify(value)) {
        throw new Error(
          `Workers '${first.entry}' and '${worker.entry}' must agree on option '${option}' to be linked together`
        )
      }
    }

    if (value !== undefined) agreed[option] = value
  }

  if (linked.some((worker) => !worker.options.hosts)) return agreed

  return { ...agreed, hosts: [...new Set(linked.flatMap((worker) => worker.options.hosts))] }
}
