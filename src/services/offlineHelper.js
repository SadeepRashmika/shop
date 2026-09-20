import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Safely races a Firestore write/promise against a short timeout (default 300ms).
 * With Firestore persistent cache (IndexedDB), local writes/batches are saved immediately
 * and queued for background syncing when online.
 * Using safeCommit prevents the UI (and button loading spinners) from hanging indefinitely
 * when the user is operating offline.
 */
export const safeCommit = (promise, timeoutMs = 300) => {
  if (!promise) return Promise.resolve();
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(resolve, timeoutMs))
  ]).catch(err => {
    console.warn("[Offline Sync] Action saved in offline cache, cloud sync pending:", err);
  });
};

/**
 * Safely fetches a single Firestore document without hanging when offline.
 */
export const safeGetDoc = async (docRef, timeoutMs = 350) => {
  if (!navigator.onLine) return null;
  try {
    return await Promise.race([
      getDoc(docRef),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
    ]);
  } catch {
    return null;
  }
};

/**
 * Resilient sequential Bill Number generator.
 * Works 100% offline and online seamlessly without hanging.
 */
export async function getResilientBillNumber() {
  const counterRef = doc(db, 'counters', 'billNumber');
  let current = 0;

  // 1. Read last known bill number from local storage
  try {
    const savedLocal = localStorage.getItem('smartpos_last_bill_number');
    if (savedLocal) {
      current = parseInt(savedLocal, 10) || 0;
    }
  } catch (e) {}

  // 2. If online, check server counter with fast timeout
  if (navigator.onLine) {
    try {
      const snap = await safeGetDoc(counterRef, 350);
      if (snap && snap.exists()) {
        const serverVal = snap.data().current || 0;
        current = Math.max(current, serverVal);
      }
    } catch (err) {
      console.warn("[BillCounter] Running with local counter fallback:", err);
    }
  }

  // 3. Increment counter
  const next = current + 1;

  // 4. Save to localStorage immediately and trigger non-blocking cloud update
  try {
    localStorage.setItem('smartpos_last_bill_number', String(next));
    setDoc(counterRef, { current: next }, { merge: true }).catch(() => {});
  } catch (e) {}

  return next;
}
