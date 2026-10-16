import mongoose from 'mongoose'

const forumNotificationSchema = new mongoose.Schema({

    recipient: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    sender: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    type: {
        type: String,
        required: true,
        enum: ['forum_post_liked', 'forum_post_commented', 'forum_comment_liked','forum_post_mentioned']
    },

    forumPost: {type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost', default: null},

    forumComment: {type: mongoose.Schema.Types.ObjectId, ref: 'ForumPostComment', default: null},

    message: {type: String,required: true},

    isRead: {type: Boolean,default: false}

  }, {timestamps: true})

forumNotificationSchema.index({
  recipient: 1,
  isRead: 1,
  createdAt: -1
})

const ForumNotification = mongoose.model('ForumNotification', forumNotificationSchema)

export default ForumNotification