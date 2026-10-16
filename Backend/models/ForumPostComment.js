import mongoose from 'mongoose'

const forumPostCommentSchema = new mongoose.Schema({

    post: {type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost',required: true},//哪个post的回复
    author: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: {type: String, required: true, trim: true, maxlength: 1000},

    rootComment: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumPostComment', default: null},

    replyToUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    mentionUser: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

   
  }, {timestamps: true})

const ForumPostComment = mongoose.model('ForumPostComment', forumPostCommentSchema)

export default ForumPostComment