import Product, { Rating } from '../models/Product.js'
import ProductView from "../models/ProductView.js"
import Order from '../models/Order.js'
import Notification from '../models/Notification.js'
import mongoose from 'mongoose'
import config from '../config.js'


const validateProductBody = (body) => {
  const { 
    name, price, weight, origin, stock, description, coverImage, category 
  } = body
  if (!name || !category || !origin || !description || !coverImage || !category
    || price === undefined || stock === undefined || weight === undefined) {
    return 'Missing required fields'
  }

  if (price < 0 || stock < 0 || weight < 0) {
    return 'Price and stock must be positive numbers'
  }

  return null
}

const PRODUCT_TEXT_SEARCH_INDEX = 'hybrid-full-text-search'
const PRODUCT_VECTOR_SEARCH_INDEX = 'hybrid-vector-search'
const PRODUCT_VECTOR_PATH = 'plot_embedding_voyage_3_large'
const HYBRID_SEARCH_LIMIT = 20
const VOYAGE_EMBEDDING_MODEL = 'voyage-3-large'
const VOYAGE_EMBEDDING_DIMENSIONS = 2048
const VOYAGE_API_KEY = config.VOYAGE_API_KEY || undefined

// const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// const buildProductTextFilter = (searchQuery) => {
//   const regex = new RegExp(escapeRegex(searchQuery), 'i')

//   return {
//     $or: [
//       { name: regex },
//       { description: regex },
//       { category: regex },
//       { origin: regex }
//     ]
//   }
// }

const getDocumentEmbedding = async (text) => {
  if (!VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY is not configured')
  }

  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VOYAGE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'voyage-3-large',
      input: [text],
      input_type: 'document', // 创建文档时，使用 'document'，搜索时用 'query'
      output_dimension: 2048
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Voyage embedding failed for document: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  const embedding = result?.data?.[0]?.embedding

  if (!Array.isArray(embedding) || embedding.length !== 2048) {
    throw new Error('Voyage did not return a valid 2048-dimension embedding')
  }

  return embedding
}

