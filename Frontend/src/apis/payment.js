import request from '../utils/request'

export const createSubscriptionOrderAPI = (data) =>
  request.post('/api/payments/subscription/create-order', data)

export const captureSubscriptionOrderAPI = (data) =>
  request.post('/api/payments/subscription/capture-order', data)
