import { MongoClient } from 'mongodb'
import './loadConfig.js'


const client = new MongoClient(process.env.MONGO_URI)

async function run() {
    try {
      const database = client.db("test")
      const collection = database.collection("products")

      // Define vector search index
      const index = {
          name: "hybrid-vector-search",
          type: "vectorSearch",
          definition: {
            "fields": [
              {
                "type": "vector",
                "numDimensions": 2048,
                "path": "plot_embedding_voyage_3_large",
                "similarity": "dotProduct"
              }
            ]
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

