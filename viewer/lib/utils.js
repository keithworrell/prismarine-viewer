function safeRequire (path) {
  try {
    return require(path)
  } catch (e) {
    return {}
  }
}
const { loadImage } = safeRequire('node-canvas-webgl/lib')
const THREE = require('three')
const path = require('path')

const textureCache = {}
function assetPath (asset) {
  return asset.split('?')[0]
}
// todo not ideal, export different functions for browser and node
function loadTexture (texture, cb) {
  if (process.platform === 'browser') {
    return require('./utils.web').loadTexture(texture, cb)
  }

  if (textureCache[texture]) {
    cb(textureCache[texture])
  } else {
    loadImage(path.resolve(__dirname, '../../public/' + assetPath(texture))).then(image => {
      textureCache[texture] = new THREE.CanvasTexture(image)
      cb(textureCache[texture])
    })
  }
}

function loadJSON (json, cb, errorCb) {
  if (process.platform === 'browser') {
    return require('./utils.web').loadJSON(json, cb)
  }
  try {
    cb(require(path.resolve(__dirname, '../../public/' + assetPath(json))))
  } catch (err) {
    if (errorCb) errorCb(err)
    else throw err
  }
}

module.exports = { loadTexture, loadJSON }
