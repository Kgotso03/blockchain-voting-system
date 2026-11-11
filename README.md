# BlockVote — Decentralized Blockchain Voting System

A 100% client-side, browser-based blockchain voting system featuring Proof-of-Work (SHA-256) mining, multi-category ballot support, candidate management with photo uploads, real-time results visualization, and global multi-device synchronization via Google Firebase.

## ✨ Features

- **Real Proof-of-Work Blockchain**: Built with SHA-256 cryptographic hashing (Difficulty: 2). Every voter registration, candidate entry, and vote is mined into an immutable block.
- **Multi-Category Ballot**: Support for multiple offices/positions (President, Vice President, Governor, Senator, Mayor, Treasurer, etc.). Voters cast 1 vote per category.
- **Dynamic Category Management**: Admins can create and manage custom positions on the fly.
- **Admin Control Panel**: Add candidates with photos (automatic client-side compression), assign political parties, view all registered voters, manage categories, and audit blockchain blocks.
- **Real-Time Visualizations**: Dynamic bar & doughnut charts powered by Chart.js.
- **Simulated & Web3 Wallets**: Automatic simulated cryptographic wallet generation per voter, with optional MetaMask Web3 wallet connectivity.
- **Global Multi-User Sync (Firebase)**: Connect a free Firebase Realtime Database in 2 minutes so anyone worldwide can vote from any phone or computer.
- **Vercel Ready**: Preconfigured with `vercel.json` for one-click deployment.

## 🚀 Live Hosting with Vercel & Firebase

### 1. Firebase Setup (100% Free)
1. Go to [Firebase Console](https://console.firebase.google.com) and create a project.
2. Navigate to **Build &rarr; Realtime Database** &rarr; **Create Database** (Start in Test Mode).
3. Copy your database URL into `js/firebase-config.js` or configure it in **Admin Panel &rarr; Settings**.

### 2. Vercel Deployment
```bash
npx vercel --prod
```

## 🛠 Local Setup

Simply open `index.html` in any web browser, or serve it locally:

```bash
npx serve . --listen 3000
```
Then visit `http://localhost:3000`.

## 🔐 Default Admin Credentials

- **Username**: `admin`
- **Password**: `admin123`

## 📄 License
MIT
