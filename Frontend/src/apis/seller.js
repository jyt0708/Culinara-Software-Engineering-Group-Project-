import request from '../utils/request'

// 保存卖家收款 PayPal 邮箱：POST /api/sellers/payout-account
export const savePayoutEmailAPI = (email) => request.post('/api/sellers/payout-account', { email })

// 查本人收款绑定状态：GET /api/sellers/onboarding-status → { onboarded, paypalEmail }
export const getMyOnboardingStatusAPI = () => request.get('/api/sellers/onboarding-status')
