import { Router } from 'express'
import { protect, requireCreator, requireOnboardedSeller } from '../middleware/authMiddleware.js'
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getMyProducts,
  incrementProductView,
  submitRating
} from '../controllers/productController.js'

const router = Router()


// only creator can create/edit/delete products, but anyone logged in can view products
router.post('/', protect, requireCreator, requireOnboardedSeller, createProduct)
router.get('/', protect, getProducts)
router.get('/me/list',    protect, getMyProducts)   
router.get('/:id', protect, getProductById)
router.put('/:id', protect, requireCreator, updateProduct)
router.delete('/:id', protect, requireCreator, deleteProduct)
router.post('/:id/view', protect, incrementProductView)
router.post('/:id/rating', protect, submitRating)

export default router