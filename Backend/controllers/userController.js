import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import cloudinary from '../config/cloudinary.js'
import Product from '../models/Product.js'
import Recipe from '../models/Recipe.js'
import ForumPost from '../models/ForumPost.js'

// 上传头像到 Cloudinary，返回图片 URL。
const uploadToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) reject(err)
      else resolve(result.secure_url)
    })
    stream.end(buffer)
  })

// 获取当前登录用户信息，返回给 Profile 页面使用。
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password')
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    res.json({ success: true, data: user })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// 更新 Profile 信息，支持用户名、密码、手机号、地址和头像。
export const updateMe = async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword, phoneNum, address } = req.body
    const user = await User.findById(req.user._id)

    // 修改用户名时先检查是否被别人占用。
    if (username && username !== user.username) {
      const taken = await User.findOne({ username })
      if (taken) return res.status(409).json({ success: false, message: 'Username already taken' })
      user.username = username
    }

    // 邮箱逻辑保留；目前前端不开放邮箱修改。
    if (email && email !== user.email) {
      const taken = await User.findOne({ email })
      if (taken) return res.status(409).json({ success: false, message: 'Email already taken' })
      user.email = email
    }

    // 修改密码必须验证当前密码，避免被误改。
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ success: false, message: 'Current password required' })
      const match = await bcrypt.compare(currentPassword, user.password)
      if (!match) return res.status(400).json({ success: false, message: 'Current password is incorrect' })
      user.password = await bcrypt.hash(newPassword, 10)
    }

    // 有新头像时上传到 Cloudinary 并保存 URL。
    if (req.file) {
      user.profilePicture = await uploadToCloudinary(req.file.buffer, 'users')
    }

    // 没传字段就不改，空字符串表示用户主动清空。
    if (phoneNum !== undefined) user.phoneNum = phoneNum || null
    if (address !== undefined) user.address = address || null

    await user.save()

    // 返回更新后的用户信息，密码不返回前端。
    const updated = user.toObject()
    delete updated.password
    res.json({ success: true, data: updated })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/users/search?q=alex
export const searchUsers = async (req, res) => {
  try {
    const q = (req.query.q || '').trim()

    if (!q) {
      return res.status(200).json({ success: true, data: [] })
    }

    const keyword = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

    const users = await User.find({
      _id: { $ne: req.user._id },
      username: keyword,
    })
      .select('username profilePicture role')
      .limit(10)

    res.status(200).json({ success: true, data: users })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}


// GET /api/users/:id
export const getCreatorProfile = async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Invalid user id format',
      })
    }

    const user = await User.findById(id).select('username role profilePicture bio')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    const creatorId = new mongoose.Types.ObjectId(id)

    const [
      productCount,
      recipeCount,
      forumCount,
      recipeLikes,
      forumLikes,
      latestRecipes,
      latestProducts,
      latestForumPosts,
    ] =
    await Promise.all([
      Product.countDocuments({
        createdBy: creatorId,
      }),
      Recipe.countDocuments({
        creator: creatorId,
      }),
      ForumPost.countDocuments({
        author: creatorId,
      }),
      Recipe.aggregate([
        { $match: { creator: creatorId } },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $size: { $ifNull: ['$likes', []] },
              },
            },
          },
        },
      ]),
      ForumPost.aggregate([
        { $match: { author: creatorId } },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $size: { $ifNull: ['$likes', []] },
              },
            },
          },
        },
      ]),

      Recipe.find({ creator: creatorId })
        .populate('creator', 'username profilePicture')
        .sort({ createdAt: -1 })
        .select('title coverImage summary category subcategory difficulty cookTime viewCount creator createdAt updatedAt'),
      
      Product.find({ createdBy: creatorId })
      .populate('createdBy', 'username profilePicture')
      .sort({ createdAt: -1 })
      .select('name price coverImage description category stock viewCount createdBy createdAt updatedAt'),
    
      ForumPost.find({ author: creatorId })
      .populate('author', 'username profilePicture')
      .populate('mentionUser', 'username')
      .populate('linkedRecipe', 'title coverImage')
      .sort({ createdAt: -1 })
      .select('title content category imageUrl commentsCount likes author mentionUser linkedRecipe createdAt updatedAt'),
    ])

    const likeCount = (recipeLikes[0]?.total || 0) + (forumLikes[0]?.total || 0)
    const userId = String(req.user._id)
    const forumPosts = latestForumPosts.map((post) => {
      const postObj = post.toObject()
      postObj.likeCount = post.likes.length
      postObj.isLiked = post.likes.map(String).includes(userId)
      return postObj
    })

    return res.status(200).json({
      success: true,
      data: {
        creator: user,
        stats: {
          productCount,
          recipeCount,
          forumCount,
          likeCount,
        },
        published: {
          recipes: latestRecipes,
          products: latestProducts,
          forumPosts,
        },
      }
    })

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    })
  }
}
