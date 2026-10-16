import './loadConfig.js'
import checkoutNodeJssdk from '@paypal/checkout-server-sdk'

const environment =
  process.env.PAYPAL_MODE === 'sandbox'
    ? new checkoutNodeJssdk.core.SandboxEnvironment(
        process.env.PAYPAL_CLIENT_ID,
        process.env.PAYPAL_CLIENT_SECRET
      )
    : new checkoutNodeJssdk.core.LiveEnvironment(
        process.env.PAYPAL_CLIENT_ID,
        process.env.PAYPAL_CLIENT_SECRET
      )

export const paypalClient = new checkoutNodeJssdk.core.PayPalHttpClient(environment)
