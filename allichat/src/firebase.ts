import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD90T-MVgxvipNLjI0czvptpMW_KJj8rQw",
  authDomain: "ahmechat-33237.firebaseapp.com",
  projectId: "ahmechat-33237",
  storageBucket: "ahmechat-33237.firebasestorage.app",
  messagingSenderId: "119372793529",
  appId: "1:119372793529:web:232ec23c89302e39ed7d68",
  measurementId: "G-M6F976TJL5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); 