import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence handled gracefully
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.error("Auth persistence failed:", err);
});

// Initialize Firestore with robust cache handling
let dbInstance;
try {
  // Try to use persistent cache (default) but with multiple tab support
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (error) {
  console.warn("Firestore persistent cache failed, falling back to memory:", error);
  // Fallback to memory-based cache if IndexedDB fails
  dbInstance = initializeFirestore(app, {
    localCache: memoryLocalCache()
  });
}

export const db = dbInstance;
export const storage = getStorage(app);
export default app;
