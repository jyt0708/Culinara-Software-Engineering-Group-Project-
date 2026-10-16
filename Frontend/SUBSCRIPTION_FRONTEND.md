# Subscription Frontend Changes

## Current Status

This update implements the frontend foundation for the subscription feature.

The backend payment/subscription logic has not been implemented yet.

The PayPal button is already connected to the expected frontend API calls, but it will only work after the backend routes are added.

## What Was Added

### 1. Subscription Page

New page:

```text
src/pages/SubscriptionPage.jsx
```

Route:

```text
/subscription
```

The page includes:

- Premium membership hero section
- Free user vs premium member comparison
- Monthly, quarterly, and yearly plan cards
- Current subscription status display
- Expired subscription warning
- PayPal checkout area

The design follows the previous subscription mockup, but is rebuilt with Ant Design components and the existing Culinara color style.

### 2. PayPal Subscribe Button

New component:

```text
src/components/paypal/PayPalSubscribeButton.jsx
```

Dependency added:

```text
@paypal/react-paypal-js
```

The button uses PayPal's hosted checkout UI. This means PayPal handles the payment page, wallet/card options, and secure checkout flow.

The component expects this environment variable:

```env
VITE_PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
```

If the client ID is missing, the page shows an Ant Design warning instead of breaking.

### 3. Payment API Wrapper

New file:

```text
src/apis/payment.js
```

Expected API calls:

```js
createSubscriptionOrderAPI({ planId })
captureSubscriptionOrderAPI({ orderID, planId })
```

Expected backend routes:

```text
POST /api/payments/subscription/create-order
POST /api/payments/subscription/capture-order
```

These backend routes are not implemented yet.

### 4. App Route

Updated:

```text
src/App.jsx
```

Added protected route:

```jsx
<Route path="/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
```

Only logged-in users can open the subscription page.

### 5. Profile Subscription Tab

Updated:

```text
src/pages/ProfilePage.jsx
```

Added a `Subscription` tab for normal users and creators.

The tab shows:

- Active subscription state
- Expired subscription state
- Free plan state
- Button to open `/subscription`

Admin users do not get this tab.

### 6. Recipe Paywall Link

Updated:

```text
src/pages/recipe/RecipeDetailPage.jsx
```

The paywall modal's `Subscribe` button no longer shows "coming soon".

It now redirects to:

```text
/subscription?from=/recipes/:id
```

After a successful subscription, the subscription page can return the user to the original recipe.

## Current Frontend Flow

```text
User opens a recipe
↓
Backend returns paywalled response
↓
Frontend shows paywall modal
↓
User clicks Subscribe
↓
User goes to /subscription
↓
User selects a plan
↓
User clicks PayPal button
↓
Frontend calls create-order backend API
↓
PayPal checkout opens
↓
PayPal approval calls capture-order backend API
↓
Frontend refreshes user info
```

The last backend-dependent steps will only fully work after backend implementation.

## Planned Backend Work

The backend still needs:

### 1. PayPal Config

Add PayPal Sandbox config using:

```env
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox
```

### 2. Payment Model

Suggested fields:

```js
{
  user,
  type: "subscription",
  planId,
  amount,
  currency,
  status,
  paypalOrderId,
  subscriptionStart,
  subscriptionEnd
}
```

### 3. Create Subscription Order

Backend should decide the price based on `planId`.

The frontend should not be trusted to send the real price.

### 4. Capture Subscription Order

After PayPal capture succeeds:

```js
user.isSubscribed = true
user.subscriptionExpiry = subscriptionEnd
await user.save()
```

Then create a completed Payment record.

### 5. Expiry Check

On `/api/users/me`, if the subscription is expired:

```js
user.isSubscribed = false
await user.save()
```

Do not delete `subscriptionExpiry`, so the frontend can show when the subscription expired.

### 6. Recipe Access Check

Recipe detail access should use:

```js
const hasActiveSubscription =
  user.isSubscribed === true &&
  user.subscriptionExpiry &&
  user.subscriptionExpiry > new Date()
```

If active, skip the free-view limit.

If not active, use the existing free-view paywall.

## Important Notes

- This is not automatic recurring billing.
- This is one-time PayPal payment for a fixed access period.
- PayPal hosted checkout may show PayPal wallet or card options depending on the sandbox setup.
- The project does not collect or store card numbers.
- Payment success must be trusted only after backend PayPal capture succeeds.

## Verification

Frontend build was tested successfully:

```bash
npm run build
```

The dev page responded at:

```text
http://127.0.0.1:5173/subscription
```
