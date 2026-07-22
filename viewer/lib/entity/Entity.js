/* global THREE */

const entities = require('./entities.json')
const { loadTexture } = globalThis.isElectron ? require('../utils.electron.js') : require('../utils')

const elemFaces = {
  up: {
    dir: [0, 1, 0],
    u0: [0, 0, 1],
    v0: [0, 0, 0],
    u1: [1, 0, 1],
    v1: [0, 0, 1],
    corners: [
      [0, 1, 1, 0, 0],
      [1, 1, 1, 1, 0],
      [0, 1, 0, 0, 1],
      [1, 1, 0, 1, 1]
    ]
  },
  down: {
    dir: [0, -1, 0],
    u0: [1, 0, 1],
    v0: [0, 0, 0],
    u1: [2, 0, 1],
    v1: [0, 0, 1],
    corners: [
      [1, 0, 1, 0, 0],
      [0, 0, 1, 1, 0],
      [1, 0, 0, 0, 1],
      [0, 0, 0, 1, 1]
    ]
  },
  east: {
    dir: [1, 0, 0],
    u0: [0, 0, 0],
    v0: [0, 0, 1],
    u1: [0, 0, 1],
    v1: [0, 1, 1],
    corners: [
      [1, 1, 1, 0, 0],
      [1, 0, 1, 0, 1],
      [1, 1, 0, 1, 0],
      [1, 0, 0, 1, 1]
    ]
  },
  west: {
    dir: [-1, 0, 0],
    u0: [1, 0, 1],
    v0: [0, 0, 1],
    u1: [1, 0, 2],
    v1: [0, 1, 1],
    corners: [
      [0, 1, 0, 0, 0],
      [0, 0, 0, 0, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 1, 1]
    ]
  },
  north: {
    dir: [0, 0, -1],
    u0: [0, 0, 1],
    v0: [0, 0, 1],
    u1: [1, 0, 1],
    v1: [0, 1, 1],
    corners: [
      [1, 0, 0, 0, 1],
      [0, 0, 0, 1, 1],
      [1, 1, 0, 0, 0],
      [0, 1, 0, 1, 0]
    ]
  },
  south: {
    dir: [0, 0, 1],
    u0: [1, 0, 2],
    v0: [0, 0, 1],
    u1: [2, 0, 2],
    v1: [0, 1, 1],
    corners: [
      [0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1],
      [0, 1, 1, 0, 0],
      [1, 1, 1, 1, 0]
    ]
  }
}

