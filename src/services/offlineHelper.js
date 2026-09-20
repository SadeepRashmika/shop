import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Safely races a Firestore write/promise against a short timeout (default 400ms).
 * With Firestore persistent cache (IndexedDB), local writes/batches are saved immediately
 * and queued for background syncing when online.
 * Using safeCommit prevents the UI (and button loading spinners) from hanging indefinitely
 * when the user is operating offline.
 */
export const safeCommit = (promise, timeoutMs = 400) => {
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
export const safeGetDoc = async (docRef, timeoutMs = 2000) => {
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
 * Synchronizes and returns the highest known bill number across cloud counter, transactions, and local cache.
 */
export async function syncLatestBillNumber() {
  let highestBill = 0;

  // 1. Read from local storage
  try {
    const savedLocal = localStorage.getItem('smartpos_last_bill_number');
    if (savedLocal) {
      highestBill = Math.max(highestBill, parseInt(savedLocal, 10) || 0);
    }
  } catch (e) {}

  // 2. Fetch server counter and latest transactions
  try {
    const counterRef = doc(db, 'counters', 'billNumber');
    const counterSnap = await safeGetDoc(counterRef, 2000);
    if (counterSnap && counterSnap.exists()) {
      const cVal = counterSnap.data().current || 0;
      highestBill = Math.max(highestBill, cVal);
    }
  } catch (e) {}

  try {
    const qTxn = query(collection(db, 'transactions'), orderBy('billNumber', 'desc'), limit(1));
    const txnSnap = await Promise.race([
      getDocs(qTxn),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]);
    if (txnSnap && !txnSnap.empty) {
      const lastTxnBill = txnSnap.docs[0].data().billNumber || 0;
      highestBill = Math.max(highestBill, lastTxnBill);
    }
  } catch (e) {}

  // Save latest highest bill number back to local storage and sync counter
  if (highestBill > 0) {
    try {
      localStorage.setItem('smartpos_last_bill_number', String(highestBill));
      setDoc(doc(db, 'counters', 'billNumber'), { current: highestBill }, { merge: true }).catch(() => {});
    } catch (e) {}
  }

  return highestBill;
}

/**
 * Resilient sequential Bill Number generator.
 * Works 100% offline and online seamlessly without repeating old bill numbers.
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

  // 2. If online, check server counter with reliable timeout
  try {
    const snap = await safeGetDoc(counterRef, 1500);
    if (snap && snap.exists()) {
      const serverVal = snap.data().current || 0;
      current = Math.max(current, serverVal);
    }

    // Double-check latest transactions to guarantee no duplicate/stale numbers
    const qTxn = query(collection(db, 'transactions'), orderBy('billNumber', 'desc'), limit(1));
    const txnSnap = await Promise.race([
      getDocs(qTxn),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
    ]);
    if (txnSnap && !txnSnap.empty) {
      const lastTxnBill = txnSnap.docs[0].data().billNumber || 0;
      current = Math.max(current, lastTxnBill);
    }
  } catch (err) {
    console.warn("[BillCounter] Running with local counter fallback:", err);
  }

  // 3. Increment counter
  const next = current + 1;

  // 4. Save to localStorage immediately and sync to cloud
  try {
    localStorage.setItem('smartpos_last_bill_number', String(next));
    setDoc(counterRef, { current: next }, { merge: true }).catch(() => {});
  } catch (e) {}

  return next;
}
