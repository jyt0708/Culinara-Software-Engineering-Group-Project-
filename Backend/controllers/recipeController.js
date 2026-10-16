import Recipe from '../models/Recipe.js'
import FreeView from '../models/FreeView.js'
import User from '../models/User.js'
import Notification from '../models/Notification.js'
import ForumPost from '../models/ForumPost.js'
import ForumPostComment from '../models/ForumPostComment.js'
import ForumNotification from '../models/ForumNotification.js'

const FREE_VIEW_LIMIT = 2
const FREE_VIEW_WINDOW_HOURS = 72
const FREE_VIEW_WINDOW_MS = FREE_VIEW_WINDOW_HOURS * 60 * 60 * 1000

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const validateRecipeBody = (body) => {
  const { title, coverImage, category, subcategory, difficulty, cookTime, ingredients, steps } = body

  if (!title || !coverImage || !category || !subcategory || !difficulty || !cookTime) {
    return 'Missing required fields'
  }
  if (!['asian', 'european', 'dessert', 'vegan'].includes(category)) {
    return 'Invalid category'
  }
  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    return 'Invalid difficulty'
  }
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return 'At least one ingredient is required'
  }
  for (const ing of ingredients) {
    if (!ing?.name?.trim()) return 'Each ingredient needs a name'
  }
  if (!Array.isArray(steps) || steps.length === 0) {
    return 'At least one step is required'
  }
  for (const s of steps) {
    if (!s?.description) return 'Each step needs a description'
    if (s.images && s.images.length > 3) return 'Each step can have at most 3 images'
  }
  return null
}

