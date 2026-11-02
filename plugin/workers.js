module.exports = function workers(opts = {}) {
  const { workers } = opts

  if (!Array.isArray(workers) || workers.length === 0) {
    throw new Error("Option 'workers' must list the entry points of the workers")
  }

  return workers
}
