const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

global.THREE = require('three')

const THREE = global.THREE
const { Vec3 } = require('vec3')
const entitiesData = require('../viewer/lib/entity/entities.json')
const {
  resolveEntityModel,
  resolveRenderLayers,
  resolveTexturePath,
  transformVertex
} = require('../viewer/lib/entity/Entity')
const { getEntityMesh } = require('../viewer/lib/entities')
const { getEntityRenderState } = require('../viewer/lib/worldView')
const { getFluidKind, getLiquidRenderHeight, renderLiquid } = require('../viewer/lib/models')
const { getVersion } = require('../viewer/lib/version')
const { applyAssetOverrides } = require('../viewer/lib/assetOverrides')

function block (name, position, options = {}) {
  return {
    name,
    position,
    metadata: options.metadata ?? 0,
    isCube: options.isCube ?? false,
    transparent: options.transparent ?? true,
    getProperties: () => options.properties || {}
  }
}

function worldWith (entries) {
  const blocks = new Map(entries.map(entry => [entry.position.toString(), entry]))
  return {
    getBlock: position => blocks.get(position.toString()) || block('air', position)
  }
}

test('requires an exact supported Minecraft asset version', () => {
  assert.equal(getVersion('1.21.8'), '1.21.8')
  assert.equal(getVersion('1.21.7'), null)
  assert.equal(getVersion('1.21.4'), null)

  const exact = require('minecraft-data')('1.21.8')
  const old = require('minecraft-data')('1.21.4')
  const stateId = exact.blocksByName.seagrass.minStateId
  assert.equal(exact.blocksByStateId[stateId].name, 'seagrass')
  assert.notEqual(old.blocksByStateId[stateId].name, 'seagrass')

  const assets = applyAssetOverrides('1.21.8', require('minecraft-assets')('1.21.8'))
  for (const name of ['bush', 'leaf_litter', 'firefly_bush']) {
    assert.ok(assets.blocksStates[name], `${name} block state overlay`)
    assert.equal(fs.existsSync(path.join(assets.directory, 'blocks', `${name}.png`)), true, `${name} texture`)
  }

  const generatedStates = require('../public/blocksStates/1.21.8.json')
  for (const name of ['bush', 'leaf_litter', 'firefly_bush']) {
    assert.ok(generatedStates[name], `${name} generated block state`)
    assert.equal(JSON.stringify(generatedStates[name]).includes('"u":0,"v":0'), false, `${name} must not use missing texture tile`)
  }
})

test('rotates the chicken body cube around its center', () => {
  const body = entitiesData.chicken.geometry.default.bones.find(bone => bone.name === 'body')
  const cube = body.cubes[0]
  const bones = Object.fromEntries(entitiesData.chicken.geometry.default.bones.map(bone => [bone.name, bone]))
  const ys = []

  for (const x of [0, 1]) {
    for (const y of [0, 1]) {
      for (const z of [0, 1]) {
        const vertex = new THREE.Vector3(
          cube.origin[0] + x * cube.size[0],
          cube.origin[1] + y * cube.size[1],
          cube.origin[2] + z * cube.size[2]
        )
        ys.push(transformVertex(vertex, cube, body, bones).y)
      }
    }
  }

  assert.ok(Math.abs(Math.min(...ys) - 5) < 1e-9)
  assert.ok(Math.abs(Math.max(...ys) - 11) < 1e-9)
})

