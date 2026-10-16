// PayPal REST 层：用 Node 内置 fetch 直接调 PayPal REST API
// 与 config/paypal.js（@paypal/checkout-server-sdk，仅 Orders v2）并存，互不影响
// 这里负责 checkout-server-sdk 未覆盖的 REST 调用（如卖家分账 Payouts）

// sandbox / live 切换逻辑与 paypal.js 保持一致（同一个 PAYPAL_MODE 来源）
import './loadConfig.js'

export const PP_BASE =
  process.env.PAYPAL_MODE === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com'

// 内存级 access token 缓存：避免每次请求都重新换 token
// 结构：{ token, expiresAt(ms) }；提前 60s 过期，留出时钟/网络余量
let tokenCache = { token: null, expiresAt: 0 }

// 换取 OAuth2 access token（client_credentials 模式 + HTTP Basic）
// 命中缓存且未过期 → 直接复用；否则重新请求并刷新缓存
export const getAccessToken = async () => {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token
  }

  const basic = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${PP_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PayPal token request failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  // expires_in 是秒；提前 60s 过期
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }
  return tokenCache.token
}

// 统一 REST 调用入口：自动注入 Bearer token、Content-Type
// method  HTTP 动词
// path    绝对 URL 或相对 PP_BASE 的路径（如 '/v1/payments/payouts'）
// body    传入则 JSON 序列化
// headers 调用方附加/覆盖的 header
export const ppFetch = async (method, path, body, headers = {}) => {
  const token = await getAccessToken()
  const url = path.startsWith('http') ? path : `${PP_BASE}${path}`

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`PayPal REST ${method} ${url} failed: ${res.status} ${text}`)
  }
  return text ? JSON.parse(text) : {}
}
