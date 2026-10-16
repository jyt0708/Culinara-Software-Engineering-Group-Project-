import ForumPost from '../models/ForumPost.js'
import ForumPostComment from '../models/ForumPostComment.js'
import ForumNotification from '../models/ForumNotification.js'


const validateForumPostBody = (body) => {
  const { title, content, category } = body

  if (!title || !content || !category) {
    return 'Missing required fields'
  }

  if (!['Newbie Corner', 'Sharing', 'Shopping', 'General Discussion'].includes(category)) {
    return 'Invalid category'
  }

  return null
}

// CREATE
export const createForumPost = async (req, res) => {
  try {
    const error = validateForumPostBody(req.body)

    if (error) {return res.status(400).json({  success: false, message: error })}

    const post = await ForumPost.create({
        author: req.user._id,
        title: req.body.title,
        content: req.body.content,
        category: req.body.category,
        imageUrl: req.body.imageUrl || '',
        mentionUser: req.body.mentionUser || null,
        linkedRecipe: req.body.linkedRecipe || null
    })

    //通知被提到的人
    if (
      req.body.mentionUser &&
      String(req.body.mentionUser) !== String(req.user._id)
    ) {
      await ForumNotification.create({
        recipient: req.body.mentionUser,
        sender: req.user._id,
        type: 'forum_post_mentioned',
        forumPost: post._id,
        message: 'mentioned you in a forum post'
      })
    }

    res.status(201).json({ success: true, data: post })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// READ ONE POST
export const getForumPostById = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id)
      .populate('author', 'username profilePicture')
      .populate('mentionUser', 'username')
      .populate('linkedRecipe', 'title coverImage')
      
    if (!post) {
      return res.status(404).json({ success: false, message: 'Forum post not found' })
    }

 
    const postObj = post.toObject()
    postObj.likeCount = post.likes.length

    const userId = String(req.user._id)
    postObj.isLiked = post.likes.map(String).includes(userId)

    res.status(200).json({ success: true, data: postObj })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// READ ALL POSTS
export const getForumPosts = async (req, res) => {
  try {
    const {
      q = '',
      sort = 'recent',
      category = '',
      limit = '0',
      page = '1'
    } = req.query

    const limitNum = parseInt(limit) || 0
    const pageNum = Math.max(1, parseInt(page) || 1)
    const skipNum = limitNum > 0 ? (pageNum - 1) * limitNum : 0

    const filter = {}

    const allowedCategories = [
      'Newbie Corner',
      'Sharing',
      'Shopping',
      'General Discussion'
    ]

    if (category && allowedCategories.includes(category)) {
      filter.category = category
    }

    if (q.trim()) {
      const keyword = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

      filter.$or = [
        { title: keyword },
        { content: keyword },
      ]
    }
    let posts

    if (sort === 'liked') {
      const pipeline = [
        { $match: filter },
        {
          $addFields: {
            likeCount: { $size: { $ifNull: ['$likes', []] } }
          }
        },
        { $sort: { likeCount: -1, createdAt: -1 } },
      ]

      //根据当前页码跳过数据，并限制返回数量。
      if (skipNum > 0) {
        pipeline.push({ $skip: skipNum })
      }

      if (limitNum > 0) {
        pipeline.push({ $limit: limitNum })
      }

      pipeline.push(
        //类似于.populate()
        {
          $lookup: {
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'author'
          }
        },
        {
          $unwind: {
            path: '$author',
            preserveNullAndEmptyArrays: true
          }
        },
        
        {
          $lookup: {
            from: 'users',
            localField: 'mentionUser',
            foreignField: '_id',
            as: 'mentionUser'
          }
        },
        {
          $unwind: {
            path: '$mentionUser',
            preserveNullAndEmptyArrays: true
          }
        },

        {
          $lookup: {
            from: 'recipes',
            localField: 'linkedRecipe',
            foreignField: '_id',
            as: 'linkedRecipe'
          }
        },
        {
          $unwind: {
            path: '$linkedRecipe',
            preserveNullAndEmptyArrays: true
          }
        },
        //限制返回字段,避免把关联对象中的密码等不需要的数据返回给前端。
        {
          $project: {
            title: 1,
            content: 1,
            category: 1,
            imageUrl: 1,
            commentsCount: 1,
            likes: 1,
            likeCount: 1,
            createdAt: 1,
            updatedAt: 1,
            'author._id': 1,
            'author.username': 1,
            'author.profilePicture': 1,
            'mentionUser._id': 1,
            'mentionUser.username': 1,
            'linkedRecipe._id': 1,
            'linkedRecipe.title': 1,
            'linkedRecipe.coverImage': 1,
          }
        }
      )
      posts = await ForumPost.aggregate(pipeline)
    } else {
        const postsRaw = await ForumPost.find(filter)
        .populate('author', 'username profilePicture')
        .populate('mentionUser', 'username')
        .populate('linkedRecipe', 'title coverImage')
        .sort({ createdAt: -1 })
        .skip(skipNum)
        .limit(limitNum)
        
        posts = postsRaw.map((post) => post.toObject())
    }

    const total = await ForumPost.countDocuments(filter)

    const userId = String(req.user._id)

    const postsWithLikeCount = posts.map((post) => {
      const likes = post.likes || []
      return {
        ...post,
        likeCount: post.likeCount ?? likes.length,
        isLiked: likes.map(String).includes(userId)
      }
    })


    const totalPages = limitNum > 0 ? Math.ceil(total / limitNum) : 1

    res.status(200).json({
      success: true,
      data: postsWithLikeCount,
      total,
      page: pageNum,
      totalPages,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// READ ALL userPosts
export const getMyForumPosts = async (req, res) => {
  try {
    const posts = await ForumPost.find({ author: req.user._id })
      .sort({ createdAt: -1 })
      .select('title content category imageUrl commentsCount likes linkedRecipe mentionUser createdAt updatedAt')

    const postsWithLikeCount = posts.map((post) => {
      const postObj = post.toObject()
      postObj.likeCount = post.likes.length
      return postObj
    })

    res.json({success: true, data: postsWithLikeCount })
  } catch (error) {
    res.status(500).json({success: false, message: error.message})
  }
}


// UPDATE
export const updateForumPost = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ success: false, message: 'Forum post not found' })
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only edit your own posts' })
    }

    const fields = [
      'title',
      'content',
      'category',
      'imageUrl',
      'mentionUser',
    ]

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        post[field] = req.body[field]
      }
    }

    await post.save()
    res.status(200).json({success: true, data: post})
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// DELETE
export const deleteForumPost = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id)

    if (!post) {
      return res.status(404).json({success: false,message: 'Forum post not found' })
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete your own posts' })
    }

    if (post.linkedRecipe) {
      return res.status(400).json({
        success: false,
        message: 'Recipe discussion posts cannot be deleted separately. Delete the recipe instead.',
      })
    }

    await ForumPostComment.deleteMany({ post: post._id })// 删除这个帖子下面的所有评论

    await ForumNotification.deleteMany({ forumPost: post._id })//删除帖子相关通知

    await post.deleteOne()// 删除帖子本身

    res.status(200).json({ success: true, message: 'Forum post deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// LIKE 
export const toggleLikeForumPost = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ success: false, message: 'Forum post not found' })
    }

    const userId = req.user._id.toString()
    const isOwner = String(post.author) === String(req.user._id)
    const alreadyLiked = post.likes.map(String).includes(userId)

    if (alreadyLiked) {
      post.likes.pull(req.user._id)

      if (!isOwner) {
        await ForumNotification.deleteOne({
          recipient: post.author,
          sender: req.user._id,
          type: 'forum_post_liked',
          forumPost: post._id,
        })
      }
    } else {
      post.likes.push(req.user._id)


      if (!isOwner) {
        await ForumNotification.create({
          recipient: post.author,
          sender: req.user._id,
          type: 'forum_post_liked',
          forumPost: post._id,
          message: 'liked your forum post'
        })
      }
    }

    await post.save()

    res.status(200).json({ success: true,
      likesCount: post.likes.length,
      liked: !alreadyLiked
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
