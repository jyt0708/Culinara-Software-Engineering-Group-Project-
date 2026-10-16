import { configureStore } from '@reduxjs/toolkit'
import userReducer from './modules/userStore'

export const store = configureStore({
  reducer: {
    user: userReducer,
  },
})
