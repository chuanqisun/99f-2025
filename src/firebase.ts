import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAtd-ZXjKXndsK__EZJqEdVc6k-m4zt1s4",
  authDomain: "mawwaige-b4c0b.firebaseapp.com",
  databaseURL: "https://mawwaige-b4c0b-default-rtdb.firebaseio.com",
  projectId: "mawwaige-b4c0b",
  storageBucket: "mawwaige-b4c0b.firebasestorage.app",
  messagingSenderId: "320418834061",
  appId: "1:320418834061:web:679d1021a6221bb36124c4",
  measurementId: "G-JSYGTE7BSL",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
