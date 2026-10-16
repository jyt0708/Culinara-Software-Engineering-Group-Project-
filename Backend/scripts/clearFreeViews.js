import '../config/loadConfig.js'
import mongoose from 'mongoose'
import FreeView from '../models/FreeView.js'

const shouldDelete = process.argv.includes('--yes')

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not set. Check Backend/config.js before running this script.')
  process.exit(1)
}

await mongoose.connect(process.env.MONGO_URI)
console.log('Connected to MongoDB')

const count = await FreeView.countDocuments()
console.log(`FreeView records found: ${count}`)

if (!shouldDelete) {
  console.log('No records deleted.')
  console.log('Run with --yes to clear all FreeView records:')
  console.log('  npm run clear:freeviews -- --yes')
  await mongoose.disconnect()
  process.exit(0)
}

const result = await FreeView.deleteMany({})
console.log(`Deleted FreeView records: ${result.deletedCount}`)

await mongoose.disconnect()
console.log('Disconnected from MongoDB')
