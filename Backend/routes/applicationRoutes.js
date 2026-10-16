import { Router } from 'express'
import multer from 'multer'
import { protect, requireUser, requireAdmin } from '../middleware/authMiddleware.js'
import {
  submitApplication,
  getMyApplication,
  getAllApplications,
  approveApplication,
  rejectApplication,
} from '../controllers/applicationController.js'

const upload = multer({ storage: multer.memoryStorage() })
const router = Router()

router.post('/',
  protect,
  requireUser,
  upload.fields([{ name: 'idDocument', maxCount: 1 }, { name: 'workProof', maxCount: 1 }]),
  submitApplication
)

router.get('/me', protect, getMyApplication)

router.get('/',             protect, requireAdmin, getAllApplications)
router.put('/:id/approve',  protect, requireAdmin, approveApplication)
router.put('/:id/reject',   protect, requireAdmin, rejectApplication)

export default router
