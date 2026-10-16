import mongoose from 'mongoose'
import Product from '../models/Product.js'
import './loadConfig.js'

const VOYAGE_EMBEDDING_MODEL = 'voyage-3-large'
const VOYAGE_EMBEDDING_DIMENSIONS = 2048


const getDocumentEmbedding = async (text) => {
  if (!process.env.VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY is not configured in config.js')
  }

  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: VOYAGE_EMBEDDING_MODEL,
      input: [text],
      input_type: 'document', 
      output_dimension: VOYAGE_EMBEDDING_DIMENSIONS
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Voyage API error: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  return result?.data?.[0]?.embedding
}

const runMigration = async () => {
  try {
    await mongoose.connect(Backend/config/db.js)
    console.log('成功连接到 MongoDB 数据库...')

   
    const oldProducts = await Product.find({
      plot_embedding_voyage_3_large: { $exists: false }
    })

    if (oldProducts.length === 0) {
      console.log('没有找到缺失向量的商品，数据已经是最新状态！')
      process.exit(0)
    }

    console.log(`共发现 ${oldProducts.length} 个历史商品缺少向量数据，开始迁移...`)

    // 循环逐个更新
    for (let i = 0; i < oldProducts.length; i++) {
      const product = oldProducts[i]
      console.log(`[${i + 1}/${oldProducts.length}] 正在为商品 [${product.name}] 生成语义向量...`)

      // 保持和 createProduct 一致的文本拼接格式
      const textToEmbed = `Product Name: ${product.name}. Category: ${product.category}. Origin: ${product.origin}. Description: ${product.description}`

      try {
        // 调用 Voyage AI 获取向量
        const embedding = await getDocumentEmbedding(textToEmbed)

        if (Array.isArray(embedding) && embedding.length === VOYAGE_EMBEDDING_DIMENSIONS) {
          // 赋值并保存
          product.plot_embedding_voyage_3_large = embedding
          await product.save()
          console.log(`✅ [${product.name}] 向量更新成功！`)
        } else {
          console.error(`❌ [${product.name}] 未能获取到合法的 2048 维向量`)
        }
      } catch (err) {
        console.error(`❌ [${product.name}] 生成向量失败:`, err.message)
      }

      // 节流：每处理完一条数据，强制等待 500 毫秒，防止由于免费账户触发 Rate Limit
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    console.log('🎉 所有历史数据的向量补充完毕！')
    process.exit(0)
  } catch (error) {
    console.error('迁移过程中发生致命错误:', error)
    process.exit(1)
  }
}

runMigration()
