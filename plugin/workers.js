const fs = require('fs')
const path = require('path')

const stowOptions = ['imports', 'defer', 'hosts']

// Lists the workers in the options of the plugin as `{ entry, options }`. A
// worker is given as its entry point, or as a pair of its entry point and the
// options it's stowed with.
module.exports = exports = function workers(opts = {}) {
  const { workers = [] } = opts

  if (!Array.isArray(workers)) {
    throw new Error("Option 'workers' must list the entry points of the workers")
  }

  return workers.map(worker)
}

exports.find = function find(workers, entry) {
  return workers.find((worker) => path.normalize(worker.entry) === path.normalize(entry))
}

// Resolves the entry point of a worker to its file and the name it's imported
// by. An entry point is a path relative to the project or, if no such file
// exists, a module specifier resolved from the project.
exports.resolve = function resolve(projectRoot, entry) {
  const filename = path.resolve(projectRoot, entry)

  if (isPath(entry) || fs.existsSync(filename)) {
    const relative = path.relative(projectRoot, filename)

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Worker '${entry}' is outside the project`)
    }

    return { filename, name: name(relative.split(path.sep).join('/')) }
  }

  try {
    return { filename: require.resolve(entry, { paths: [projectRoot] }), name: name(entry) }
  } catch (err) {
    throw new Error(`Worker '${entry}' could not be resolved from the project`, { cause: err })
  }
}

function worker(item) {
  const [entry, options = {}] = Array.isArray(item) ? item : [item]

  if (typeof entry !== 'string') {
    throw new Error('A worker must be an entry point or a pair of an entry point and its options')
  }

  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new Error(`The options of worker '${entry}' must be an object`)
  }

  for (const option of Object.keys(options)) {
    if (!stowOptions.includes(option)) {
      throw new Error(`Unknown option '${option}' for worker '${entry}'`)
    }
  }

  return { entry, options }
}

function isPath(entry) {
  return /^\.\.?([/\\]|$)/.test(entry) || path.isAbsolute(entry)
}

function name(entry) {
  return entry.replace(/\.[^./]+$/, '')
}
