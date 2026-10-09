// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAKIke9vrHU-t4wOfd-Z-1rPJZk0_cyc98",
    authDomain: "laundryease-e9bc0.firebaseapp.com",
    projectId: "laundryease-e9bc0",
    storageBucket: "laundryease-e9bc0.firebasestorage.app",
    messagingSenderId: "1063371608584",
    appId: "1:1063371608584:web:fb87298e8a08dfb2b977bd",
    measurementId: "G-8R06CBRYM0"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
const auth = getAuth(app);

// Initialize Firestore Database
const db = getFirestore(app);

// Make auth and db available to other files
export { auth, db };
