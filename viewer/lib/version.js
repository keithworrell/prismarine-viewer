// This fork branch is the runtime artifact for the Paper/Mineflayer 1.21.8
// stack. Keeping the list exact prevents npm's Git prepare from generating and
// shipping hundreds of megabytes of unrelated historical assets.
const supportedVersions = ['1.21.8']

function getVersion (version) {
  const requested = String(version)
  return supportedVersions.includes(requested) ? requested : null
}

module.exports = { getVersion, supportedVersions }
