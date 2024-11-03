import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBNK_-cJ0aufSWfCblS0EL2cW5STh0UKaY",
  authDomain: "bkregistration-b0342.firebaseapp.com",
  projectId: "bkregistration-b0342",
  storageBucket: "bkregistration-b0342.firebasestorage.app",
  messagingSenderId: "1022674766671",
  appId: "1:1022674766671:web:80b374a0bc1b081364933a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);