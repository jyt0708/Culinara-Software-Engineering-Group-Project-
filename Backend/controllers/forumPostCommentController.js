import ForumPostComment from '../models/ForumPostComment.js'
import ForumPost from '../models/ForumPost.js'
import ForumNotification from '../models/ForumNotification.js'

const validateForumPostCommentBody = (body) => {
  const { post, content } = body

  if (!post || !content) {
    return 'Missing required fields'
  }

  return null
}


// CREATE COMMENT
export const createForumPostComment = async (req, res) => {
  try {
    const error = validateForumPostCommentBody(req.body)

    if (error) { return res.status(400).json({ success: false, message: error }) }

    const post = await ForumPost.findById(req.body.post)//查找回复的哪一条post

    if (!post) {
      return res.status(404).json({ success: false, message: 'Forum post not found' })
    }

    let rootComment = null
    let replyToUser = post.author

    if (req.body.replyToComment) {
      const parentComment = await ForumPostComment.findById(req.body.replyToComment)//查找回复的哪条评论

      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: 'Parent comment not found'
        })
      }

      rootComment = parentComment.rootComment || parentComment._id
      replyToUser = parentComment.author
    }

    const comment = await ForumPostComment.create({
      post: req.body.post,
      author: req.user._id,
      content: req.body.content,
      rootComment,
      replyToUser,
      mentionUser: req.body.mentionUser || null
    })

    await ForumPost.findByIdAndUpdate(req.body.post, {
      $inc: { commentsCount: 1 }
    })

    //判断是否本人回复，不是本人则发送通知,通知post作者
    if (String(post.author) !== String(req.user._id)) {
      await ForumNotification.create({
        recipient: post.author,
        sender: req.user._id,
        type: 'forum_post_commented',
        forumPost: post._id,
        forumComment: comment._id,
        message: 'commented on your forum post'
      })
    }

    //给层主发通知（非帖主）
    if ( 
        replyToUser && 
        String(replyToUser) !== String(req.user._id) && 
        String(replyToUser) !== String(post.author) 
    ) {
        await ForumNotification.create({
            recipient: replyToUser,
            sender: req.user._id,
            type: 'forum_post_commented',
            forumPost: post._id,
            forumComment: comment._id,
            message: 'replied to your comment'
        })
    }

    //给被艾特的人发送消息（同时避免重复发消息给同一个人
    if (
        req.body.mentionUser &&
        String(req.body.mentionUser) !== String(req.user._id) &&
        String(req.body.mentionUser) !== String(post.author) &&
        String(req.body.mentionUser) !== String(replyToUser)
    ) {
        await ForumNotification.create({
            recipient: req.body.mentionUser,
            sender: req.user._id,
            type: 'forum_post_mentioned',
            forumPost: post._id,
            forumComment: comment._id,
            message: 'mentioned you in a comment'
        })
    }


    res.status(201).json({ success: true, data: comment })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// READ All Comments in one post
export const getCommentsByPost = async (req, res) => {
  try {
    const comments = await ForumPostComment.find({
      post: req.params.postId
    })
      .populate('author', 'username profilePicture')
      .populate('replyToUser', 'username profilePicture')
      .populate('mentionUser', 'username profilePicture')
      .sort({ createdAt: 1 })

    const commentsWithLikeCount = comments.map((comment) => {
      const commentObj = comment.toObject()
      commentObj.likeCount = comment.likes.length
      commentObj.isLiked = comment.likes.map(String).includes(String(req.user._id))
      return commentObj
    })

    res.status(200).json({ success: true, data: commentsWithLikeCount })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message
    })
  }
}


// DELETE 
export const deleteForumPostComment = async (req, res) => {
  try {
    const comment = await ForumPostComment.findById(req.params.id)

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' })
    }

    if (String(comment.author) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only delete your own comments' })
    }

    let commentsToDelete = [comment._id]

     // 如果删除的是一级评论，就把它下面的所有回复也一起删掉
    if (!comment.rootComment) {
      const childComments = await ForumPostComment.find({rootComment: comment._id }).select('_id')

      commentsToDelete = [ 
        comment._id,
        ...childComments.map(c => c._id)
      ]
    }

    const deleteCount = commentsToDelete.length

    await ForumPostComment.deleteMany({ _id: { $in: commentsToDelete }})

    await ForumNotification.deleteMany({ forumComment: { $in: commentsToDelete }  })


    await ForumPost.findByIdAndUpdate(comment.post, {
      $inc: { commentsCount: -deleteCount }
    })



    res.status(200).json({ success: true, message: 'Comment deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}



// LIKE COMMENT
export const toggleLikeForumPostComment = async (req, res) => {
  try {
    const comment = await ForumPostComment.findById(req.params.id)

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' })
    }

    const userId = String(req.user._id)
    const isOwner = String(comment.author) === userId
    const alreadyLiked = comment.likes.map(String).includes(userId)

    if (alreadyLiked) {
      comment.likes.pull(req.user._id)

      if (!isOwner) {
        await ForumNotification.deleteOne({
          recipient: comment.author,
          sender: req.user._id,
          type: 'forum_comment_liked',
          forumPost: comment.post,
          forumComment: comment._id,
        })
      }
    } else {
      comment.likes.push(req.user._id)

      if (!isOwner) {
        await ForumNotification.create({
          recipient: comment.author,
          sender: req.user._id,
          type: 'forum_comment_liked',
          forumPost: comment.post,
          forumComment: comment._id,
          message: 'liked your comment'
        })
      }
    }

    await comment.save()

    res.status(200).json({ success: true, likeCount: comment.likes.length, isLiked: !alreadyLiked
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// READ ALL USER COMMENTS
export const getMyForumPostComments = async (req, res) => {
  try {
    const comments = await ForumPostComment.find({
      author: req.user._id
    })
      .populate('post', 'title category')
      .populate('replyToUser', 'username profilePicture')
      .populate('mentionUser', 'username profilePicture')
      .sort({ createdAt: -1 })

    const commentsWithLikeCount = comments.map((comment) => {
      const commentObj = comment.toObject()
      commentObj.likeCount = comment.likes.length
      return commentObj
    })

    res.status(200).json({ success: true, data: commentsWithLikeCount })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}