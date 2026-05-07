import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA8atDFs0sE-EvdoGJ1xsXu1pf09R-7iiw",
  authDomain: "jumonji-shokuei-portal.firebaseapp.com",
  projectId: "jumonji-shokuei-portal",
  storageBucket: "jumonji-shokuei-portal.firebasestorage.app",
  messagingSenderId: "953075135474",
  appId: "1:953075135474:web:b7b896c21fb467d7c6716b",
  measurementId: "G-NGXCGWMJG9"
};

// Initialize Firebase (HMR対応)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

// Analyticsは対応ブラウザのみ初期化（アドブロッカー等によるエラーを防止）
export let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(console.error);
