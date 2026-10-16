import { Router } from 'express'
import { protect } from '../middleware/authMiddleware.js'
import {
  createForumPostComment,
  getCommentsByPost,
  getMyForumPostComments,
  deleteForumPostComment,
  toggleLikeForumPostComment
} from '../controllers/forumPostCommentController.js'


const router = Router()


router.post('/', protect, createForumPostComment)  
router.get('/me/list', protect, getMyForumPostComments)  
router.get('/post/:postId', protect, getCommentsByPost)  
router.delete('/:id', protect, deleteForumPostComment) 
router.post('/:id/like', protect, toggleLikeForumPostComment) 

export default router