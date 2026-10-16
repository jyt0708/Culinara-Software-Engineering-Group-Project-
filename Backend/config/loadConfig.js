import config from '../config.js'

for (const [key, value] of Object.entries(config)) {
  if (value !== undefined && value !== null) {
    process.env[key] = String(value)
  }
}
