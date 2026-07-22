const THREE = require('three')
const path = require('path')

const textureCache = {}
function assetPath (asset) {
  return asset.split('?')[0]
}
function loadTexture (texture, cb) {
  if (!textureCache[texture]) {
    const url = path.resolve(__dirname, '../../public/' + assetPath(texture))
    textureCache[texture] = new THREE.TextureLoader().load(url)
  }
  cb(textureCache[texture])
}

function loadJSON (json, cb, errorCb) {
  try {
    cb(require(path.resolve(__dirname, '../../public/' + assetPath(json))))
  } catch (err) {
    if (errorCb) errorCb(err)
    else throw err
  }
}

module.exports = { loadTexture, loadJSON }
