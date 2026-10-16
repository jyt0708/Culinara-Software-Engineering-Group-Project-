import User from '../models/User.js'

// 基础邮箱格式校验：非空 + 形如 a@b.c
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST /api/sellers/payout-account  (protect + requireCreator)
// 入参 { email }：卖家保存收款用的 PayPal 邮箱（Payouts 模型，无浏览器 onboarding）
// 有值 ⇔ 卖家可收款；返回 { success:true, onboarded:true, paypalEmail }
export const savePayoutEmail = async (req, res) => {
  try {
    const { email } = req.body
    if (!email || !String(email).trim() || !EMAIL_RE.test(String(email).trim())) {
      return res.status(400).json({ success: false, message: 'A valid PayPal email is required' })
    }

    const user = await User.findById(req.user._id)
    user.paypalPayoutEmail = email.trim()
    await user.save()

    return res.status(200).json({
      success: true,
      onboarded: true,
      paypalEmail: user.paypalPayoutEmail,
    })
  } catch (err) {
    console.error('[save-payout-email] error:', err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/sellers/onboarding-status  (protect + requireCreator)
// 读当前用户 paypalPayoutEmail，返回 { success:true, onboarded:boolean, paypalEmail }
export const getOnboardingStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('paypalPayoutEmail')
    return res.status(200).json({
      success: true,
      onboarded: !!user.paypalPayoutEmail,
      paypalEmail: user.paypalPayoutEmail || null,
    })
  } catch (err) {
    console.error('[onboarding-status] error:', err)
    return res.status(500).json({ success: false, message: err.message })
  }
}
