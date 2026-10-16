# Culinara

> A community-driven cooking platform where users can explore recipes, join food discussions, buy and sell marketplace products, and unlock premium recipe access through subscriptions.

## Project Overview

**Culinara** is a full-stack MERN web application for cooking communities. Users can register, log in, browse recipes, join forum discussions, purchase marketplace products, and subscribe for unlimited recipe access.

This project is built as part of the *Software Engineering for Business Applications* course at TUM.

## Features

Culinara consists of the following main sections:

| Section | Description |
|---------|-------------|
| Home | Landing page with access to the main platform areas |
| Recipes | Browse, search, filter, like, and view detailed step-by-step recipes |
| Recipe Creation | Creator-only recipe publishing with images, ingredients, steps, tips, and linked products |
| Subscription | PayPal-based premium subscription for unlimited recipe access |
| Paywall | Free users can view a limited number of recipes before subscribing |
| Forum | Community discussions for posts, comments, likes, and mentions |
| Marketplace | Buy and sell food-related products with PayPal checkout |
| Profile | Manage user information, subscriptions, recipes, orders, sales, comments, and notifications |
| Admin | Review and approve or reject creator applications only |
| Auth | Registration, login, JWT token-based sessions, and protected routes |


## Demo Accounts and PayPal Sandbox Access

These accounts are provided for evaluation and testing. PayPal accounts use the sandbox environment, so no real money is involved.

### Application Login Accounts

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Creator/User | `chefzhang` | `123456` |
| User | `Alex` | `123456` |
| Creator/User | `andrewbao` | `1234567` |
| Creator/User | `Xinyu` | `123456` |
| Creator/User | `Yutong` | `888888` |

Admin note:

- The admin account is only used to review creator applications.
- After logging in as admin, click **Admin** next to the notification bell to open the application review page.

### PayPal Sandbox Accounts

| Purpose | Email | Password |
|---------|-------|----------|
| Seller account | `wenyuan.seller@business.example.com` | `abc123456` |
| Buyer account | `wenyuan.buyer@personal.example.com` | `abc123456` |
| Buyer account | `bao1@personal.example.com` | `abc123456` |
| Platform account | `wenyuan.partner@business.example.com` | `abc123456` |


## Example Testing Flow

1. Log in with a demo account.
2. Browse recipes from the Recipes page.
3. Open recipe details and test the free-view limit: free users can view 2 different recipes within 72 hours.
4. Subscribe with a PayPal sandbox account to unlock unlimited recipe access.
5. Use a creator account to create or edit recipes. 
6. Use the admin account to review creator applications.
7. Browse marketplace products and complete a sandbox PayPal checkout.
8. Visit the forum to create posts, comments, and interact with discussions.

## Notes

- Recipe detail access is limited for free users and unlimited for active subscribers.
- Creator-only pages are protected by role checks.
- Admin pages are protected and only available to admin users.
- Marketplace and subscription payments are for sandbox testing only.


## 1. Start the App with Docker

1. Create 'Team X' folder.
2. git clone https://gitlab.lrz.de/seba-master-2026-21453271/team-19/Frontend.git
3. git clone https://gitlab.lrz.de/seba-master-2026-21453271/team-19/Backend.git
4. Move the Backend/docker-compose.yml from on folder up
5. docker-compose up -d
6. Open your browser and visit http://localhost:5173.


### 2. Configuration

This project uses `config.js` files instead of `.env` files.

Backend configuration:

```text
Backend/config.js
```

Frontend configuration:

```text
Frontend/config.js
```

The backend loads `config.js` into `process.env` through `config/loadConfig.js`. The frontend loads `Frontend/config.js` through `vite.config.js` and exposes `VITE_` values through `import.meta.env`.


### 3. URLs

The frontend runs on:

```text
http://localhost:5173
```

The backend runs on:

```text
http://localhost:5000
```


## Tech Stack

### Frontend

- **React 18** - UI library for building interactive interfaces
- **Vite** - Development server and build tool
- **Ant Design** - UI component library
- **Redux Toolkit** - Global user/session state management
- **React Router DOM** - Routing and protected pages
- **Axios** - HTTP client
- **@paypal/react-paypal-js** - PayPal checkout and subscription buttons

### Backend

- **Node.js + Express.js** - REST API server
- **MongoDB + Mongoose** - Database and schema modeling
- **JWT** - Authentication and protected routes
- **Zod** - Request validation
- **bcryptjs** - Password hashing
- **multer** - File upload handling
- **Cloudinary** - Image and document storage
- **@paypal/checkout-server-sdk** - PayPal order creation and capture




