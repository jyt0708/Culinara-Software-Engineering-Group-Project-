import { Router } from 'express'
import { protect } from '../middleware/authMiddleware.js'
import {
  createForumPost,
  getForumPosts,
  getForumPostById,
  getMyForumPosts,
  updateForumPost,
  deleteForumPost,
  toggleLikeForumPost
} from '../controllers/forumPostController.js'


const router = Router()


router.get('/', protect, getForumPosts)
router.post('/', protect, createForumPost)
router.get('/me/list', protect, getMyForumPosts)
router.get('/:id', protect, getForumPostById)
router.put('/:id', protect, updateForumPost)
router.delete('/:id', protect, deleteForumPost)
router.post('/:id/like', protect, toggleLikeForumPost)

export default router