const getQueryEmbedding = async (query) => {
  if (!VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY is not configured')
  }

  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VOYAGE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: VOYAGE_EMBEDDING_MODEL,
      input: [query],
      input_type: 'query',
      output_dimension: VOYAGE_EMBEDDING_DIMENSIONS
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Voyage embedding request failed: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  const embedding = result?.data?.[0]?.embedding

  if (!Array.isArray(embedding)) {
    throw new Error('Voyage embedding response did not include an embedding')
  }

  if (embedding.length !== VOYAGE_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Voyage embedding has ${embedding.length} dimensions, expected ${VOYAGE_EMBEDDING_DIMENSIONS}`
    )
  }

  return embedding
}

const buildProductRankFusionStage = (searchQuery, queryVector, filter) => [{
  $rankFusion: {
    input: {
      pipelines: {
        vectorPipeline: [
          {
            $vectorSearch: {
              index: PRODUCT_VECTOR_SEARCH_INDEX,
              path: PRODUCT_VECTOR_PATH,
              queryVector,
              numCandidates: 200,
              limit: HYBRID_SEARCH_LIMIT
            }
          },
          { $match: filter }
        ],
        fullTextPipeline: [
          {
            $search: {
              index: PRODUCT_TEXT_SEARCH_INDEX,
              compound: {
                should: [
                  {
                    text: {
                      query: searchQuery,
                      path: 'name',
                      score: { boost: { value: 8 } }
                    }
                  },
                  {
                    text: {
                      query: searchQuery,
                      path: 'category',
                      score: { boost: { value: 4 } }
                    }
                  },
                  {
                    text: {
                      query: searchQuery,
                      path: 'origin',
                      score: { boost: { value: 4 } }
                    }
                  },
                  {
                    text: {
                      query: searchQuery,
                      path: 'description',
                      score: { boost: { value: 2 } }
                    }
                  }
                ],
                minimumShouldMatch: 1
              }
            }
          },
          { $match: filter },
          { $limit: HYBRID_SEARCH_LIMIT }
        ]
      }
    },
    combination: {
      weights: {
        vectorPipeline: 0.8,
        fullTextPipeline: 0.2
      }
    },
    scoreDetails: true
  }
}, 
]


// export const getProducts = async (req, res) => {
//   try {
//     const {
//       minPrice, maxPrice, category, sort = 'recent', q = '', page = '1', limit = '0'
//     } = req.query

//     const limitNum = parseInt(limit) || 0 
//     const pageNum = Math.max(1, parseInt(page) || 1) 
//     const skipNum = limitNum > 0 ? (pageNum - 1) * limitNum : 0

//     const searchQuery = String(q).trim()
//     const hasSearchQuery = !!searchQuery

//     const filter = { }

//     let pipeline

//     const useHybridSearch = hasSearchQuery && !!process.env.VOYAGE_API_KEY

//     if (hasSearchQuery && !useHybridSearch) {
//       Object.assign(filter, buildProductTextFilter(searchQuery))
//     }

//     if (useHybridSearch) {
//       const queryVector = await getQueryEmbedding(searchQuery)

//       pipeline = buildProductRankFusionStage(searchQuery, queryVector, filter)
     
      
//     } else {
//       pipeline = [{ $match: filter }]

//       if (hasSearchQuery) {
//         pipeline.push({
//           $addFields: {
//             score: null,
//             scoreDetails: null
//           }
//         })
//       }
//     }


//     // dynamically handle projection and sorting based on query parameters
//     let sortStep = hasSearchQuery ? null : { createdAt: -1 }
  
   
    
//     // push the determined sorting execution to the pipeline
//     if (sortStep) {
//       pipeline.push({ $sort: sortStep })
//     }

//     // count how many products match the same filter
//     const countPipeline = [...pipeline, { $count: 'total' }]

//     // pagination
//     if (skipNum > 0) {
//       pipeline.push({ $skip: skipNum })
//     }

//     if (limitNum > 0) {
//       pipeline.push({ $limit: limitNum })
//     }

//     // populate the createdBy field with the username and profile picture of the creator 
//     // for quick access on the frontend 
//     pipeline.push(
//       {
//         $lookup: {
//           from: 'users',
//           localField: 'createdBy',
//           foreignField: '_id',
//           as: 'createdBy'
//         }
//       },
//       {
//         // $lookup returns an array; unwind it to turn it back into a single object
//         $unwind: {
//           path: '$createdBy',
//           preserveNullAndEmptyArrays: true // prevent product deletion if the creator is deleted
//         }
//       },
//       {
//         // project only the required user fields 
//        $addFields: {
//           createdBy: {
//             $cond: {
//               if: { $not: ['$createdBy'] },
//               then: null,
//               else: {
//                 username: '$createdBy.username',
//                 profilePicture: '$createdBy.profilePicture',
//                 _id: '$createdBy._id'
//               }
//             }
//           }
//         }
//       }
//     )

//     const [products, totalResult, categoryCounts] = await Promise.all([
//       Product.aggregate(pipeline),

//       // If there is a search query, use aggregation for Atlas $search to work
//       // otherwise use the simpler and cheaper countDocuments()
//       hasSearchQuery ? Product.aggregate(countPipeline) : Product.countDocuments(filter),
//       Product.aggregate([
//         { $match: { stock: { $gt: 0 } } },
//         { $group: { _id: '$category', count: { $sum: 1 } } },
//       ]),
//     ])

//     const total = Array.isArray(totalResult)
//       ? totalResult[0]?.total || 0
//       : totalResult

//     const totalPages =
//       limitNum > 0 ? Math.ceil(total / limitNum) : 1

//     const counts = Object.fromEntries(categoryCounts.map(({ _id, count }) => [_id, count]))

//     console.log(JSON.stringify(products, null, 2))

//     res.status(200).json({
//       success: true,
//       data: products,
//       total,
//       page: pageNum,
//       totalPages,
//       categoryCounts: counts
//     })
    
//   } catch (err) {
//     console.error(err)
//     res.status(500).json({ success: false, message: 'Server error' })
//   }
// }


// POST /api/products
// product with same name created by the same user cannot be created again
export const createProduct = async (req, res) => {
    try {
      const error = validateProductBody(req.body)
      if (error) return res.status(400).json({ success: false, message: error })
      
      const { 
        name, category, price, weight, origin, stock, description, coverImage, images, imageTitle, imageDescription, specifications 
      } = req.body
      const userId = req.user._id

      const existingProduct = await Product.findOne({ 
        name: { $regex: `^${name.trim()}$`, $options: 'i' }, 
        createdBy: userId 
      })

      if (existingProduct) {
        return res.status(400).json({ 
          success: false, 
          message: 'You have already created a product with this name. Please choose a different name.' 
        })
      }

      const textToEmbed = `Product Name: ${name.trim()}. Category: ${category}. Origin: ${origin}. Description: ${description}`
      console.log(`Generating embedding for new product: ${name.trim()}...`)
      const embedding = await getDocumentEmbedding(textToEmbed)

      const newProduct = await Product.create({ 
        name: name.trim(),
        price: price,
        weight: weight,
        origin: origin,
        stock: stock,
        description: description,
        coverImage: coverImage,  
        images: images,
        imageTitle: imageTitle || '',
        imageDescription: imageDescription || '',
        createdBy: userId, 
        category: category,
        specifications: specifications || [],
        plot_embedding_voyage_3_large: embedding
      })

      res.status(201).json({ 
        success: true, 
        data: newProduct 
      })
    
    } catch (err) {
      console.error(err)
      res.status(500).json({ success: false, message: 'Server error' })
    }
}

// GET /api/products/:id
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ success: false, message: 'Invalid product id format' })
    }

    let product = await Product.findById(id).populate('createdBy', 'username profilePicture')
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    // const isOwner = req.user && String(product.createdBy?._id) === String(req.user._id)

    // if (!isOwner){
    //   // return the product with most recent viewCount
    //   const updatedProduct = await Product.findByIdAndUpdate(
    //     product._id,
    //     { $inc: { viewCount: 1} },
    //     { new: true}
    //   ).populate('createdBy', 'username profilePicture')

    //   if (updatedProduct) {
    //     product = updatedProduct
    //   }
      
    // } 

    // convert the Mongoose document to a plain JavaScript
    // object to add average rating
    const productObj = product.toObject()

    // const ratingsArray = await Rating.find({ productId: id })
    // const totalRatings = ratingsArray.length

    // instead of fetching all ratings and calculating average in JavaScript, 
    // use MongoDB aggregation to calculate average and count in one query 
    // for better performance
    const stats = await Rating.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(id) } },
      { 
        $group: { 
          _id: null, 
          averageRating: { $avg: "$rating" }, 
          ratingCount: { $sum: 1 } 
        } 
      }
    ])

    if (stats.length > 0) {
      productObj.averageRating = Math.round(stats[0].averageRating * 10) / 10
      productObj.ratingCount = stats[0].ratingCount
    } else {
      productObj.averageRating = 0
      productObj.ratingCount = 0
    }

    // fetch individual ratings with user information
    const ratings = await Rating.find({ productId: id })
      .populate('userId', 'username profilePicture')
      .sort({ createdAt: -1 })

    productObj.ratings = ratings

    res.status(200).json({ 
      success: true, 
      data: productObj 
    })
    
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// POST /api/products/:id/view
export const incrementProductView = async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Invalid product id format",
      })
    }

    const product = await Product.findById(id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    const isOwner = req.user && String(product.createdBy) === String(req.user._id)

    if (isOwner) {
      return res.json({
        success: true,
        message: "Owner view ignored",
      })
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      })
    }

    const now = new Date()
    const twentyFourHoursAgo = new Date( now.getTime() - 24 * 60 * 60 * 1000 )

    const query = {
      productId: id,
      userId: req.user._id,
    }

    const existingView = await ProductView.findOne(query)

    if (!existingView) {
      await Product.findByIdAndUpdate(id, {
        $inc: { viewCount: 1 },
      })

      await ProductView.create({
        ...query,
        lastViewedAt: now,
      })

      console.log("Created view count")

      return res.json({
        success: true,
        message: "View counted",
      })
    }

    // over 24h
    if (existingView.lastViewedAt < twentyFourHoursAgo) {
      await Product.findByIdAndUpdate(id, {
        $inc: { viewCount: 1 },
      })

      existingView.lastViewedAt = now
      await existingView.save()

      return res.json({
        success: true,
        message: "View counted again",
      })
    }

    console.log("Already viewed")
    
    return res.json({
      success: true,
      message: "Already viewed within 24 hours",
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
}


// hybrid search
export const getProducts = async (req, res) => {
  try {
    const {
      minPrice, maxPrice, category, sort = 'recent', q = '', page = '1', limit = '0'
    } = req.query

    const limitNum = parseInt(limit) || 0 
    const pageNum = Math.max(1, parseInt(page) || 1) 
    const skipNum = limitNum > 0 ? (pageNum - 1) * limitNum : 0

    const searchQuery = String(q).trim()
    const hasSearchQuery = !!searchQuery

    const allowedCategories = [
      'seasoning', 'proteins', 'accessories', 'staple'
    ]

    // only show products with non-zero stock
    const filter = { stock: {$gt: 0} }

    if (category && category !== 'all' && allowedCategories.includes(category)) {
      filter.category = category
    }

    // filter by price range
    // treat empty strings and undefined as NaN to avoid being converted to 0
    const min = minPrice === '' || minPrice === undefined ? NaN : Number(minPrice)
    const max = maxPrice === '' || maxPrice === undefined ? NaN : Number(maxPrice)
    if (!Number.isNaN(min) || !Number.isNaN(max)) {
      filter.price = {}
      if (!Number.isNaN(min)) filter.price.$gte = min
      if ((!Number.isNaN(max))) filter.price.$lte = max
    }

    let pipeline

    // const useHybridSearch = hasSearchQuery && !!process.env.VOYAGE_API_KEY

    // if (hasSearchQuery && !useHybridSearch) {
    //   Object.assign(filter, buildProductTextFilter(searchQuery))
    // }


    if (hasSearchQuery && process.env.VOYAGE_API_KEY) {
      // Hybrid search
      const queryVector = await getQueryEmbedding(searchQuery)

      pipeline = buildProductRankFusionStage(
        searchQuery, 
        queryVector, 
        filter
      )
       
    } else if (hasSearchQuery) {
      
      // Atlas search only
      console.log("pure text search")
      const textSearchClauses = [
        { text: { query: searchQuery, path: 'name', score: { boost: { value: 8 } } } },
        { text: { query: searchQuery, path: 'category', score: { boost: { value: 4 } } } },
        { text: { query: searchQuery, path: 'origin', score: { boost: { value: 4 } } } },
        { text: { query: searchQuery, path: 'description', score: { boost: { value: 2 } } } }
      ]

      pipeline = [
        {
          $search: {
            index: PRODUCT_TEXT_SEARCH_INDEX,
            compound: {
              should: textSearchClauses,
                minimumShouldMatch: 1
            },
          }
        },
        { $match: filter },
        {
          // 通常 $search 会自动生成 score
          $addFields: {
          score: { $meta: "searchScore" }, 
          scoreDetails: null
        }
        }
      ]

    } else {
      // No search query provided
      pipeline = [{ $match: filter }]
    }

    // count how many products match the same filter
    const countPipeline = [...pipeline, { $count: 'total' }]
    

    // attach rating data to ALL products regardless of sorting method, 
    // so that frontend product cards always show the star ratings, without requiring another API request
    pipeline.push(
      {
        $lookup: {
          from: 'ratings',
          let: {
            productId: "$_id"
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$productId", "$$productId"]
                }
              }
            },
            {
              $group: {
                _id: null,
                averageRating: { $avg: "$rating" },
                ratingCount: { $sum: 1 }
              }
            }
          ],
          as: "ratingData"
        }
      },
      {
        $addFields: {
          averageRating: {
            $ifNull: [
              { $arrayElemAt: ['$ratingData.averageRating', 0] },
              0
            ]
          },
          ratingCount: {
            $ifNull: [
              { $arrayElemAt: ['$ratingData.ratingCount', 0] },
              0
            ]
          }
        }
      },
      {
        $project: {
          ratingData: 0
        }
      }
    )

    // dynamically handle projection and sorting based on query parameters
    let sortStep = hasSearchQuery ? null : { createdAt: -1 }
  
    switch (sort) {
      case 'rating':
        pipeline.push({
          $addFields: {
            // weightedRating = averageRating * ln(ratingCount + 1)
            weightedRating: {
              $multiply: [
                '$averageRating',
                {
                  $ln: { $add: ['$ratingCount', 1] }
                }
              ]
            }
          }
        })
        if (hasSearchQuery) {
          sortStep = { 
            score: -1,
            weightedRating: -1, 
            averageRating: -1, 
            ratingCount: -1, 
            createdAt: -1 
          }
        } else {
          sortStep = { 
            weightedRating: -1, 
            averageRating: -1, 
            ratingCount: -1, 
            createdAt: -1 
          }
        }
        break

      case 'price_asc':
        sortStep = { price: 1, createdAt: -1 }
        break

      case 'price_desc':
        sortStep = { price: -1, createdAt: -1 }
        break

      case 'recent':
      default:
        sortStep = hasSearchQuery ? null : { createdAt: -1 }
    }
    
    // push the determined sorting execution to the pipeline
    if (sortStep) {
      pipeline.push({ $sort: sortStep })
    }

    // count how many products match the same filter
    // const countPipeline = [...pipeline, { $count: 'total' }]

    // pagination
    if (skipNum > 0) {
      pipeline.push({ $skip: skipNum })
    }

    if (limitNum > 0) {
      pipeline.push({ $limit: limitNum })
    }

    // populate the createdBy field with the username and profile picture of the creator 
    // for quick access on the frontend 
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy'
        }
      },
      {
        // $lookup returns an array; unwind it to turn it back into a single object
        $unwind: {
          path: '$createdBy',
          preserveNullAndEmptyArrays: true // prevent product deletion if the creator is deleted
        }
      },
      {
        // project only the required user fields 
       $addFields: {
          createdBy: {
            $cond: {
              if: { $not: ['$createdBy'] },
              then: null,
              else: {
                username: '$createdBy.username',
                profilePicture: '$createdBy.profilePicture',
                _id: '$createdBy._id'
              }
            }
          }
        }
      }
    )

    const [products, totalResult, categoryCounts] = await Promise.all([
      Product.aggregate(pipeline),

      // If there is a search query, use aggregation for Atlas $search to work
      // otherwise use the simpler and cheaper countDocuments()
      hasSearchQuery ? Product.aggregate(countPipeline) : Product.countDocuments(filter),
      Product.aggregate([
        { $match: { stock: { $gt: 0 } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ])

    const total = Array.isArray(totalResult)
      ? totalResult[0]?.total || 0
      : totalResult

    const totalPages =
      limitNum > 0 ? Math.ceil(total / limitNum) : 1

    const counts = Object.fromEntries(categoryCounts.map(({ _id, count }) => [_id, count]))


    // console.log(JSON.stringify(products, null, 2))

    res.status(200).json({
      success: true,
      data: products,
      total,
      page: pageNum,
      totalPages,
      categoryCounts: counts
    })
    
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}


// GET /api/products
// text search
// export const getProducts = async (req, res) => {
//   try {
//     const {
//       minPrice, maxPrice, category, sort = 'recent', q = '', page = '1', limit = '0'
//     } = req.query

//     const limitNum = parseInt(limit) || 0 
//     const pageNum = Math.max(1, parseInt(page) || 1) 
//     const skipNum = limitNum > 0 ? (pageNum - 1) * limitNum : 0

//     // only show products with non-zero stock
//     const filter = { stock: {$gt: 0} }

//     const hasSearchQuery = !!q.trim() 
//     if (hasSearchQuery) {
//       filter.$text = { $search: q.trim() }
//     }

//     const allowedCategories = [
//       'seasoning', 'proteins', 'accessories', 'staple'
//     ]

//     if (category && category !== 'all' && allowedCategories.includes(category)) {
//       filter.category = category
//     }

//     // filter by price range
//     // treat empty strings and undefined as NaN to avoid being converted to 0
//     const min = minPrice === '' || minPrice === undefined ? NaN : Number(minPrice)
//     const max = maxPrice === '' || maxPrice === undefined ? NaN : Number(maxPrice)
//     if (!Number.isNaN(min) || !Number.isNaN(max)) {
//       filter.price = {}
//       if (!Number.isNaN(min)) filter.price.$gte = min
//       if ((!Number.isNaN(max))) filter.price.$lte = max
//     }

//     const pipeline = [{ $match: filter }]

//     // project the score early so it's available regardless of sorting method
//     if (hasSearchQuery) {
//       pipeline.push({
//         $addFields: { score: { $meta: "textScore" } }
//       })
//     }

//     // attach rating data to ALL products regardless of sorting method, 
//     // so that frontend product cards always show the star ratings
//     pipeline.push(
//       {
//         $lookup: {
//           from: 'ratings',
//           let: {
//             productId: "$_id"
//           },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $eq: ["$productId", "$$productId"]
//                 }
//               }
//             },
//             {
//               $group: {
//                 _id: null,
//                 averageRating: { $avg: "$rating" },
//                 ratingCount: { $sum: 1 }
//               }
//             }
//           ],
//           as: "ratingData"
//         }
//       },
//       {
//         $addFields: {
//           averageRating: {
//             $ifNull: [
//               { $arrayElemAt: ['$ratingData.averageRating', 0] },
//               0
//             ]
//           },
//           ratingCount: {
//             $ifNull: [
//               { $arrayElemAt: ['$ratingData.ratingCount', 0] },
//               0
//             ]
//           }
//         }
//       },
//       {
//         $project: {
//           ratingData: 0
//         }
//       }
//     )

//     // dynamically handle projection and sorting based on query parameters
//     let sortStep = { createdAt: -1 }
  
//     switch (sort) {
//       case 'rating':
//         pipeline.push({
//           $addFields: {
//             // weightedRating = averageRating * ln(ratingCount + 1)
//             weightedRating: {
//               $multiply: [
//                 '$averageRating',
//                 {
//                   $ln: { $add: ['$ratingCount', 1] }
//                 }
//               ]
//             }
//           }
//         })
//         if (hasSearchQuery) {
//           sortStep = { 
//             score: { $meta: 'textScore' },
//             weightedRating: -1, 
//             averageRating: -1, 
//             ratingCount: -1, 
//             createdAt: -1 
//           }
//         } else {
//           sortStep = { 
//             weightedRating: -1, 
//             averageRating: -1, 
//             ratingCount: -1, 
//             createdAt: -1 
//           }
//         }
//         break

//       case 'price_asc':
//         if (hasSearchQuery) {
//           sortStep = { score: { $meta: 'textScore' }, price: 1, createdAt: -1}
//         } else {
//           sortStep = { price: 1, createdAt: -1}
//         }
//         break

//       case 'price_desc':
//         if (hasSearchQuery) {
//           sortStep = { score: { $meta: 'textScore' }, price: -1, createdAt: -1}
//         } else {
//           sortStep = { price: -1, createdAt: -1}
//         }
//         break

//       case 'recent':
//       default:
//         if (hasSearchQuery) {
//           sortStep = { score: { $meta: 'textScore' }, createdAt: -1}
//         } else {
//           sortStep = { createdAt: -1 }
//         }
//     }
    
//     // push the determined sorting execution to the pipeline
//     pipeline.push({ $sort: sortStep })

//     // pagination
//     if (skipNum > 0) {
//       pipeline.push({ $skip: skipNum })
//     }

//     if (limitNum > 0) {
//       pipeline.push({ $limit: limitNum })
//     }

//     // populate the createdBy field with the username and profile picture of the creator 
//     // for quick access on the frontend 
//     pipeline.push(
//       {
//         $lookup: {
//           from: 'users',
//           localField: 'createdBy',
//           foreignField: '_id',
//           as: 'createdBy'
//         }
//       },
//       {
//         // $lookup returns an array; unwind it to turn it back into a single object
//         $unwind: {
//           path: '$createdBy',
//           preserveNullAndEmptyArrays: true // prevent product deletion if the creator is deleted
//         }
//       },
//       {
//         // project only the required user fields 
//        $addFields: {
//           createdBy: {
//             $cond: {
//               if: { $not: ['$createdBy'] },
//               then: null,
//               else: {
//                 username: '$createdBy.username',
//                 profilePicture: '$createdBy.profilePicture',
//                 _id: '$createdBy._id'
//               }
//             }
//           }
//         }
//       }
//     )

//     const [products, total, categoryCounts] = await Promise.all([
//       Product.aggregate(pipeline),
//       Product.countDocuments(filter),
//       Product.aggregate([
//         { $group: { _id: '$category', count: { $sum: 1 } } },
//       ]),
//     ])

//     const totalPages =
//       limitNum > 0 ? Math.ceil(total / limitNum) : 1

//     const counts = Object.fromEntries(categoryCounts.map(({ _id, count }) => [_id, count]))

//     res.status(200).json({
//       success: true,
//       data: products,
//       total,
//       page: pageNum,
//       totalPages,
//       categoryCounts: counts
//     })
  
//   } catch (err) {
//     console.error(err)
//     res.status(500).json({ success: false, message: 'Server error' })
//   }
// }


// PUT /api/products/:id - only creator can update their product
export const updateProduct = async (req, res) => {
  try {
    const id = req.params.id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'Invalid id' })
    }

    const product = await Product.findById(id)
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    if (String(product.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only edit your own products' })
    }

    // define allowed fields to update to prevent unwanted updates, e.g. creator, ratings, etc.
    const fields = [
      'name', 'price', 'weight', 'stock', 'description', 'coverImage', 'images', 'imageTitle', 'imageDescription',
      'category', 'specifications'
    ]

    for (const f of fields) {
      if (req.body[f] !== undefined) product[f] = req.body[f]
    }

    await product.save()
    res.json({ success: true, data: product })
  } catch (err) {
    console.log(err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// DELETE /api/products/:id - only creator can delete their product
export const deleteProduct = async (req, res) => {
  try {
    const id = req.params.id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Invalid id' })
    }

    const product = await Product.findById(id)
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    if (String(product.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only delete your own products' })
    }

    await product.deleteOne()
    res.status(200).json({ success: true, message: 'Product deleted successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}


// GET /api/products/me/list
export const getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({ createdBy: req.user._id})
      .sort({ createdAt: -1 })
      .select('name price weight origin stock description coverImage images category viewCount createdAt')
    
      return res.status(200).json({
      success: true,
      count: products.length,
      data: products
    })
    } catch (error) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// POST /api/products/:id/rating  (protect)
// 入参 { rating(1-5), orderId? }
// 校验：该买家存在此商品的 completed 且未评分订单（指定 orderId 则精确定位该单）
// 写 Rating（orderId 唯一，每单一评）并置该订单 ratedByBuyer=true
export const submitRating = async (req, res) => {
  try {
    const { id } = req.params
    const { rating, orderId } = req.body

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Invalid product id format' })
    }

    const numericRating = Number(rating)
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' })
    }

    const product = await Product.findById(id)
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    // 必须存在一个本人、该商品、已完成且尚未评分的订单
    // 前端传了 orderId 就精确定位那一单；否则取下一个未评分的已完成订单
    const orderQuery = {
      buyer: req.user._id,
      product: id,
      status: 'completed',
      ratedByBuyer: false,
    }
    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      orderQuery._id = orderId
    }
    const order = await Order.findOne(orderQuery)

    if (!order) {
      return res.status(403).json({
        success: false,
        message: 'You can only rate a product after completing an order, and only once per order',
      })
    }

    let newRating
    try {
      newRating = await Rating.create({
        userId: req.user._id,
        productId: id,
        orderId: order._id,
        rating: numericRating,
      })
    } catch (err) {
      // orderId 唯一索引冲突 → 这一单已经评过（并发重复提交防护）
      if (err.code === 11000) {
        return res.status(409).json({ success: false, message: 'You have already rated this order' })
      }
      throw err
    }

    // 置该订单已评分，防止同一订单重复评分
    order.ratedByBuyer = true
    await order.save()

    if (product.createdBy && String(product.createdBy) !== String(req.user._id)) {
      await Notification.create({
        recipient: product.createdBy,
        sender: req.user._id,
        type: 'product_rated',
        order: order._id,
        message: 'rated your product',
      })
    }

    return res.status(201).json({ success: true, data: newRating })
  } catch (err) {
    console.error('[submit-rating] error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}