// 创建菜谱，并同步生成对应的论坛讨论帖。
export const createRecipe = async (req, res) => {
  try {
    const error = validateRecipeBody(req.body)
    if (error) return res.status(400).json({ success: false, message: error })

    const recipe = await Recipe.create({
      creator: req.user._id,
      title: req.body.title,
      coverImage: req.body.coverImage,
      coverCaptionTitle: req.body.coverCaptionTitle || '',
      coverCaptionText:  req.body.coverCaptionText  || '',
      summary: req.body.summary || '',
      category: req.body.category,
      subcategory: req.body.subcategory,
      difficulty: req.body.difficulty,
      cookTime: req.body.cookTime,
      ingredients: req.body.ingredients,
      steps: req.body.steps,
      tips: req.body.tips || [],
      linkedProducts: req.body.linkedProducts || [],
    })

    try {
      const post = await ForumPost.create({
        author: req.user._id,
        title: recipe.title,
        content: `Discussion for the recipe "${recipe.title}". Share questions, tips, and results here.`,
        category: 'Sharing',
        imageUrl: recipe.coverImage || '',
        linkedRecipe: recipe._id,
      })

      recipe.forumPost = post._id
      await recipe.save()
    } catch (forumError) {
      await Recipe.findByIdAndDelete(recipe._id)
      return res.status(500).json({
        success: false,
        message: `Recipe discussion post could not be created: ${forumError.message}`,
      })
    }

    res.status(201).json({ success: true, data: recipe })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// 获取菜谱详情，同时处理订阅和免费阅读次数限制。
export const getRecipeById = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id)
      .populate('creator', 'username profilePicture')
      .populate('forumPost', 'title category commentsCount linkedRecipe')
      .populate({
        path: 'linkedProducts',
        select: 'name price coverImage description category stock viewCount createdBy updatedAt',
        populate: {
          path: 'createdBy',
          select: 'username profilePicture',
        },
      })
    if (!recipe) return res.status(404).json({ success: false, message: 'Recipe not found' })

    const user = await User.findById(req.user._id).select('role isSubscribed subscriptionExpiry')

    // 作者、管理员和有效订阅用户不消耗免费阅读次数。
    const isOwner = String(recipe.creator._id) === String(req.user._id)
    const isSubscribed = user.isSubscribed && user.subscriptionExpiry && user.subscriptionExpiry > new Date()
    const isPrivileged = isOwner || user.role === 'admin' || isSubscribed

    if (!isPrivileged) {
      const existing = await FreeView.findOne({ userId: req.user._id, recipeId: recipe._id })
      if (!existing) {
        const count = await FreeView.countDocuments({ userId: req.user._id })
        if (count >= FREE_VIEW_LIMIT) {
          return res.status(403).json({
            success: false,
            paywalled: true,
            message: `You have viewed ${FREE_VIEW_LIMIT} free recipes in the past ${FREE_VIEW_WINDOW_HOURS} hours. Subscribe to unlock unlimited access.`,
          })
        }
        await FreeView.create({
          userId: req.user._id,
          recipeId: recipe._id,
          expireAt: new Date(Date.now() + FREE_VIEW_WINDOW_MS),
        })
      }
    }

    // 这些字段只用于响应；浏览量由单独的 view 接口增加。
    const userId = String(req.user._id)
    const recipeObj = recipe.toObject()
    recipeObj.likeCount    = recipe.likes.length
    recipeObj.dislikeCount = recipe.dislikes.length
    recipeObj.isLiked      = recipe.likes.map(String).includes(userId)
    recipeObj.isDisliked   = recipe.dislikes.map(String).includes(userId)

    res.json({ success: true, data: recipeObj })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// 单独增加浏览量，避免打开列表时误计 view。
export const incrementRecipeView = async (req, res) => {
  try {
    const recipe = await Recipe.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    ).select('viewCount')

    if (!recipe) return res.status(404).json({ success: false, message: 'Recipe not found' })

    res.json({ success: true, viewCount: recipe.viewCount })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// 更新自己的菜谱，只允许修改前端可编辑字段。
export const updateRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id)
    if (!recipe) return res.status(404).json({ success: false, message: 'Recipe not found' })
    if (String(recipe.creator) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only edit your own recipes' })
    }

    const error = validateRecipeBody(req.body)
    if (error) return res.status(400).json({ success: false, message: error })

    // 只允许更新可编辑字段，避免前端篡改 creator/viewCount。
    const fields = [
      'title', 'coverImage', 'coverCaptionTitle', 'coverCaptionText', 'summary',
      'category', 'subcategory', 'difficulty', 'cookTime',
      'ingredients', 'steps', 'tips', 'linkedProducts',
    ]
    for (const f of fields) {
      if (req.body[f] !== undefined) recipe[f] = req.body[f]
    }
    await recipe.save()
    res.json({ success: true, data: recipe })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// 删除自己的菜谱，并清理关联讨论帖数据。
export const deleteRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id)
    if (!recipe) return res.status(404).json({ success: false, message: 'Recipe not found' })
    if (String(recipe.creator) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only delete your own recipes' })
    }
    const discussionPost = recipe.forumPost
      ? await ForumPost.findById(recipe.forumPost)
      : await ForumPost.findOne({ linkedRecipe: recipe._id })

    // 删除菜谱时同步清理关联论坛帖、评论和论坛通知。
    if (discussionPost) {
      await ForumPostComment.deleteMany({ post: discussionPost._id })
      await ForumNotification.deleteMany({ forumPost: discussionPost._id })
      await discussionPost.deleteOne()
    }

    await recipe.deleteOne()
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// 获取菜谱列表，支持搜索、分类筛选和排序。
export const getRecipes = async (req, res) => {
  try {
    const {
      q = '',
      category = '',
      subcategory = '',
      difficulty = '',
      cookTime = '',
      sort = 'recent',
      limit = '0',
      page = '1',
    } = req.query
    const limitNum = parseInt(limit) || 0
    const pageNum  = Math.max(1, parseInt(page) || 1)
    const skipNum  = limitNum > 0 ? (pageNum - 1) * limitNum : 0
    const filter = {}

    if (category && ['asian', 'european', 'dessert', 'vegan'].includes(category)) {
      filter.category = category
    }

    if (subcategory) {
      filter.subcategory = { $in: subcategory.split(',').filter(Boolean) }
    }

    if (difficulty) {
      filter.difficulty = { $in: difficulty.split(',').filter(Boolean) }
    }

    if (cookTime === 'under30') filter.cookTime = { $lt: 30 }
    if (cookTime === '30to60') filter.cookTime = { $gte: 30, $lte: 60 }
    if (cookTime === 'over60') filter.cookTime = { $gt: 60 }

    if (q.trim()) {
      const keyword = new RegExp(escapeRegex(q.trim()), 'i')
      // 分类页已限定 category，只搜索标题、摘要和食材；全局页再包含分类字段。
      filter.$or = [
        { title: keyword },
        { summary: keyword },
        { 'ingredients.name': keyword },
      ]

      if (!filter.category) {
        filter.$or.push(
          { category: keyword },
          { subcategory: keyword },
        )
      }
    }

    const [recipesRaw, total, categoryCounts] = await Promise.all([
      sort === 'liked'
        ? Recipe.aggregate([
            { $match: filter },
            { $addFields: { likeCount: { $size: { $ifNull: ['$likes', []] } } } },
            { $sort: { likeCount: -1, createdAt: -1 } },
            ...(skipNum  > 0 ? [{ $skip:  skipNum  }] : []),
            ...(limitNum > 0 ? [{ $limit: limitNum }] : []),
            { $lookup: { from: 'users', localField: 'creator', foreignField: '_id', as: 'creator' } },
            { $unwind: '$creator' },
            { $project: { title: 1, coverImage: 1, summary: 1, category: 1, subcategory: 1, difficulty: 1, cookTime: 1, viewCount: 1, likeCount: 1, forumPost: 1, createdAt: 1, updatedAt: 1, 'creator._id': 1, 'creator.username': 1, 'creator.profilePicture': 1 } },
          ])
        : Recipe.find(filter)
            .populate('creator', 'username profilePicture')
            .sort(
              sort === 'quickest' ? { cookTime: 1,   createdAt: -1 } :
                                    { createdAt: -1 }
            )
            .skip(skipNum)
            .limit(limitNum)
            .select('title coverImage summary category subcategory difficulty cookTime viewCount creator forumPost createdAt updatedAt'),
      Recipe.countDocuments(filter),
      Recipe.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ])

    const recipes = recipesRaw

    const counts = Object.fromEntries(categoryCounts.map(({ _id, count }) => [_id, count]))
    const totalPages = limitNum > 0 ? Math.ceil(total / limitNum) : 1
    res.json({ success: true, data: recipes, total, page: pageNum, totalPages, categoryCounts: counts })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// 切换点赞状态，并在点赞时通知菜谱作者。
export const toggleLike = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id)
    if (!recipe) return res.status(404).json({ success: false, message: 'Recipe not found' })
    if (String(recipe.creator) === String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You cannot like your own recipe' })
    }

    const userId = String(req.user._id)
    const alreadyLiked = recipe.likes.map(String).includes(userId)

    // 点赞和点踩互斥；点赞时给菜谱作者生成通知。
    if (alreadyLiked) {
      recipe.likes.pull(req.user._id)
      await recipe.save()
      await Notification.deleteOne({
        recipient: recipe.creator,
        sender: req.user._id,
        type: 'recipe_liked',
        recipe: recipe._id,
        isRead: false,
      })
    } else {
      recipe.likes.push(req.user._id)
      recipe.dislikes.pull(req.user._id)
      await recipe.save()
      await Notification.create({
        recipient: recipe.creator,
        sender: req.user._id,
        type: 'recipe_liked',
        recipe: recipe._id,
        message: 'liked your recipe',
      })
    }
    res.json({
      success: true,
      likeCount:    recipe.likes.length,
      dislikeCount: recipe.dislikes.length,
      isLiked:    recipe.likes.map(String).includes(userId),
      isDisliked: recipe.dislikes.map(String).includes(userId),
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// 切换点踩状态，点踩和点赞保持互斥。
export const toggleDislike = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id)
    if (!recipe) return res.status(404).json({ success: false, message: 'Recipe not found' })
    if (String(recipe.creator) === String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You cannot dislike your own recipe' })
    }

    const userId = String(req.user._id)
    const alreadyDisliked = recipe.dislikes.map(String).includes(userId)

    // 点踩和点赞互斥，但点踩不会发送通知。
    if (alreadyDisliked) {
      recipe.dislikes.pull(req.user._id)
    } else {
      recipe.dislikes.push(req.user._id)
      recipe.likes.pull(req.user._id)
    }

    await recipe.save()
    res.json({
      success: true,
      likeCount:    recipe.likes.length,
      dislikeCount: recipe.dislikes.length,
      isLiked:    recipe.likes.map(String).includes(userId),
      isDisliked: recipe.dislikes.map(String).includes(userId),
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// 获取当前 creator 自己发布的菜谱。
export const getMyRecipes = async (req, res) => {
  try {
    const recipes = await Recipe.find({ creator: req.user._id })
      .sort({ createdAt: -1 })
      .select('title coverImage category subcategory difficulty cookTime viewCount forumPost createdAt linkedProducts')
      .populate('creator', 'username profilePicture')
      .populate({
        path: 'linkedProducts',
        select: 'name price coverImage description category stock viewCount createdBy updatedAt',
        populate: {
          path: 'createdBy',
          select: 'username profilePicture',
        },
      })
    
      res.json({ success: true, data: recipes })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// 获取指定 creator 的公开菜谱列表。
export const getRecipeByCreator = async (req, res) => {
  try {
    const { creatorId } = req.params
    
    const recipes = await Recipe.find({ creator: creatorId })
      .sort({ createdAt: -1 })
      .select('title coverImage category subcategory difficulty cookTime viewCount forumPost createdAt linkedProducts')
      .populate('creator', 'username profilePicture')
      .populate({
        path: 'linkedProducts',
        select: 'name price coverImage description category stock viewCount createdBy updatedAt',
        populate: {
          path: 'createdBy',
          select: 'username profilePicture',
        },
      })
    
    res.json({ success: true, data: recipes })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
