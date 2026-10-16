import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  username:       { type: String, required: true, unique: true, trim: true },
  email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:       { type: String, required: true },
  role:           { type: String, enum: ['user', 'creator', 'admin'], default: 'user' },
  profilePicture: { type: String, default: '' },
  phoneNum:       { type: String, default: null },
  address:        { type: String, default: null },
  bio:            { type: String, default: null },
  isSubscribed:      { type: Boolean, default: false },
  subscriptionExpiry: { type: Date, default: null },
  paypalPayoutEmail: { type: String, default: null },
}, { timestamps: true })

const User = mongoose.model('User', userSchema)
export default User
