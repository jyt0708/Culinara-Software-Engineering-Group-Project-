import '../config/loadConfig.js'
import mongoose from 'mongoose'
import connectDB from '../config/db.js'
import User from '../models/User.js'

const username = process.argv[2] || 'chefzhang'
const expiry = new Date(Date.now() - 24 * 60 * 60 * 1000)

try {
  await connectDB()

  const user = await User.findOneAndUpdate(
    { username },
    {
      isSubscribed: true,
      subscriptionExpiry: expiry,
    },
    { new: true }
  ).select('username email isSubscribed subscriptionExpiry')

  if (!user) {
    console.error(`User not found: ${username}`)
    process.exitCode = 1
  } else {
    console.log('Subscription set to expired for testing:')
    console.log({
      username: user.username,
      email: user.email,
      isSubscribed: user.isSubscribed,
      subscriptionExpiry: user.subscriptionExpiry,
    })
  }
} catch (err) {
  console.error('Failed to expire subscription:', err)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
