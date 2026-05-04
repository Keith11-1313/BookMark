// auth.js — Google sign-in + auth state management

const Auth = (() => {
  const authScreen = document.getElementById('auth-screen');
  const appEl      = document.getElementById('app');
  const signInBtn  = document.getElementById('btn-google-signin');
  const authError  = document.getElementById('auth-error');

  let currentUser = null;

  function init() {
    signInBtn.addEventListener('click', signIn);

    auth.onAuthStateChanged(user => {
      if (user) {
        currentUser = user;
        onSignedIn(user);
      } else {
        currentUser = null;
        onSignedOut();
      }
    });
  }

  async function signIn() {
    try {
      signInBtn.classList.add('loading');
      signInBtn.querySelector('.btn-google-text').textContent = 'Signing in…';
      authError.classList.remove('visible');

      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
    } catch (err) {
      console.error('Sign-in error:', err);
      authError.classList.add('visible');
      authError.querySelector('.auth-error-msg').textContent =
        err.code === 'auth/popup-closed-by-user'
          ? 'Sign-in popup was closed. Please try again.'
          : 'Sign-in failed. Please try again.';
      signInBtn.classList.remove('loading');
      signInBtn.querySelector('.btn-google-text').textContent = 'Continue with Google';
    }
  }

  async function signOut() {
    try {
      await auth.signOut();
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  }

  function onSignedIn(user) {
    authScreen.classList.add('hidden');     // fade out auth
    appEl.style.opacity = '0';
    appEl.style.display = 'flex';
    requestAnimationFrame(() => {
      appEl.style.transition = 'opacity 0.3s ease';
      appEl.style.opacity = '1';
    });
    App.init(user);
    Sidebar.setUser(user);
  }

  function onSignedOut() {
    App.unmountCurrent?.();
    appEl.style.transition = 'opacity 0.3s ease';
    appEl.style.opacity = '0';
    setTimeout(() => { appEl.style.display = 'none'; }, 300);
    authScreen.classList.remove('hidden'); // fade in auth
    Store.clear();
  }

  function getUser()   { return currentUser; }
  function getUid()    { return currentUser?.uid; }

  return { init, signOut, getUser, getUid };
})();

document.addEventListener('DOMContentLoaded', () => Auth.init());
