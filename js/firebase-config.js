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
  apiKey: "AIzaSyCQcKVt-nzWgYYQ3eblrFtMOOf69m34hjA",
  authDomain: "personal-bookmark-hub.firebaseapp.com",
  projectId: "personal-bookmark-hub",
  storageBucket: "personal-bookmark-hub.firebasestorage.app",
  messagingSenderId: "898261014471",
  appId: "1:898261014471:web:6830b96339d36eee306be2"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

window.db = firebase.firestore();
window.auth = firebase.auth();

// Enable offline persistence
firebase.firestore().enablePersistence({ synchronizeTabs: true })
  .catch(err => {
    if (err.code === 'failed-precondition') {
      console.warn('BookMark: Offline persistence unavailable — multiple tabs open');
    }
  });
