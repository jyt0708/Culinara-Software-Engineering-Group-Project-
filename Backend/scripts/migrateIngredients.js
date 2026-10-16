// Run once to convert ingredients from string[] to {name, image}[]
// Usage: cd Backend && node scripts/migrateIngredients.js
// Simplest: set MONGO_URI in env and run: node scripts/migrateIngredients.js

import '../config/loadConfig.js'
import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGO_URI
if (!MONGO_URI) {
  console.error('MONGO_URI not set. Create config.js in Backend/ or set the env var.')
  process.exit(1)
}

await mongoose.connect(MONGO_URI)
console.log('Connected to MongoDB')

const collection = mongoose.connection.collection('recipes')
const recipes = await collection.find({}).toArray()

let migrated = 0
let skipped = 0

for (const recipe of recipes) {
  const ingredients = recipe.ingredients || []
  if (ingredients.length === 0) { skipped++; continue }

  // Already migrated if first item is an object
  if (typeof ingredients[0] === 'object' && ingredients[0] !== null) {
    skipped++
    continue
  }

  const newIngredients = ingredients.map((ing) =>
    typeof ing === 'string' ? { name: ing, image: '' } : ing
  )

  await collection.updateOne(
    { _id: recipe._id },
    { $set: { ingredients: newIngredients } }
  )
  migrated++
}

console.log(`Done. Migrated: ${migrated}, Already up-to-date / skipped: ${skipped}`)
await mongoose.disconnect()
