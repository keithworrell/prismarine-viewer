// minecraft-assets 1.17.0 identifies its data set as 1.21.8, but its
// blocks_states.json omits the three Spring to Life blocks below. The texture
// files are present; bush/firefly models are present; leaf-litter models are
// also absent. These definitions are transcribed from Mojang's official
// 1.21.8 client JAR (SHA-1 a19d9badbea944a4369fd0059e53bf7286597576).

function leafLitterMultipart () {
  const rotations = { north: undefined, east: 90, south: 180, west: 270 }
  const groups = [
    { model: 'leaf_litter_1', segmentAmount: '1' },
    { model: 'leaf_litter_2', segmentAmount: '2|3' },
    { model: 'leaf_litter_3', segmentAmount: '3' },
    { model: 'leaf_litter_4', segmentAmount: '4' }
  ]
  const multipart = []
  for (const group of groups) {
    for (const [facing, y] of Object.entries(rotations)) {
      const apply = { model: `minecraft:block/${group.model}` }
      if (y !== undefined) apply.y = y
      multipart.push({
        apply,
        when: { facing, segment_amount: group.segmentAmount }
      })
    }
  }
  return multipart
}

const LEAF_LITTER_TEMPLATES = {
  template_leaf_litter_1: {
    from: [0, 0.25, 0],
    to: [8, 0.25, 8],
    up: [0, 0, 8, 8],
    down: [0, 8, 8, 0]
  },
  template_leaf_litter_2: {
    from: [0, 0.25, 0],
    to: [8, 0.25, 16],
    up: [0, 0, 8, 16],
    down: [0, 16, 8, 0]
  },
  template_leaf_litter_3: {
    from: [8, 0.25, 8],
    to: [16, 0.25, 16],
    up: [8, 8, 16, 16],
    down: [8, 16, 16, 8]
  },
  template_leaf_litter_4: {
    from: [0, 0.25, 0],
    to: [16, 0.25, 16],
    up: [0, 0, 16, 16],
    down: [0, 16, 16, 0]
  }
}

function leafLitterTemplate (definition) {
  return {
    ambientocclusion: false,
    textures: { particle: '#texture' },
    elements: [{
      from: definition.from,
      to: definition.to,
      faces: {
        up: { uv: definition.up, texture: '#texture', tintindex: 0 },
        down: { uv: definition.down, texture: '#texture', tintindex: 0 }
      }
    }]
  }
}

function java1218Overrides () {
  const blocksModels = {
    bush: {
      parent: 'minecraft:block/tinted_cross',
      textures: { cross: 'minecraft:block/bush' }
    },
    firefly_bush: {
      parent: 'minecraft:block/cross_emissive',
      textures: {
        cross: 'minecraft:block/firefly_bush',
        cross_emissive: 'minecraft:block/firefly_bush_emissive'
      }
    }
  }

  for (let amount = 1; amount <= 4; amount++) {
    blocksModels[`leaf_litter_${amount}`] = {
      parent: `minecraft:block/template_leaf_litter_${amount}`,
      textures: { texture: 'minecraft:block/leaf_litter' }
    }
  }
  for (const [name, definition] of Object.entries(LEAF_LITTER_TEMPLATES)) {
    blocksModels[name] = leafLitterTemplate(definition)
  }

  return {
    blocksStates: {
      bush: { variants: { '': { model: 'minecraft:block/bush' } } },
      firefly_bush: { variants: { '': { model: 'minecraft:block/firefly_bush' } } },
      leaf_litter: { multipart: leafLitterMultipart() }
    },
    blocksModels
  }
}

function applyAssetOverrides (version, assets) {
  if (version !== '1.21.8') return assets
  const overrides = java1218Overrides()
  Object.assign(assets.blocksStates, overrides.blocksStates)
  Object.assign(assets.blocksModels, overrides.blocksModels)
  return assets
}

module.exports = { applyAssetOverrides, java1218Overrides }
