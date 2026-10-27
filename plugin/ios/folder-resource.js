const path = require('path')

// Copies the folder at `relativePath` into the bundle of the target as is.
module.exports = function addFolderResource(project, target, relativePath) {
  const objects = project.hash.project.objects

  for (const value of Object.values(objects.PBXFileReference)) {
    if (typeof value === 'object' && unquote(value.path) === relativePath) return
  }

  const name = path.posix.basename(relativePath)

  const file = project.generateUuid()

  objects.PBXFileReference[file] = {
    isa: 'PBXFileReference',
    lastKnownFileType: 'folder',
    name: `"${name}"`,
    path: `"${relativePath}"`,
    sourceTree: '"<group>"'
  }
  objects.PBXFileReference[`${file}_comment`] = name

  const group = project.getFirstProject().firstProject.mainGroup

  objects.PBXGroup[group].children.push({ value: file, comment: name })

  const build = project.generateUuid()

  objects.PBXBuildFile[build] = { isa: 'PBXBuildFile', fileRef: file, fileRef_comment: name }
  objects.PBXBuildFile[`${build}_comment`] = `${name} in Resources`

  const phase = project.pbxResourcesBuildPhaseObj(target)

  if (!phase) throw new Error(`Target '${target}' has no Resources build phase`)

  phase.files.push({ value: build, comment: `${name} in Resources` })
}

function unquote(value) {
  return typeof value === 'string' ? value.replace(/^"|"$/g, '') : value
}
