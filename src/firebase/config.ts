import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyCaIXR2toO32XMveAbhYB2bX3Sf34dwCmI",
  authDomain: "cumeal-b93ed.firebaseapp.com",
  projectId: "cumeal-b93ed",
  storageBucket: "cumeal-b93ed.firebasestorage.app",
  messagingSenderId: "22092790434",
  appId: "1:22092790434:web:eaaf50d11a44244c1835fb",
  measurementId: "G-8K78NKXYJW"
};

// Initialize Firebase safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
