<div align="center">
  <img src="public/favicon.png" alt="EcoCycle Logo" width="120" />
  <h1>EcoCycle Web</h1>
  <p><strong>Intelligent Waste Management & Vendor Ecosystem</strong></p>
  
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
</div>

---

## 🌿 Overview

**EcoCycle Web** is the central management hub for the EcoCycle ecosystem. It provides vendors and administrators with the tools to manage recycling requests, track customer interactions, and maintain a sustainable marketplace. Powered by AI and real-time data, it bridges the gap between waste generators and recyclers.

## ✨ Key Features

- 📊 **Vendor Dashboard**: Real-time analytics on requests, earnings, and service efficiency.
- ♻️ **Request Management**: Seamlessly handle "Sell" and "Recyle" requests from customers.
- 💬 **Real-time Messaging**: Built-in chat system for direct communication between vendors and customers.
- 🔍 **Smart Scan Admin**: Verification tools for AI-categorized waste items.
- 🛒 **Store Management**: Manage product listings and orders in the integrated EcoShop.
- 📍 **Location Intelligence**: Google Maps integration for service area management and tracking.

## 🛠 Tech Stack

- **Frontend**: React 19.2 + Vite
- **Styling**: Tailwind CSS for a modern, responsive UI
- **Backend-as-a-Service**: Firebase
  - **Firestore**: Real-time NoSQL database
  - **Authentication**: Secure multi-method login
  - **Storage**: Image and document management
  - **Hosting**: Fast and secure content delivery
- **AI Integration**: Google Generative AI (Gemini 2.0)
- **Maps**: Google Maps Extended Component Library
- **Icons**: Lucide React

## 🚀 Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- Firebase Account & Project
- Google Cloud Project (for Gemini & Maps API)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd ECOCYCLE
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file in the root directory and add your keys:
   ```env
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   VITE_FIREBASE_PROJECT_ID=your_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_OPENAI_API_KEY=your_openai_key
   VITE_GOOGLE_MAPS_API_KEY=your_maps_key
   VITE_GEMINI_API_KEY=your_gemini_key
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

## 🎨 Brand Identity

- **Primary Color**: `#E35336` (Eco Red)
- **Secondary Color**: `#F4A460` (Eco Orange)
- **Surface**: `#F5F5DC` (Eco Cream)

---

<div align="center">
  <p>Built with ❤️ for a Greener Planet</p>
</div>
