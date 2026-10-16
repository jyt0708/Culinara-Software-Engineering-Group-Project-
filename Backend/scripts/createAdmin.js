import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import '../config/loadConfig.js'
import User from '../models/User.js'

await mongoose.connect(process.env.MONGO_URI)

const existing = await User.findOne({ username: 'admin' })
if (existing) {
  console.log('Admin already exists:', existing.email)
  process.exit(0)
}

const hashed = await bcrypt.hash('admin123', 10)
const admin = await User.create({
  username: 'admin',
  email: 'admin@culinara.com',
  password: hashed,
  role: 'admin',
})

console.log('Admin created successfully!')
console.log('Username:', admin.username)
console.log('Email:   ', admin.email)
console.log('Password: admin123')
process.exit(0)
