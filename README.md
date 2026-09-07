# 🎬 StreamNet - Modern Movie & TV Streaming Platform

A complete full-stack movie and TV streaming web application built with Next.js 16, React 19, Tailwind CSS, Firebase Auth, and integrated TMDB / Stream Proxy API routes designed for **100% 1-Click Vercel Deployment**.

---

## ⚡ 100% Vercel Deployment (All-in-One: Frontend + Backend)

Everything (the user interface, TMDB endpoints, search, live stream proxy, subtitles, and Firebase auth) is unified in Next.js, meaning **you do NOT need any separate backend hosting service like Render or Railway**.

### Step 1: Import on Vercel
1. Go to [Vercel.com](https://vercel.com) and log in.
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository: `004abvy/streamnet`.

### Step 2: Configure Project Settings
- **Root Directory**: Click **Edit** and choose `frontend`.
- **Framework Preset**: `Next.js` (detected automatically).

### Step 3: Add Environment Variables in Vercel
In the **Environment Variables** section, add the following:

| Name | Example Value | Description |
| :--- | :--- | :--- |
| `TMDB_API_KEY` | `a4e8c9bd39aadd7d67d8f0736c7a882a` | Your TMDB API Key |
| `TMDB_READ_TOKEN` | *(Your TMDB Read Token)* | Optional |
| `NEXT_PUBLIC_TMDB_IMAGE_URL` | `https://image.tmdb.org/t/p/w500` | TMDB Poster URL |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyC7K4isz_DrL8_yZnn90YZcDjd0LwNm8fk` | Firebase Web API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `livestream-d76b3.firebaseapp.com` | Firebase Auth Domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `livestream-d76b3` | Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `livestream-d76b3.firebasestorage.app` | Firebase Storage Bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `323939252460` | Firebase Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:323939252460:web:9296cfb72a80a377c0cdc9` | Firebase App ID |

> Note: `NEXT_PUBLIC_BACKEND_URL` is **not required** on Vercel because the API runs natively on the exact same domain!

### Step 4: Click Deploy!
Vercel will build and deploy your entire streaming platform in ~1 minute.

---

## 🔐 Firebase Authorized Domain
Once your Vercel URL is live (e.g. `streamnet.vercel.app`):
1. Go to [Firebase Console](https://console.firebase.google.com/) -> `livestream-d76b3`.
2. Go to **Authentication** -> **Settings** -> **Authorized domains**.
3. Add your Vercel domain (`your-app.vercel.app`).

---

## 💻 Local Development
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000). Both the frontend and API routes will run together smoothly.
