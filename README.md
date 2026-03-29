# 🍽️ Society HomeChef

A full-stack hyperlocal food delivery platform connecting home chefs, customers, and riders in a society/community setting.

---

## ✨ Features

- **3-Role System**: Chef, Customer, Rider
- **JWT Auth** with role-based middleware
- **OTP-based pickup & delivery verification** (hashed, 15min expiry, 3 attempt limit)
- **Real-time updates** via Socket.io (order status, rider assignment)
- **AI Nutrition Estimation** using Gemini API (with keyword heuristic fallback)
- **Haversine-based nearest rider assignment**
- **Atomic race-condition-safe order acceptance**
- **Responsive dark UI** with animations

---

## 🗂️ Project Structure

```
society-homechef/
├── backend/
│   ├── server.js
│   ├── .env.example
│   └── src/
│       ├── app.js
│       ├── config/db.js
│       ├── models/
│       │   ├── User.js
│       │   ├── Dish.js
│       │   └── Order.js
│       ├── middleware/auth.js
│       ├── routes/
│       │   ├── auth.js
│       │   ├── chef.js
│       │   ├── customer.js
│       │   └── rider.js
│       ├── socket/index.js
│       └── utils/
│           ├── haversine.js
│           ├── otp.js
│           └── gemini.js
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── contexts/
        │   ├── AuthContext.jsx
        │   └── SocketContext.jsx
        ├── utils/
        │   ├── api.js
        │   └── helpers.js
        ├── components/common/
        │   ├── Layout.jsx
        │   ├── StatusBadge.jsx
        │   ├── OrderTimeline.jsx
        │   ├── OTPDisplay.jsx
        │   └── OTPInput.jsx
        └── pages/
            ├── Auth/
            │   ├── AuthPage.jsx
            │   ├── ForgotPassword.jsx
            │   └── ResetPassword.jsx
            ├── Chef/ChefDashboard.jsx
            ├── Customer/CustomerDashboard.jsx
            └── Rider/RiderDashboard.jsx
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Gemini API key (optional — falls back to heuristics)

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your values:
#   MONGO_URI=mongodb://localhost:27017/society-homechef
#   JWT_SECRET=your_secret_here
#   GEMINI_API_KEY=your_gemini_key (optional)
#   FRONTEND_URL=http://localhost:5173

npm install
npm run dev
# Server starts on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# App starts on http://localhost:5173
```

---

## 🔐 Auth Flow

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/signup` | POST | Register with role |
| `/api/auth/login` | POST | Login, returns JWT |
| `/api/auth/forgot-password` | POST | Get reset token |
| `/api/auth/reset-password` | POST | Reset with token |

---

## 📦 Order Lifecycle

```
PLACED → ASSIGNED → ACCEPTED → PICKED_UP → DELIVERED
                                          → CANCELLED
```

### OTP Flow

**Pickup OTP:**
1. Rider accepts order → pickup OTP generated
2. Rider shows OTP to Chef
3. Chef enters OTP → status → `PICKED_UP`
4. Delivery OTP generated for customer

**Delivery OTP:**
1. Customer sees delivery OTP in dashboard
2. Customer shares with Rider
3. Rider enters OTP → status → `DELIVERED`

---

## 🤖 AI Nutrition

- Uses **Gemini Pro** to estimate: calories, protein, carbs, fat, fiber, health score (1-10)
- Auto-fallback to keyword heuristic if API key is missing
- Triggered on dish creation and updates

---

## ⚡ Real-time Events (Socket.io)

| Event | Emitted to |
|-------|-----------|
| `orderPlaced` | Chef |
| `orderAssigned` | Customer + Rider |
| `orderAccepted` | Customer + Chef |
| `orderPickedUp` | Customer + Rider |
| `orderDelivered` | Customer + Chef |
| `orderCancelled` | Chef + Rider |

---

## 🧪 Test Scenarios

### Full Order Lifecycle
1. Create Chef account → add a dish
2. Create Rider account → go online
3. Create Customer account → order a dish
4. Watch rider auto-assign in real-time
5. Rider accepts → Chef sees pickup OTP entry
6. Rider shows pickup OTP to Chef → Chef enters it → PICKED_UP
7. Customer sees delivery OTP
8. Customer shares OTP with Rider → Rider enters it → DELIVERED

### Race Condition Test
- Launch 2 rider browser sessions
- Both go online
- Place an order
- Only the nearest rider gets assigned (atomic update)

### OTP Expiry / Attempts
- Generate an OTP and wait 15 minutes → expired
- Enter wrong OTP 3 times → locked

---

## 🎨 Design System

- **Font**: Playfair Display (headings) + DM Sans (body) + JetBrains Mono (OTPs)
- **Theme**: Dark (`#0f0f1a` base) with saffron accents
- **Animations**: fade-in, slide-up, scale-in, shimmer, pulse
- **Components**: Glass cards, gradient text, animated status badges

---

## 📝 Environment Variables

```env
# Backend .env
PORT=5000
MONGO_URI=mongodb://localhost:27017/society-homechef
JWT_SECRET=your_super_secret_key
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

```env
# Frontend .env (optional)
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🔒 Security Notes

- Passwords hashed with **bcrypt** (salt rounds: 10)
- OTPs hashed with **bcrypt** before storing
- Reset tokens hashed with **SHA-256**
- JWT expires in **7 days**
- Role-based middleware on all protected routes
- Atomic MongoDB operations prevent race conditions

## 🔑 Demo Credentials

Use the following credentials to test different roles in the application:

### Customer

* Email: `test1@gmail.com`
    * Password: `123456`

### Chef

* Email: `test3@gmail.com`
* Password: `123456`

### Rider

* Email: `test2@gmail.com`
* Password: `123456`
