// firebase-config.js
// ─────────────────────────────────────────────────────────────
// SETUP INSTRUCTIONS (takes ~5 minutes):
//
// 1. Go to https://console.firebase.google.com
// 2. Click "Add project" → name it "BookMark" → Continue
// 3. Disable Google Analytics (optional) → Create project
// 4. In the left sidebar: Authentication → Get started
//    → Sign-in method → Google → Enable → Save
// 5. In the left sidebar: Firestore Database → Create database
//    → Start in test mode → Next → choose a location → Enable
// 6. In the left sidebar: Project Overview (gear icon) → Project settings
// 7. Scroll down to "Your apps" → click </> (Web)
// 8. Register app with nickname "BookMark" → Register app
// 9. Copy the firebaseConfig object below and replace the placeholder values
//
// ─────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

window.db   = firebase.firestore();
window.auth = firebase.auth();

// Enable offline persistence
firebase.firestore().enablePersistence({ synchronizeTabs: true })
  .catch(err => {
    if (err.code === 'failed-precondition') {
      console.warn('BookMark: Offline persistence unavailable — multiple tabs open');
    }
  });
