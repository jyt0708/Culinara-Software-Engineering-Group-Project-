import mongoose from 'mongoose'


const forumPostSchema = new mongoose.Schema({

    author: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    title: {type: String, required: true, trim: true, maxlength: 100},//trim:自动去掉前后空格

    content: {type: String, required: true, trim: true, maxlength: 1000},

    category: {
        type: String,
        required: true,
        enum: ['Newbie Corner', 'Sharing', 'Shopping', 'General Discussion',]
    },

    imageUrl: {type: String,default: ''},

    mentionUser: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    linkedRecipe: {type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', default: null},

    commentsCount: {type: Number, default: 0}
  }, {timestamps: true})

forumPostSchema.index({ linkedRecipe: 1 }, { unique: true, sparse: true })

const ForumPost = mongoose.model('ForumPost', forumPostSchema)

export default ForumPost
