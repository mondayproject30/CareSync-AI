import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged 
} from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBf8GH_zELLTlreQn0PWpcz0dH5F12jZyM",
  authDomain: "testing01-8b30a.firebaseapp.com",
  projectId: "testing01-8b30a",
  storageBucket: "testing01-8b30a.firebasestorage.app",
  messagingSenderId: "476204713399",
  appId: "1:476204713399:web:fcc139bbcf2bc7713a1432"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { signInWithPopup, signOut, onAuthStateChanged };
