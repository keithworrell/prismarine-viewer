const THREE = require('three')
const TWEEN = require('@tweenjs/tween.js')

const Entity = require('./entity/Entity')
const { dispose3 } = require('./dispose')

const { createCanvas } = require('canvas')

function getEntityMesh (entity, scene, version) {
  if (entity.name) {
    try {
      const e = new Entity(version, entity.name, scene, entity.renderState)

      if (e.supported && entity.username !== undefined) {
        const canvas = createCanvas(500, 100)

        const ctx = canvas.getContext('2d')
        ctx.font = '50pt Arial'
        ctx.fillStyle = '#000000'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'

        const txt = entity.username
        ctx.fillText(txt, 100, 0)

        const tex = new THREE.Texture(canvas)
        tex.needsUpdate = true
        const spriteMat = new THREE.SpriteMaterial({ map: tex })
        const sprite = new THREE.Sprite(spriteMat)
        sprite.position.y += entity.height + 0.6

        e.mesh.add(sprite)
      }
      if (e.supported) return e.mesh
    } catch (err) {
      console.log(err)
    }
  }

  const width = Number.isFinite(entity.width) && entity.width > 0 ? entity.width : 0.6
  const height = Number.isFinite(entity.height) && entity.height > 0 ? entity.height : 1
  const geometry = new THREE.BoxGeometry(width, height, width)
  geometry.translate(0, height / 2, 0)
  const material = new THREE.MeshBasicMaterial({ color: 0xff00ff })
  const cube = new THREE.Mesh(geometry, material)
  cube.userData.viewerPlaceholder = true
  cube.userData.entityName = entity.name || 'unknown'
  return cube
}

class Entities {
  constructor (scene, version = '1.16.4') {
    this.scene = scene
    this.version = version
    this.entities = {}
  }

  setVersion (version) {
    if (this.version === version) return
    this.version = version
    this.clear()
  }

  clear () {
    for (const mesh of Object.values(this.entities)) {
      this.scene.remove(mesh)
      dispose3(mesh)
    }
    this.entities = {}
  }

  update (entity) {
    const existing = this.entities[entity.id]

    if (entity.delete) {
      if (!existing) return
      this.scene.remove(existing)
      dispose3(existing)
      delete this.entities[entity.id]
      return
    }

    const renderKey = entity.name
      ? JSON.stringify({ name: entity.name, renderState: entity.renderState || {} })
      : null

    if (existing && renderKey && existing.userData.renderKey !== renderKey) {
      const position = existing.position.clone()
      const rotation = existing.rotation.clone()
      this.scene.remove(existing)
      dispose3(existing)
      delete this.entities[entity.id]

      const replacement = getEntityMesh(entity, this.scene, this.version)
      replacement.position.copy(position)
      replacement.rotation.copy(rotation)
      replacement.userData.renderKey = renderKey
      this.entities[entity.id] = replacement
      this.scene.add(replacement)
    }

    if (!this.entities[entity.id]) {
      const mesh = getEntityMesh(entity, this.scene, this.version)
      if (!mesh) return
      mesh.userData.renderKey = renderKey
      this.entities[entity.id] = mesh
      this.scene.add(mesh)
    }

    const e = this.entities[entity.id]

    if (entity.pos) {
      new TWEEN.Tween(e.position).to({ x: entity.pos.x, y: entity.pos.y, z: entity.pos.z }, 50).start()
    }
    if (entity.yaw !== undefined) {
      const da = (entity.yaw - e.rotation.y) % (Math.PI * 2)
      const dy = 2 * da % (Math.PI * 2) - da
      new TWEEN.Tween(e.rotation).to({ y: e.rotation.y + dy }, 50).start()
    }
  }
}

module.exports = { Entities, getEntityMesh }
