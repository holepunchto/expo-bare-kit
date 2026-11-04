const path = require('path')

const stowOptions = ['imports', 'defer', 'hosts']

// Lists the workers in the options of the plugin as `{ entry, options }`. A
// worker is given as its entry point, or as a pair of its entry point and the
// options it's stowed with.
module.exports = exports = function workers(opts = {}) {
  const { workers } = opts

  if (!Array.isArray(workers) || workers.length === 0) {
    throw new Error("Option 'workers' must list the entry points of the workers")
  }

  return workers.map(worker)
}

exports.find = function find(workers, entry) {
  return workers.find((worker) => path.normalize(worker.entry) === path.normalize(entry))
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
