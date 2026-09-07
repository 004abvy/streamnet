# 🎬 CinePulse - Modern Movie & TV Streaming Platform

A full-stack, responsive movie and TV series streaming web application built with Next.js 16, React 19, Tailwind CSS, Firebase Auth, and Node.js/Express with TMDB integration.

---

## 📁 Repository Structure

```
movie-streaming-platform/
├── backend/               # Node.js + Express API Server
│   ├── server.js          # TMDB API routes, caching, and stream proxy endpoints
│   ├── package.json
│   └── .env.example
├── frontend/              # Next.js 16 Frontend App (React 19, Tailwind CSS)
│   ├── app/               # Next.js App Router (Movies, TV, Anime, Live TV, Watch, Auth)
│   ├── components/        # Reusable UI components & video players
│   ├── context/           # Auth and global state
│   ├── package.json
│   └── .env.example
├── .gitignore             # Root gitignore protecting API keys and credentials
└── README.md
```

---

## 🚀 Step-by-Step Deployment Guide

### Step 1: Upload to GitHub

1. Create a new empty repository on [GitHub](https://github.com/new) (e.g. `movie-streaming-platform`). Do not initialize with README or license.
2. In your local terminal at the project root:
   ```bash
   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 2: Deploy the Backend (e.g., Render / Railway)

The backend needs to run on a Node.js hosting platform (like **[Render.com](https://render.com)** or **Railway.app**).

#### On Render.com (Free & Simple):
1. Sign up / Log in to [Render](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Name**: `cinepulse-backend` (or your choice)
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Under **Environment Variables**, add:
   - `PORT`: `5000`
   - `TMDB_API_KEY`: *(Your TMDB API Key)*
   - `TMDB_READ_TOKEN`: *(Your TMDB Read Access Token)*
6. Click **Deploy Web Service**.
7. Copy your deployed backend URL (e.g. `https://cinepulse-backend.onrender.com`).

---

### Step 3: Deploy the Frontend to Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository (`movie-streaming-platform`).
4. In the project configuration:
   - **Root Directory**: Click *Edit* and select `frontend`.
   - **Framework Preset**: `Next.js` (detected automatically).
5. In the **Environment Variables** section, add the following variables:
   - `NEXT_PUBLIC_BACKEND_URL`: `https://cinepulse-backend.onrender.com` *(use your actual backend URL from Step 2, without trailing slash)*
   - `NEXT_PUBLIC_TMDB_IMAGE_URL`: `https://image.tmdb.org/t/p/w500`
   - `NEXT_PUBLIC_FIREBASE_API_KEY`: *(Your Firebase API Key)*
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: *(Your Firebase Auth Domain)*
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: *(Your Firebase Project ID)*
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: *(Your Firebase Storage Bucket)*
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: *(Your Firebase Sender ID)*
   - `NEXT_PUBLIC_FIREBASE_APP_ID`: *(Your Firebase App ID)*
6. Click **Deploy**.

---

## 💻 Local Development

1. **Backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   Runs on `http://localhost:5000`.

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open `http://localhost:3000`.
