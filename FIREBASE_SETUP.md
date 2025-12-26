# Firebase Setup Guide

Complete step-by-step guide to set up Firebase for the multiplayer game.

## Prerequisites
- Google account
- Project repository cloned locally
- Node.js and npm installed

---

## Part 1: Create Firebase Project

### Step 1: Access Firebase Console
1. Open your browser and go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Sign in with your Google account
3. You'll see the Firebase welcome page

### Step 2: Create New Project
1. Click the **"Add project"** button (or **"Create a project"**)
2. **Project name**: Enter a name (e.g., "dadsongame" or "my-multiplayer-game")
   - Firebase will auto-generate a unique Project ID below
   - You can customize the Project ID if desired (it must be globally unique)
3. Click **"Continue"**

### Step 3: Google Analytics (Optional)
1. You'll be asked "Enable Google Analytics for this project?"
   - **Recommended**: Toggle OFF for simplicity (you can enable later)
   - If you want analytics, toggle ON and select/create an Analytics account
2. Click **"Create project"**
3. Wait 30-60 seconds while Firebase provisions your project
4. Click **"Continue"** when ready

---

## Part 2: Enable Realtime Database

### Step 1: Navigate to Realtime Database
1. In the left sidebar, click **"Build"** to expand the menu
2. Click **"Realtime Database"**
3. You'll see a "Get started" page

### Step 2: Create Database
1. Click **"Create Database"** button
2. **Database location**: Select a region close to your users
   - `us-central1` (Iowa) - Good for North America
   - `europe-west1` (Belgium) - Good for Europe
   - `asia-southeast1` (Singapore) - Good for Asia
   - **Note**: This cannot be changed later
3. Click **"Next"**

### Step 3: Set Security Rules
1. You'll see "Set up security rules" screen
2. Select **"Start in test mode"**
   - This allows read/write access for 30 days
   - Warning will show: "Your security rules are defined as public..."
   - This is OK for development; we'll secure it later
3. Click **"Enable"**
4. Wait a few seconds for the database to initialize

### Step 4: Note Your Database URL
1. Once created, you'll see the database console
2. At the top, you'll see your database URL like:
   ```
   https://your-project-id-default-rtdb.firebaseio.com/
   ```
3. **Copy this URL** - you'll need it for your `.env` file

---

## Part 3: Enable Cloud Firestore

### Step 1: Navigate to Firestore
1. In the left sidebar under **"Build"**, click **"Firestore Database"**
2. You'll see a "Get started with Cloud Firestore" page

### Step 2: Create Database
1. Click **"Create database"** button
2. **Location type**: Choose "Start in production mode" or "Start in test mode"
   - **Test mode**: Allows all reads/writes for 30 days (easier for development)
   - **Production mode**: Denies all reads/writes by default (more secure)
   - **Recommendation**: Choose **test mode** for now
3. Click **"Next"**

### Step 3: Choose Location
1. **Firestore location**: Select the **same region** you chose for Realtime Database
   - If you chose `us-central1` for RTDB, choose `us-central (us-central1)` here
   - **Important**: This cannot be changed later
2. Click **"Enable"**
3. Wait 30-60 seconds for Firestore to initialize

### Step 4: Verify Setup
1. You'll see the Firestore console with "Start collection" button
2. No need to create collections now - the app will create them automatically

---

## Part 4: Register Web App & Get Config

### Step 1: Add Web App
1. Click the **gear icon** (⚙️) next to "Project Overview" in the sidebar
2. Click **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **web icon** (`</>`) labeled "Add app"

### Step 2: Register App
1. **App nickname**: Enter a name (e.g., "dadsongame-web")
2. **Firebase Hosting**: Leave unchecked (unless you plan to use it)
3. Click **"Register app"**

### Step 3: Copy Configuration
1. You'll see a code snippet with `firebaseConfig` object:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef1234567890",
     databaseURL: "https://your-project-default-rtdb.firebaseio.com"
   };
   ```
2. **Copy all these values** - you'll need them next
3. Click **"Continue to console"**

---

## Part 5: Configure Your Local Project

### Step 1: Create `.env` File
1. In your project root directory (same level as `package.json`), create a file named `.env`
2. Add the following content:

```bash
# Multiplayer backend
VITE_MULTIPLAYER_BACKEND=firebase

# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
```

3. **Replace the values** with your actual configuration from Step 4.3
4. Save the file

### Step 2: Verify `.gitignore`
1. Open `.gitignore` file in your project root
2. Make sure it contains:
   ```
   .env
   .env.local
   .env*.local
   ```
3. **Important**: Never commit `.env` to git (it contains sensitive API keys)

### Step 3: Create `.env.example` (Optional but Recommended)
1. Create a file named `.env.example` in project root
2. Add template without real values:
```bash
# Multiplayer backend
VITE_MULTIPLAYER_BACKEND=firebase

