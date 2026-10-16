import { Router } from 'express'
import { protect, requireCreator } from '../middleware/authMiddleware.js'
import {
  createRecipe,
  getRecipeById,
  updateRecipe,
  deleteRecipe,
  incrementRecipeView,
  getRecipes,
  getMyRecipes,
  toggleLike,
  toggleDislike,
  getRecipeByCreator
} from '../controllers/recipeController.js'

const router = Router()

router.post('/',          protect, requireCreator, createRecipe)
router.get('/',           protect, getRecipes)
router.get('/me/list',    protect, getMyRecipes)
router.get('/creator/:creatorId', protect, getRecipeByCreator)  
router.get('/:id',           protect, getRecipeById)
router.post('/:id/view',     protect, incrementRecipeView)
router.put('/:id',           protect, requireCreator, updateRecipe)
router.delete('/:id',        protect, requireCreator, deleteRecipe)
router.post('/:id/like',     protect, toggleLike)
router.post('/:id/dislike',  protect, toggleDislike)

export default router
