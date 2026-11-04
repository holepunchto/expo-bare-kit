const path = require('path')
const { pathToFileURL } = require('url')
const stow = require('bare-stow')

// Links the addons of the workers of the application into a package of the
// native project, along with Bare Kit itself.
exports.link = async function link(config, opts) {
  let { workers, language, languageOptions, hosts, out } = opts

  workers = workers.map((worker) => narrow(config, worker)).filter(isStowed)

  if (workers.length === 0) {
    throw new Error(`No worker is stowed for platform '${config.modRequest.platform}'`)
  }

  const entries = workers.map((worker) => entry(config, worker))

  for await (const _ of stow.link(entries, 'bare-kit', pathToFileURL(out), {
    hosts,
    ...shared(workers),
    language,
    languageOptions
  })) {
    //
  }
}

exports.resources = stow.resources

// Stows a worker started by native code, such as a notification extension,
// leaving its addons to `link()`.
exports.pack = async function pack(config, opts) {
  let { worker, language, languageOptions, hosts, out } = opts

  worker = narrow(config, worker)

  if (!isStowed(worker)) {
    throw new Error(
      `Worker '${worker.entry}' handles notifications on platform '${config.modRequest.platform}' but is not stowed for it`
    )
  }

  for await (const _ of stow(entry(config, worker), 'bare-kit', pathToFileURL(out), {
    hosts,
    ...worker.options,
    language,
    languageOptions,
    targetOptions: { linking: 'app' }
  })) {
    //
  }
}

function entry(config, worker) {
  return pathToFileURL(path.resolve(config.modRequest.projectRoot, worker.entry))
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
function shared(workers) {
  const [first, ...rest] = workers

  const options = {}

  for (const option of ['imports', 'defer']) {
    const value = first.options[option]

    for (const worker of rest) {
      if (JSON.stringify(worker.options[option]) !== JSON.stringify(value)) {
        throw new Error(
          `Workers '${first.entry}' and '${worker.entry}' must agree on option '${option}' to be linked together`
        )
      }
    }

    if (value !== undefined) options[option] = value
  }

  if (workers.some((worker) => !worker.options.hosts)) return options

  return { ...options, hosts: [...new Set(workers.flatMap((worker) => worker.options.hosts))] }
}
