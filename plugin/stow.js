const path = require('path')
const { pathToFileURL } = require('url')
const stow = require('bare-stow')

// Links the addons of the workers of the application into a package of the
// native project, along with Bare Kit itself.
exports.link = async function link(config, opts) {
  const { workers, language, languageOptions, hosts, out } = opts

  const entries = workers.map((worker) => entry(config, worker))

  for await (const _ of stow.link(entries, 'bare-kit', pathToFileURL(out), {
    language,
    languageOptions,
    hosts
  })) {
    //
  }
}

exports.resources = stow.resources

// Stows a worker started by native code, such as a notification extension,
// leaving its addons to `link()`.
exports.pack = async function pack(config, opts) {
  const { worker, language, languageOptions, hosts, out } = opts

  for await (const _ of stow(entry(config, worker), 'bare-kit', pathToFileURL(out), {
    language,
    languageOptions,
    targetOptions: { linking: 'app' },
    hosts
  })) {
    //
  }
}

function entry(config, worker) {
  return pathToFileURL(path.resolve(config.modRequest.projectRoot, worker))
}
