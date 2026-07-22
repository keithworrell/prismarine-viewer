const path = require('path')
const { makeTextureAtlas } = require('./lib/atlas')
const { prepareBlocksStates } = require('./lib/modelsBuilder')
const { applyAssetOverrides } = require('./lib/assetOverrides')
const mcAssets = require('minecraft-assets')
const fs = require('fs-extra')
const crypto = require('crypto')

const texturesPath = path.resolve(__dirname, '../public/textures')
fs.mkdirSync(texturesPath, { recursive: true })

const blockStatesPath = path.resolve(__dirname, '../public/blocksStates')
fs.mkdirSync(blockStatesPath, { recursive: true })

const supportedVersions = require('./lib/version').supportedVersions
const force = process.argv.includes('-f') || process.argv.includes('--force')
const requestedArg = process.argv.find(arg => arg.startsWith('--version='))
const requestedVersion = requestedArg ? requestedArg.slice('--version='.length) : null
const versions = requestedVersion ? [requestedVersion] : supportedVersions

if (requestedVersion && !supportedVersions.includes(requestedVersion)) {
  throw new Error(`Cannot generate unsupported Minecraft version ${requestedVersion}`)
}

const manifestPath = path.resolve(__dirname, '../public/assets-manifest.json')
const manifest = fs.existsSync(manifestPath) ? fs.readJsonSync(manifestPath) : { versions: {} }
manifest.versions = Object.fromEntries(
  Object.entries(manifest.versions || {}).filter(([version]) => supportedVersions.includes(version))
)

function sha256 (buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function writeAtomic (filePath, contents) {
  const tempPath = filePath + '.tmp'
  fs.writeFileSync(tempPath, contents)
  fs.moveSync(tempPath, filePath, { overwrite: true })
}

for (const version of versions) {
  const textureFile = path.resolve(texturesPath, version + '.png')
  const blockStatesFile = path.resolve(blockStatesPath, version + '.json')
  const assetsDirectory = path.resolve(texturesPath, version)
  if (!force && fs.existsSync(textureFile) && fs.existsSync(blockStatesFile) && fs.existsSync(assetsDirectory)) {
    console.log(`Assets for ${version} already exist, skipping...`)
    continue
  }

  const assets = applyAssetOverrides(version, mcAssets(version))
  const atlas = makeTextureAtlas(assets)
  const atlasBuffer = atlas.image
  const blockStatesBuffer = Buffer.from(JSON.stringify(prepareBlocksStates(assets, atlas)))

  writeAtomic(textureFile, atlasBuffer)
  writeAtomic(blockStatesFile, blockStatesBuffer)

  fs.copySync(assets.directory, path.resolve(texturesPath, version), { overwrite: true })

  manifest.versions[version] = {
    textureAtlasSha256: sha256(atlasBuffer),
    blockStatesSha256: sha256(blockStatesBuffer)
  }
  console.log(`Generated exact assets for ${version}`)
}

writeAtomic(manifestPath, Buffer.from(JSON.stringify(manifest, null, 2) + '\n'))
