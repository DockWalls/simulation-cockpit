import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAeGOIRhZe3eXTnkX6PxAkqqsy0U_AdP3U",
  authDomain: "ivory-mountain-470414-k1-7e763.firebaseapp.com",
  databaseURL: "https://ivory-mountain-470414-k1-7e763-default-rtdb.firebaseio.com",
  projectId: "ivory-mountain-470414-k1-7e763",
  storageBucket: "ivory-mountain-470414-k1-7e763.firebasestorage.app",
  messagingSenderId: "835272817456",
  appId: "1:835272817456:web:22b87c50584e85dec466f5"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);