function dot (a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

const DEFAULT_TEXTURE_KEYS = {
  cat: 'tabby',
  donkey: 'donkey',
  fox: 'red',
  horse: 'base_brown',
  llama: 'creamy',
  mule: 'mule',
  ocelot: 'wild',
  parrot: 'red_blue',
  rabbit: 'brown',
  shulker: 'undyed',
  skeleton_horse: 'skeleton',
  villager: 'farmer',
  zombie_horse: 'zombie',
  zombie_villager: 'farmer'
}

// Later Java editions introduced mobs whose renderer is a texture variant of
// geometry already present in this legacy Bedrock-derived catalog. Keep those
// aliases explicit and version-neutral; texture relocation remains the job of
// resolveTexturePath below.
const ENTITY_MODEL_ALIASES = {
  glow_squid: 'squid'
}

function resolveEntityModel (type) {
  const modelType = ENTITY_MODEL_ALIASES[type] || type
  return { modelType, definition: entities[modelType] }
}

const NUMERIC_VARIANTS = {
  cat: ['tabby', 'black', 'red', 'siamese', 'british', 'calico', 'persian', 'ragdoll', 'white', 'jellie', 'all_black'],
  fox: ['red', 'arctic'],
  llama: ['creamy', 'white', 'brown', 'gray'],
  parrot: ['red_blue', 'blue', 'green', 'yellow_blue', 'grey'],
  rabbit: ['brown', 'white', 'black', 'white_splotched', 'gold', 'salt']
}

const FARM_VARIANTS = ['temperate', 'warm', 'cold']

function numeric (value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function resolveVariantTexture (type, entity, renderState) {
  if (typeof renderState.textureVariant === 'string' && entity.textures[renderState.textureVariant]) {
    return renderState.textureVariant
  }

  if (type === 'rabbit' && numeric(renderState.type) === 99 && entity.textures.toast) return 'toast'
  const variantValue = renderState.variant ?? renderState.type
  const variant = NUMERIC_VARIANTS[type]?.[numeric(variantValue)]
  if (variant && entity.textures[variant]) return variant
  return DEFAULT_TEXTURE_KEYS[type]
}

function resolveRenderLayers (type, entity, renderState = {}) {
  const geometryKeys = Object.keys(entity.geometry || {})
  const textureKeys = Object.keys(entity.textures || {})
  if (geometryKeys.length === 0 || textureKeys.length === 0) return []

  if (type === 'sheep' && entity.geometry.default && entity.geometry.sheared && entity.textures.default && entity.textures.sheared) {
    const wool = numeric(renderState.wool)
    const isSheared = wool !== undefined && (wool & 0x10) !== 0
    const layers = [{ geometry: 'sheared', texture: 'sheared' }]
    if (!isSheared) layers.push({ geometry: 'default', texture: 'default' })
    return layers
  }

  if (['horse', 'donkey', 'mule', 'skeleton_horse', 'zombie_horse'].includes(type) && entity.geometry.default) {
    const typeVariant = numeric(renderState.type_variant)
    const horseColors = ['base_white', 'base_creamy', 'base_chestnut', 'base_brown', 'base_black', 'base_gray', 'base_darkbrown']
    const markings = ['markings_none', 'markings_white', 'markings_whitefield', 'markings_whitedots', 'markings_blackdots']
    const base = type === 'horse' && typeVariant !== undefined
      ? horseColors[typeVariant & 0xff]
      : DEFAULT_TEXTURE_KEYS[type]
    const layers = [{ geometry: 'default', texture: entity.textures[base] ? base : textureKeys[0] }]
    if (type === 'horse' && typeVariant !== undefined) {
      const marking = markings[(typeVariant >> 8) & 0xff]
      if (marking && marking !== 'markings_none' && entity.textures[marking]) {
        layers.push({ geometry: 'default', texture: marking })
      }
    }
    return layers
  }

  const geometry = entity.geometry.default ? 'default' : geometryKeys[0]
  const selectedVariant = resolveVariantTexture(type, entity, renderState)
  if (selectedVariant && entity.textures[selectedVariant]) {
    return [{ geometry, texture: selectedVariant }]
  }
  if (entity.textures[geometry]) return [{ geometry, texture: geometry }]
  if (entity.textures.default) return [{ geometry, texture: 'default' }]

  // A visible deterministic default is preferable to the old empty mesh for
  // legacy definitions whose geometry and texture maps use different keys.
  return [{ geometry, texture: textureKeys[0] }]
}

function farmVariant (value) {
  if (typeof value === 'string') {
    const match = FARM_VARIANTS.find(variant => value.includes(variant))
    if (match) return match
  }
  return FARM_VARIANTS[numeric(value)] || 'temperate'
}

function resolveTexturePath (version, type, texture, renderState = {}, textureKey = '') {
  if (version !== '1.21.8') return texture

  const movedDefaults = {
    arrow: 'textures/entity/projectiles/arrow',
    firework_rocket: 'textures/items/firework_rocket',
    glow_squid: 'textures/entity/squid/glow_squid',
    player: 'textures/entity/player/wide/steve',
    potion: 'textures/items/splash_potion',
    squid: 'textures/entity/squid/squid'
  }
  if (movedDefaults[type]) return movedDefaults[type]
  if (['chicken', 'cow', 'pig'].includes(type)) {
    const variant = farmVariant(renderState.variant)
    return `textures/entity/${type}/${variant}_${type}`
  }
  if (type === 'sheep') {
    return textureKey === 'default' ? 'textures/entity/sheep/sheep_wool' : 'textures/entity/sheep/sheep'
  }
  if (type === 'cat' && texture.endsWith('/tuxedo')) return 'textures/entity/cat/black'
  return texture
}

function toEuler (rotation) {
  const values = rotation || [0, 0, 0]
  return new THREE.Euler(
    -(numeric(values[0]) || 0) * Math.PI / 180,
    -(numeric(values[1]) || 0) * Math.PI / 180,
    -(numeric(values[2]) || 0) * Math.PI / 180,
    'XYZ'
  )
}

function cubePivot (cube) {
  if (cube.pivot) return new THREE.Vector3(...cube.pivot)
  return new THREE.Vector3(
    cube.origin[0] + cube.size[0] / 2,
    cube.origin[1] + cube.size[1] / 2,
    cube.origin[2] + cube.size[2] / 2
  )
}

function boneChain (jsonBone, jsonBones) {
  const chain = []
  let current = jsonBone
  const visited = new Set()
  while (current && !visited.has(current.name)) {
    visited.add(current.name)
    chain.push(current)
    current = current.parent ? jsonBones[current.parent] : null
  }
  return chain
}

function rotateAround (vector, pivot, rotation) {
  return vector.sub(pivot).applyEuler(rotation).add(pivot)
}

function transformVertex (vertex, cube, jsonBone, jsonBones) {
  let result = vertex.clone()
  if (cube.rotation) result = rotateAround(result, cubePivot(cube), toEuler(cube.rotation))
  for (const bone of boneChain(jsonBone, jsonBones)) {
    const rotation = bone.bind_pose_rotation || bone.rotation
    if (rotation) result = rotateAround(result, new THREE.Vector3(...(bone.pivot || [0, 0, 0])), toEuler(rotation))
  }
  return result
}

function transformNormal (normal, cube, jsonBone, jsonBones) {
  const result = normal.clone()
  if (cube.rotation) result.applyEuler(toEuler(cube.rotation))
  for (const bone of boneChain(jsonBone, jsonBones)) {
    const rotation = bone.bind_pose_rotation || bone.rotation
    if (rotation) result.applyEuler(toEuler(rotation))
  }
  return result.normalize()
}

function addCube (attr, boneId, jsonBone, jsonBones, cube, texWidth = 64, texHeight = 64) {
  for (const { dir, corners, u0, v0, u1, v1 } of Object.values(elemFaces)) {
    const ndx = Math.floor(attr.positions.length / 3)

    for (const pos of corners) {
      const u = (cube.uv[0] + dot(pos[3] ? u1 : u0, cube.size)) / texWidth
      const v = (cube.uv[1] + dot(pos[4] ? v1 : v0, cube.size)) / texHeight

      const inflate = cube.inflate ? cube.inflate : 0
      const vecPos = transformVertex(new THREE.Vector3(
        cube.origin[0] + pos[0] * cube.size[0] + (pos[0] ? inflate : -inflate),
        cube.origin[1] + pos[1] * cube.size[1] + (pos[1] ? inflate : -inflate),
        cube.origin[2] + pos[2] * cube.size[2] + (pos[2] ? inflate : -inflate)
      ), cube, jsonBone, jsonBones)
      const normal = transformNormal(new THREE.Vector3(...dir), cube, jsonBone, jsonBones)

      attr.positions.push(vecPos.x, vecPos.y, vecPos.z)
      attr.normals.push(normal.x, normal.y, normal.z)
      attr.uvs.push(u, v)
      attr.skinIndices.push(boneId, 0, 0, 0)
      attr.skinWeights.push(1, 0, 0, 0)
    }

    attr.indices.push(
      ndx, ndx + 1, ndx + 2,
      ndx + 2, ndx + 1, ndx + 3
    )
  }
}

function getMesh (texture, jsonModel) {
  const bones = {}
  const jsonBones = Object.fromEntries(jsonModel.bones.map(bone => [bone.name, bone]))

  const geoData = {
    positions: [],
    normals: [],
    uvs: [],
    indices: [],
    skinIndices: [],
    skinWeights: []
  }
  let i = 0
  for (const jsonBone of jsonModel.bones) {
    const bone = new THREE.Bone()
    const pivot = jsonBone.pivot || [0, 0, 0]
    const parentPivot = jsonBone.parent ? (jsonBones[jsonBone.parent]?.pivot || [0, 0, 0]) : [0, 0, 0]
    bone.position.set(pivot[0] - parentPivot[0], pivot[1] - parentPivot[1], pivot[2] - parentPivot[2])
    bones[jsonBone.name] = bone

    if (jsonBone.cubes) {
      for (const cube of jsonBone.cubes) {
        addCube(geoData, i, jsonBone, jsonBones, cube, jsonModel.texturewidth, jsonModel.textureheight)
      }
    }
    i++
  }

  const rootBones = []
  for (const jsonBone of jsonModel.bones) {
    if (jsonBone.parent) bones[jsonBone.parent].add(bones[jsonBone.name])
    else rootBones.push(bones[jsonBone.name])
  }

  const skeleton = new THREE.Skeleton(Object.values(bones))

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(geoData.positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(geoData.normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(geoData.uvs, 2))
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(geoData.skinIndices, 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(geoData.skinWeights, 4))
  geometry.setIndex(geoData.indices)

  const material = new THREE.MeshLambertMaterial({ transparent: true, skinning: true, alphaTest: 0.1 })
  const mesh = new THREE.SkinnedMesh(geometry, material)
  mesh.add(...rootBones)
  mesh.updateMatrixWorld(true)
  mesh.bind(skeleton)
  mesh.scale.set(1 / 16, 1 / 16, 1 / 16)

  loadTexture(texture, texture => {
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.flipY = false
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    material.map = texture
  })

  return mesh
}

class Entity {
  constructor (version, type, scene, renderState = {}) {
    const { modelType, definition: e } = resolveEntityModel(type)
    if (!e) {
      console.warn(`Unknown entity ${type} - caller will render visible bounds`)
      this.mesh = new THREE.Object3D()
      this.supported = false
      return
    }

    this.mesh = new THREE.Object3D()
    const layers = resolveRenderLayers(modelType, e, renderState)
    for (const layer of layers) {
      const jsonModel = e.geometry[layer.geometry]
      const texture = resolveTexturePath(version, type, e.textures[layer.texture], renderState, layer.texture)
      if (!jsonModel || !texture) continue
      // console.log(JSON.stringify(jsonModel, null, 2))
      const mesh = getMesh(texture.replace('textures', 'textures/' + version) + '.png', jsonModel)
      /* const skeletonHelper = new THREE.SkeletonHelper( mesh )
      skeletonHelper.material.linewidth = 2
      scene.add( skeletonHelper ) */
      this.mesh.add(mesh)
    }
    this.supported = this.mesh.children.length > 0
  }
}

module.exports = Entity
module.exports.getMesh = getMesh
module.exports.resolveRenderLayers = resolveRenderLayers
module.exports.resolveEntityModel = resolveEntityModel
module.exports.resolveTexturePath = resolveTexturePath
module.exports.transformVertex = transformVertex
