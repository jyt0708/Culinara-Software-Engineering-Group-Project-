import mongoose from 'mongoose'

const ratingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    // 每条评分绑定到一个具体订单：同一商品买多次 → 每次完成的订单都能各评一次
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
)

// 一个订单只能评一次（而不是一个商品只能评一次）——允许同一用户对同商品多次购买各评一次
ratingSchema.index(
  { orderId: 1 },
  { unique: true }
)

const Rating = mongoose.model('Rating', ratingSchema)

// product specifications subdocument schema (optional)
const productSpecSchema = new mongoose.Schema({
  name: { type: String, maxlength: 50, default: '' },
  value: { type: String, maxlength: 200, default: '' },
}, { _id: false })


const productSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true, maxlength: 50 },
  price:        { type: Number, required: true, min: 0 },
  weight:       { type: Number, required: true, min: 0 },
  origin:       { type: String,  required: true },
  stock:        { type: Number, required: true, min: 0 },
  description:  { type: String, required: true, maxlength: 1000 },
  coverImage:   { type: String, required: true },
  images:       [{ type: String }],
  imageTitle:   { type: String, default: '', maxlength: 50  },
  imageDescription: { type: String, default: '', maxlength: 300 },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // save the userId of the creator
  category:     { 
    type: String, 
    enum: ['seasoning', 'proteins', 'accessories', 'staple'],
    required: true 
  }, // category field for easier filtering on the frontend  
  //  remove ratings from product schema to prevent null ratings when product is first created, instead create a separate Rating model
  // ratings:      [ratingSchema],  
  specifications: [productSpecSchema],
  viewCount: { type: Number, default: 0 },
  plot_embedding_voyage_3_large: {
    type: [Number],
    required: true 
  }
}, { timestamps: true })

// text index for weighted text search
// productSchema.index(
//   {
//     name: 'text',
//     description: 'text',
//     category: 'text',
//     origin: 'text'
//   },
//   {
//     weights: {
//     name: 10,
//     description: 1,
//     category: 5,
//     origin: 5
//   }
// })

const Product = mongoose.model('Product', productSchema)
export { Rating }
export default Product

