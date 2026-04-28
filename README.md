# BistroAI: Restaurant Management System

An AI-powered, production-grade restaurant management suite.

## 🚀 Features
- **AI Smart Ordering**: Gemini-powered recommendations and chatbot.
- **Real-time Orders**: Live order tracking for staff.
- **Inventory Control**: Stock level alerts and supplier management.
- **Sales Analytics**: Revenue forecasting using AI.
- **Role-Based Access**: Secure portals for Admins, Staff, and Customers.

## 🛠 Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Zustand, Recharts, Framer Motion.
- **Backend**: Node.js, Express.
- **Cloud**: Firebase (Auth, Firestore).
- **AI**: Google Gemini API.

## 📦 Setup & Installation

### Prerequisites
- Node.js 18+
- A Google Cloud Project with Gemini API enabled
- A Firebase Project (Firestore, Auth)

### Local Development
1. **Clone the Repo**:
   ```bash
   git clone https://github.com/your-username/bistro-ai.git
   cd bistro-ai
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   - Create a `.env` file based on `.env.example`.
   - Add your `GEMINI_API_KEY`.

4. **Firebase Configuration**:
   - Copy your Firebase Web Config into a file named `firebase-applet-config.json` in the root directory.
   - Deploy the rules found in `firestore.rules` to your Firebase project.

5. **Super Admin Setup**:
   - Open `firestore.rules` and replace the placeholder email in `isSuperAdmin()` with your email.
   - Similarly, update the email check in `src/pages/Dashboard.tsx` to enable the "Seed Database" button for your user.

6. **Start Dev Server**:
   ```bash
   npm run dev
   ```

## 🔐 Security Rules
The project includes a `firestore.rules` file that implements:
- Role-based access control (Admin, Staff, Customer).
- Attribute-based validation for all writes.
- Strict PII isolation.
- Temporal integrity checks for timestamps.

---
