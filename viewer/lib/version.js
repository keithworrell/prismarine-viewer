const supportedVersions = ['1.8.8', '1.9.4', '1.10.2', '1.11.2', '1.12.2', '1.13.2', '1.14.4', '1.15.2', '1.16.1', '1.16.4', '1.17.1', '1.18.1', '1.19', '1.20.1', '1.21.1', '1.21.4', '1.21.8']

function getVersion (version) {
  const requested = String(version)
  return supportedVersions.includes(requested) ? requested : null
}

module.exports = { getVersion, supportedVersions }
