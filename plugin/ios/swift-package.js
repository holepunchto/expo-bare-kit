// Links the product of the local Swift package at `relativePath` into the
// target. Xcode embeds its frameworks in the application, which its extensions
// then load them from, so the application target must link it too.
module.exports = function addSwiftPackage(project, target, relativePath, product) {
  const objects = project.hash.project.objects

  const pbxTarget = objects.PBXNativeTarget[target]

  if (!pbxTarget) throw new Error(`Unknown target '${target}'`)

  objects.XCLocalSwiftPackageReference = objects.XCLocalSwiftPackageReference || {}
  objects.XCSwiftPackageProductDependency = objects.XCSwiftPackageProductDependency || {}

  const pkg = findOrAddPackage(project, objects, relativePath)
  const comment = `XCLocalSwiftPackageReference "${relativePath}"`

  pbxTarget.packageProductDependencies = pbxTarget.packageProductDependencies || []

  const linked = pbxTarget.packageProductDependencies.some(({ value }) => {
    const dependency = objects.XCSwiftPackageProductDependency[value]

    return dependency && dependency.package === pkg && dependency.productName === product
  })

  if (linked) return

  const dependency = project.generateUuid()

  objects.XCSwiftPackageProductDependency[dependency] = {
    isa: 'XCSwiftPackageProductDependency',
    package: pkg,
    package_comment: comment,
    productName: product
  }
  objects.XCSwiftPackageProductDependency[`${dependency}_comment`] = product

  pbxTarget.packageProductDependencies.push({ value: dependency, comment: product })

  const file = project.generateUuid()

  objects.PBXBuildFile[file] = {
    isa: 'PBXBuildFile',
    productRef: dependency,
    productRef_comment: product
  }
  objects.PBXBuildFile[`${file}_comment`] = `${product} in Frameworks`

  const phase = project.pbxFrameworksBuildPhaseObj(target)

  if (!phase) throw new Error(`Target '${pbxTarget.name}' has no Frameworks build phase`)

  phase.files.push({ value: file, comment: `${product} in Frameworks` })
}

function findOrAddPackage(project, objects, relativePath) {
  for (const [key, value] of Object.entries(objects.XCLocalSwiftPackageReference)) {
    if (typeof value === 'object' && unquote(value.relativePath) === relativePath) return key
  }

  const pkg = project.generateUuid()
  const comment = `XCLocalSwiftPackageReference "${relativePath}"`

  objects.XCLocalSwiftPackageReference[pkg] = {
    isa: 'XCLocalSwiftPackageReference',
    relativePath: `"${relativePath}"`
  }
  objects.XCLocalSwiftPackageReference[`${pkg}_comment`] = comment

  const root = project.getFirstProject().firstProject

  root.packageReferences = root.packageReferences || []
  root.packageReferences.push({ value: pkg, comment })

  return pkg
}

function unquote(value) {
  return typeof value === 'string' ? value.replace(/^"|"$/g, '') : value
}
