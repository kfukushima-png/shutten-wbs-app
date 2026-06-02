import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getApp(): FirebaseApp {
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

let _auth: Auth;
let _db: Firestore;
let _googleProvider: GoogleAuthProvider;

export function getFirebaseAuth(): Auth {
  if (!_auth) _auth = getAuth(getApp());
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (!_db) {
    _db = initializeFirestore(getApp(), {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  }
  return _db;
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!_googleProvider) _googleProvider = new GoogleAuthProvider();
  return _googleProvider;
}
