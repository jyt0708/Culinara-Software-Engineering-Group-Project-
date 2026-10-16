import { Router } from 'express'
import multer from 'multer'
import { register, login } from '../controllers/authController.js'

const router = Router()

const upload = multer({ storage: multer.memoryStorage() })

router.post('/register', upload.single('profilePicture'), register)
router.post('/login', login)

export default router
