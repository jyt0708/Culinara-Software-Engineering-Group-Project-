import mongoose from 'mongoose'

const ingredientSchema = new mongoose.Schema({
  name:  { type: String, required: true, maxlength: 200 },
  image: { type: String, default: '' },
}, { _id: false })

const stepSchema = new mongoose.Schema({
  title: { type: String, maxlength: 100 },
  description: { type: String, required: true, maxlength: 2000 },
  images: [{ type: String }],
}, { _id: false })

const recipeSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  title: { type: String, required: true, maxlength: 100 },
  coverImage: { type: String, required: true },

  coverCaptionTitle: { type: String, maxlength: 100, default: '' },
  coverCaptionText:  { type: String, maxlength: 500, default: '' },

  summary: { type: String, maxlength: 500, default: '' },

  category: {
    type: String,
    enum: ['asian', 'european', 'dessert', 'vegan'],
    required: true,
  },
  subcategory: { type: String, required: true },

  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
  },
  cookTime: { type: Number, required: true, min: 1 },

  ingredients: [ingredientSchema],
  steps:       [stepSchema],
  tips:        [{ type: String, maxlength: 300 }],
  linkedProducts: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    default: [],
  },

  viewCount: { type: Number, default: 0 },
  likes:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  forumPost: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost', default: null },
}, { timestamps: true })

recipeSchema.index({ forumPost: 1 }, { unique: true, sparse: true })

const Recipe = mongoose.model('Recipe', recipeSchema)
export default Recipe