test('selects deterministic animal layers and current texture paths', () => {
  const glowSquid = resolveEntityModel('glow_squid')
  assert.equal(glowSquid.modelType, 'squid')
  assert.equal(glowSquid.definition, entitiesData.squid)

  assert.deepEqual(resolveRenderLayers('cat', entitiesData.cat, { variant: 0 }), [{ geometry: 'default', texture: 'tabby' }])
  assert.deepEqual(resolveRenderLayers('rabbit', entitiesData.rabbit, { type: 1 }), [{ geometry: 'default', texture: 'white' }])
  assert.deepEqual(resolveRenderLayers('sheep', entitiesData.sheep, { wool: 0x10 }), [{ geometry: 'sheared', texture: 'sheared' }])

  const assets = require('minecraft-assets')('1.21.8')
  const cases = [
    ['chicken', 'textures/entity/chicken', { variant: 0 }, 'default'],
    ['cow', 'textures/entity/cow/cow', { variant: 1 }, 'default'],
    ['glow_squid', 'textures/entity/squid', {}, 'default'],
    ['pig', 'textures/entity/pig/pig', { variant: 2 }, 'default'],
    ['sheep', 'textures/entity/sheep/sheep_fur', {}, 'default'],
    ['cat', 'textures/entity/cat/tuxedo', {}, 'black']
  ]
  for (const [type, legacyPath, state, key] of cases) {
    const resolved = resolveTexturePath('1.21.8', type, legacyPath, state, key)
    assert.equal(fs.existsSync(path.join(assets.directory, resolved.replace('textures/', '') + '.png')), true, resolved)
  }

  for (const [type, definition] of Object.entries(entitiesData)) {
    for (const layer of resolveRenderLayers(type, definition, {})) {
      const resolved = resolveTexturePath('1.21.8', type, definition.textures[layer.texture], {}, layer.texture)
      assert.equal(fs.existsSync(path.join(assets.directory, resolved.replace('textures/', '') + '.png')), true, `${type}: ${resolved}`)
    }
  }
})

test('preserves render-relevant entity metadata and holder values', () => {
  const metadataKeys = ['shared_flags', 'baby', 'variant', 'ignored']
  const bot = { registry: { entitiesByName: { chicken: { metadataKeys } } } }
  const entity = { name: 'chicken', metadata: [0, true, { variantId: 2 }, 'private'] }
  assert.deepEqual(getEntityRenderState(bot, entity), { baby: true, variant: 2 })
})

test('renders unsupported entities as visible diagnostic bounds', () => {
  const scene = new THREE.Scene()
  const mesh = getEntityMesh({ id: 1, name: 'future_mob', width: 0.7, height: 1.4 }, scene, '1.21.8')
  assert.equal(mesh.userData.viewerPlaceholder, true)
  assert.equal(mesh.userData.entityName, 'future_mob')
})

test('recognizes intrinsic and waterlogged composite fluid occupancy', () => {
  const pos = new Vec3(0, 0, 0)
  assert.equal(getFluidKind(block('kelp', pos)), 'water')
  assert.equal(getFluidKind(block('oak_fence', pos, { properties: { waterlogged: true } })), 'water')
  assert.equal(getFluidKind(block('oak_fence', pos, { properties: { waterlogged: 'true' } })), 'water')
  assert.equal(getFluidKind(block('stone', pos, { isCube: true, transparent: false })), null)

  const kelp = block('kelp', pos)
  const waterAbove = block('water', pos.offset(0, 1, 0))
  assert.equal(getLiquidRenderHeight(worldWith([kelp, waterAbove]), kelp, 'water'), 1)
})

test('culls internal composite-water faces while retaining the exposed surface', () => {
  const cursor = new Vec3(0, 0, 0)
  const neighbors = [
    block('kelp', cursor),
    block('water', cursor.offset(1, 0, 0)),
    block('water', cursor.offset(-1, 0, 0)),
    block('water', cursor.offset(0, 0, 1)),
    block('water', cursor.offset(0, 0, -1)),
    block('water', cursor.offset(0, -1, 0))
  ]
  const attr = { t_positions: [], t_normals: [], t_uvs: [], t_colors: [] }
  renderLiquid(worldWith(neighbors), cursor, { u: 0, v: 0, su: 1, sv: 1 }, 'water', 'plains', true, attr)
  assert.equal(attr.t_positions.length, 12)
  assert.deepEqual(new Set(attr.t_normals), new Set([0, 1]))
})
