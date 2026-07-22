/* global XMLHttpRequest */
const THREE = require('three')

const textureCache = {}
function loadTexture (texture, cb) {
  if (!textureCache[texture]) {
    textureCache[texture] = new THREE.TextureLoader().load(texture)
  }
  cb(textureCache[texture])
}

function loadJSON (url, callback, errorCallback) {
  const xhr = new XMLHttpRequest()
  xhr.open('GET', url, true)
  xhr.responseType = 'json'
  xhr.onload = function () {
    const status = xhr.status
    if (status === 200) {
      callback(xhr.response)
    } else {
      const error = new Error(url + ' not found')
      if (errorCallback) errorCallback(error)
      else throw error
    }
  }
  xhr.onerror = function () {
    const error = new Error(url + ' could not be loaded')
    if (errorCallback) errorCallback(error)
    else throw error
  }
  xhr.send()
}

module.exports = { loadTexture, loadJSON }