# Firebase Configuration (get these from Firebase Console)
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
```
3. This helps other developers set up their own `.env` file

---

## Part 6: Set Security Rules (Development)

### Realtime Database Rules

1. Go to Firebase Console → **Realtime Database**
2. Click the **"Rules"** tab
3. Replace the content with:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        "players": {
          "$playerId": {
            ".read": true,
            ".write": true
          }
        },
        "state": {
          "$playerId": {
            ".read": true,
            ".write": true
          }
        },
        "events": {
          ".read": true,
          ".write": true
        }
      }
    }
  }
}
```

4. Click **"Publish"**
5. Confirm the warning about security (this is for development only)

**Explanation**:
- `rooms/$roomId/players/$playerId` - stores player presence
- `rooms/$roomId/state/$playerId` - stores real-time player positions
- `rooms/$roomId/events` - stores game events (chat, actions)
- All players can read/write (insecure but fine for development)

### Firestore Rules

1. Go to Firebase Console → **Firestore Database**
2. Click the **"Rules"** tab
3. Replace the content with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Player save data
    match /players/{playerId}/saves/{saveId} {
      allow read, write: if true;
    }
  }
}
```

4. Click **"Publish"**

**Explanation**:
- `players/{playerId}/saves/{saveId}` - stores persistent save data
- `allow read, write: if true` - anyone can read/write (development only)

---

## Part 7: Test the Setup

### Step 1: Start Development Server
```bash
npm run dev
```

### Step 2: Check Console Logs
1. Open browser to the dev server URL (usually `http://localhost:5173`)
2. Open browser DevTools (F12) → Console tab
3. Look for Firebase connection logs like:
   ```
   [FirebaseMP] Connecting to room: ...
   [FirebaseMP] Connected as ...
   ```

### Step 3: Verify in Firebase Console

**Check Realtime Database**:
1. Go to Firebase Console → Realtime Database → Data tab
2. You should see a `rooms` node appear when a player connects
3. Expand it to see: `rooms → {roomId} → players → {playerId}`

**Check Firestore**:
1. Go to Firebase Console → Firestore Database → Data tab
2. When you save game state, you should see: `players → {playerId} → saves → {roomId}`

### Step 4: Test Multiplayer (Optional)
1. Open the game in two different browser windows
2. Both should connect to the same room
3. Check Realtime Database - you should see 2 players under the room

---

## Part 8: Security Rules for Production

**IMPORTANT**: Before deploying to production, update your security rules!

### Realtime Database (Production Rules)

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        "players": {
          "$playerId": {
            ".read": true,
            ".write": "auth != null && auth.uid == $playerId"
          }
        },
        "state": {
          "$playerId": {
            ".read": true,
            ".write": "auth != null && auth.uid == $playerId"
          }
        },
        "events": {
          ".read": true,
          ".write": "auth != null",
          ".indexOn": ["timestamp"]
        }
      }
    }
  }
}
```

### Firestore (Production Rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /players/{playerId}/saves/{saveId} {
      allow read: if request.auth != null && request.auth.uid == playerId;
      allow write: if request.auth != null && request.auth.uid == playerId;
    }
  }
}
```

**Note**: These rules require Firebase Authentication. You'll need to:
1. Enable Authentication in Firebase Console
2. Implement sign-in in your app
3. Only authenticated users can write their own data

---

## Troubleshooting

### Issue: "Firebase: Error (auth/api-key-not-valid)"
- **Solution**: Double-check `VITE_FIREBASE_API_KEY` in `.env` file
- Make sure there are no extra spaces or quotes

### Issue: "PERMISSION_DENIED" errors
- **Solution**: Check your security rules in Firebase Console
- Make sure rules allow the operations you're attempting

### Issue: Environment variables not loading
- **Solution**: Restart the dev server (`npm run dev`)
- Vite only loads `.env` on startup

### Issue: Database URL not found
- **Solution**: Make sure you copied the complete database URL including `https://`
- Check that it ends with `.firebaseio.com`

### Issue: Can't see data in Firebase Console
- **Solution**: Data appears only when your app writes it
- Check browser console for errors
- Make sure you're connected (check connection state)

---

## Next Steps

1. **Add Authentication** (recommended for production)
   - Enable Email/Password or Google Sign-In in Firebase Console
   - Implement sign-in UI in your app

2. **Set up Indexes** (for better Firestore performance)
   - Firebase will suggest indexes when you query
   - Follow the links in console errors to create them

3. **Monitor Usage**
   - Firebase Console → Usage tab
   - Free tier limits: 10GB Realtime DB storage, 1GB Firestore storage
   - 50K Realtime DB concurrent connections

4. **Add Error Monitoring**
   - Consider Firebase Crashlytics or Sentry
   - Track errors in production

5. **Optimize Security Rules**
   - Add validation rules (data types, required fields)
   - Add rate limiting to prevent abuse

---

## Useful Links

- [Firebase Documentation](https://firebase.google.com/docs)
- [Realtime Database Guide](https://firebase.google.com/docs/database)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [Security Rules Guide](https://firebase.google.com/docs/rules)
- [Firebase Pricing](https://firebase.google.com/pricing)

---

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Check Firebase Console → Functions → Logs
3. Review the security rules in Firebase Console
4. Check that all environment variables are set correctly
5. Make sure your Firebase project has billing enabled (if needed)
