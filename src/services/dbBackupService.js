import { collection, getDocs, doc, setDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export const SUPPORTED_COLLECTIONS = [
  { id: 'items', name: 'භාණ්ඩ / බඩු ලැයිස්තුව (Items & Products)' },
  { id: 'transactions', name: 'විකුණුම් බිල්පත් (Sales Transactions)' },
  { id: 'debtors', name: 'ණය ගැතියන් (Debtors & Credits)' },
  { id: 'debtor_payments', name: 'ණය පියවීම් (Debtor Payments)' },
  { id: 'reloads', name: 'Reload සහ බිල්පත් ගෙවීම් (Reloads & Utilities)' },
  { id: 'millingRecords', name: 'වී සහ පොල් කෙටුම් සටහන් (Milling Records)' },
  { id: 'paddyPurchases', name: 'වී මිලදී ගැනීම් (Paddy Purchases)' },
  { id: 'cashSessions', name: 'මුදල් ලාච්චු සටහන් (Cash Sessions)' },
  { id: 'orders', name: 'පාරිභෝගික ඇනවුම් (Customer Orders)' },
  { id: 'advertisements', name: 'දැන්වීම් (Advertisements)' },
  { id: 'settings', name: 'පද්ධති සැකසුම් (System Settings)' },
  { id: 'users', name: 'පරිශීලකයන් (Users & Cashiers)' }
];

// Helper to convert Firestore Timestamps to serializable format
function serializeDocData(data) {
  if (!data || typeof data !== 'object') return data;
  if (data instanceof Timestamp || (data.seconds !== undefined && data.nanoseconds !== undefined)) {
    return { _type: 'firestore_timestamp', seconds: data.seconds, nanoseconds: data.nanoseconds };
  }
  if (data instanceof Date) {
    return { _type: 'date', iso: data.toISOString() };
  }
  if (Array.isArray(data)) {
    return data.map(item => serializeDocData(item));
  }
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = serializeDocData(value);
  }
  return result;
}

// Helper to deserialize data back to Firestore-ready objects
function deserializeDocData(data) {
  if (!data || typeof data !== 'object') return data;
  if (data._type === 'firestore_timestamp') {
    return new Timestamp(data.seconds, data.nanoseconds || 0);
  }
  if (data._type === 'date') {
    return new Date(data.iso);
  }
  if (Array.isArray(data)) {
    return data.map(item => deserializeDocData(item));
  }
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = deserializeDocData(value);
  }
  return result;
}

/**
 * Export entire database or selected collections into a downloadable JSON file
 */
export async function exportDatabase(selectedCollectionIds = null, onProgress = null) {
  const collectionsToExport = selectedCollectionIds 
    ? SUPPORTED_COLLECTIONS.filter(c => selectedCollectionIds.includes(c.id))
    : SUPPORTED_COLLECTIONS;

  const total = collectionsToExport.length;
  const backupData = {
    app: 'SmartPOS',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    counts: {},
    data: {}
  };

  for (let i = 0; i < collectionsToExport.length; i++) {
    const coll = collectionsToExport[i];
    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        collectionName: coll.name,
        percentage: Math.round(((i + 1) / total) * 100)
      });
    }

    try {
      const snap = await getDocs(collection(db, coll.id));
      const docsList = [];
      snap.forEach(docSnap => {
        docsList.push({
          _id: docSnap.id,
          ...serializeDocData(docSnap.data())
        });
      });
      backupData.data[coll.id] = docsList;
      backupData.counts[coll.id] = docsList.length;
    } catch (err) {
      console.warn(`Could not export collection ${coll.id}:`, err);
      backupData.data[coll.id] = [];
      backupData.counts[coll.id] = 0;
    }
  }

  // Trigger JSON download
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `SmartPOS_Backup_${dateStr}.json`;
  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return backupData;
}

/**
 * Parse and validate an uploaded backup JSON file
 */
export async function parseBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (!json.data || typeof json.data !== 'object') {
          throw new Error('වලංගු නොවන Backup File ආකෘතියකි (Invalid backup structure)');
        }
        let totalRecords = 0;
        const counts = {};
        for (const [key, items] of Object.entries(json.data)) {
          const len = Array.isArray(items) ? items.length : 0;
          counts[key] = len;
          totalRecords += len;
        }
        resolve({
          app: json.app || 'SmartPOS',
          version: json.version || '1.0',
          exportedAt: json.exportedAt || null,
          counts,
          totalRecords,
          data: json.data
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('ගොනුව කියවීමට නොහැකි විය (File read error)'));
    reader.readAsText(file);
  });
}

/**
 * Import and restore data into Firestore in batched chunks
 */
export async function importDatabase(backupData, selectedCollectionIds = null, onProgress = null) {
  const data = backupData.data;
  const collectionsToImport = selectedCollectionIds
    ? Object.keys(data).filter(c => selectedCollectionIds.includes(c))
    : Object.keys(data);

  let totalOperations = 0;
  collectionsToImport.forEach(coll => {
    if (Array.isArray(data[coll])) {
      totalOperations += data[coll].length;
    }
  });

  if (totalOperations === 0) {
    throw new Error('ඇතුළත් කිරීමට කිසිදු දත්තයක් නැත (No records found to import)');
  }

  let completedOps = 0;

  for (const collName of collectionsToImport) {
    const docsList = data[collName];
    if (!Array.isArray(docsList) || docsList.length === 0) continue;

    // Split docs into batches of 300 (Firestore allows up to 500 per batch)
    const BATCH_SIZE = 300;
    for (let i = 0; i < docsList.length; i += BATCH_SIZE) {
      const chunk = docsList.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      chunk.forEach(docObj => {
        const docId = docObj._id;
        const docData = { ...docObj };
        delete docData._id;

        const deserialized = deserializeDocData(docData);
        if (docId) {
          const docRef = doc(db, collName, docId);
          batch.set(docRef, deserialized, { merge: true });
        } else {
          const docRef = doc(collection(db, collName));
          batch.set(docRef, deserialized);
        }
      });

      await batch.commit();
      completedOps += chunk.length;

      if (onProgress) {
        onProgress({
          completed: completedOps,
          total: totalOperations,
          collectionName: collName,
          percentage: Math.min(100, Math.round((completedOps / totalOperations) * 100))
        });
      }
    }
  }

  return { success: true, totalRestored: completedOps };
}
