import { MongoClient } from 'mongodb'
import './loadConfig.js'


const client = new MongoClient(process.env.MONGO_URI)

async function run() {
    try {
      const database = client.db("test")
      const collection = database.collection("products")

      // Define search index
      const index = {
          name: "hybrid-full-text-search",
          type: "search",
          definition: {
            "mappings": {
              "dynamic": true
            }
          }
      }

      // Call the method to create the index
      const result = await collection.createSearchIndex(index)
      console.log(result)
    } finally {
      await client.close()
    }
}
run().catch(console.dir)
