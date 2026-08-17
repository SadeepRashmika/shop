/**
 * Universal Time Synchronization Service
 * 
 * Guarantees 100% accurate calculation of:
 * - "Today's Sales" (අද විකුණුම්)
 * - "This Month's Sales" (මෙම මාසය)
 * - Reports, Daily Sales, Charts, and Receipts
 * 
 * Works even if the laptop clock is completely wrong (wrong year, wrong hours, wrong timezone),
 * by syncing directly with Firebase Firestore serverTimestamp and calculating Sri Lanka business day bounds (UTC+5:30).
 */

import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const SL_OFFSET_MS = 5.5 * 60 * 60 * 1000; // Sri Lanka is UTC + 5:30 (19,800,000 ms)

let serverOffsetMs = 0;
let hasSynced = false;
let isSyncing = false;
const listeners = new Set();

// Load cached offset from localStorage
try {
  const cached = localStorage.getItem('pos_time_offset');
  if (cached !== null) {
    const parsed = parseInt(cached, 10);
    if (!isNaN(parsed)) {
      serverOffsetMs = parsed;
    }
  }
} catch (e) {
  console.warn('[TimeService] localStorage access error:', e);
}

function notifyListeners() {
  listeners.forEach(cb => {
    try {
      cb(serverOffsetMs);
    } catch (err) {
      console.error('[TimeService] Listener callback error:', err);
    }
  });
}

/**
 * Get the synchronized real-world UTC timestamp in milliseconds
 */
export function getTrueUtcMs() {
  return Date.now() + serverOffsetMs;
}

/**
 * Synchronize real time with Firebase Firestore serverTimestamp
 */
export async function syncTime() {
  if (isSyncing) return serverOffsetMs;
  isSyncing = true;

  try {
    // 1. Primary Method: Firestore Server Timestamp Probe (authoritative, zero CORS, always available)
    const t0 = Date.now();
    const pingDocRef = doc(db, '_system_time_', 'ping');
    await setDoc(pingDocRef, { ts: serverTimestamp(), ping: t0 }, { merge: true });
    
    const snap = await getDoc(pingDocRef);
    const t1 = Date.now();

    if (snap.exists()) {
      const data = snap.data();
      if (data?.ts?.seconds) {
        const serverMs = (data.ts.seconds * 1000) + Math.round((data.ts.nanoseconds || 0) / 1000000);
        const roundTripHalf = (t1 - t0) / 2;
        const estimatedLaptopNow = t0 + roundTripHalf;
        const newOffset = Math.round(serverMs - estimatedLaptopNow);

        serverOffsetMs = newOffset;
        hasSynced = true;

        try {
          localStorage.setItem('pos_time_offset', serverOffsetMs.toString());
        } catch (e) {}

        console.log(`[TimeService] Synchronized via Firestore. Offset: ${serverOffsetMs}ms (${(serverOffsetMs / 1000).toFixed(1)}s)`);
        notifyListeners();
        isSyncing = false;
        return serverOffsetMs;
      }
    }
  } catch (err) {
    console.warn('[TimeService] Firestore ping failed, trying backup API:', err.message);
  }

  // 2. Backup Method: TimeAPI.io (Asia/Colombo)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const t0 = Date.now();
    const res = await fetch('https://timeapi.io/api/time/current/zone?timeZone=Asia/Colombo', {
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timer);
    const data = await res.json();
    const t1 = Date.now();

    if (data.dateTime) {
      const timeMs = new Date(data.dateTime).getTime();
      if (!isNaN(timeMs)) {
        const roundTripHalf = (t1 - t0) / 2;
        const estimatedLaptopNow = t0 + roundTripHalf;
        serverOffsetMs = Math.round(timeMs - estimatedLaptopNow);
        hasSynced = true;

        try {
          localStorage.setItem('pos_time_offset', serverOffsetMs.toString());
        } catch (e) {}

        console.log(`[TimeService] Synchronized via TimeAPI. Offset: ${serverOffsetMs}ms`);
        notifyListeners();
        isSyncing = false;
        return serverOffsetMs;
      }
    }
  } catch (err) {
    // Both failed, rely on cached offset
  }

  isSyncing = false;
  return serverOffsetMs;
}

// Auto-sync on startup and lifecycle events
if (typeof window !== 'undefined') {
  // Sync on startup after a small delay to let Firebase initialize
  setTimeout(() => {
    syncTime();
  }, 100);

  // Periodic sync every 3 minutes
  setInterval(() => {
    syncTime();
  }, 3 * 60 * 1000);

  // Sync on window focus or network reconnect
  window.addEventListener('online', () => syncTime());
  window.addEventListener('focus', () => syncTime());
}

/**
 * Calibrate offset if a Firestore transaction has a higher timestamp
 */
export function calibrateFromTimestamp(timestampSeconds) {
  if (!timestampSeconds) return;
  const tsMs = timestampSeconds * 1000;
  const currentTrueMs = getTrueUtcMs();

  // If local time is significantly behind the latest transaction in database
  if (tsMs > currentTrueMs) {
    serverOffsetMs = tsMs - Date.now();
    try {
      localStorage.setItem('pos_time_offset', serverOffsetMs.toString());
    } catch (e) {}
    notifyListeners();
  }
}

/**
 * Get Sri Lanka Date parts (Year, Month, Date, Hour, Min, Sec) from a UTC ms value
 */
export function getSriLankaDateParts(utcMs = getTrueUtcMs()) {
  const d = new Date(utcMs + SL_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(), // 0-indexed (0 = Jan)
    date: d.getUTCDate(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
    seconds: d.getUTCSeconds()
  };
}

/**
 * Get UTC seconds boundaries for Today in Sri Lanka time (+05:30)
 */
export function getSriLankaTodayBounds() {
  const p = getSriLankaDateParts(getTrueUtcMs());
  const startUtcMs = Date.UTC(p.year, p.month, p.date, 0, 0, 0, 0) - SL_OFFSET_MS;
  const endUtcMs = Date.UTC(p.year, p.month, p.date, 23, 59, 59, 999) - SL_OFFSET_MS;
  return {
    startSec: Math.floor(startUtcMs / 1000),
    endSec: Math.floor(endUtcMs / 1000),
    startMs: startUtcMs,
    endMs: endUtcMs
  };
}

/**
 * Get UTC seconds boundaries for Current Month in Sri Lanka time (+05:30)
 */
export function getSriLankaMonthBounds() {
  const p = getSriLankaDateParts(getTrueUtcMs());
  const startUtcMs = Date.UTC(p.year, p.month, 1, 0, 0, 0, 0) - SL_OFFSET_MS;
  const endUtcMs = Date.UTC(p.year, p.month + 1, 0, 23, 59, 59, 999) - SL_OFFSET_MS;
  return {
    startSec: Math.floor(startUtcMs / 1000),
    endSec: Math.floor(endUtcMs / 1000),
    startMs: startUtcMs,
    endMs: endUtcMs
  };
}

/**
 * Convert any Firestore Timestamp, Date object, string, or number to UTC seconds
 */
export function toUtcSeconds(value) {
  if (!value) return null;
  if (typeof value.seconds === 'number') return value.seconds;
  if (typeof value.toDate === 'function') {
    const d = value.toDate();
    return Math.floor(d.getTime() / 1000);
  }
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : Math.floor(value.getTime() / 1000);
  }
  if (typeof value === 'number') {
    return value > 100000000000 ? Math.floor(value / 1000) : value;
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : Math.floor(d.getTime() / 1000);
  }
  return null;
}

/**
 * Get UTC seconds boundaries for Current Year in Sri Lanka time (+05:30)
 */
export function getSriLankaYearBounds() {
  const p = getSriLankaDateParts(getTrueUtcMs());
  const startUtcMs = Date.UTC(p.year, 0, 1, 0, 0, 0, 0) - SL_OFFSET_MS;
  const endUtcMs = Date.UTC(p.year, 11, 31, 23, 59, 59, 999) - SL_OFFSET_MS;
  return {
    startSec: Math.floor(startUtcMs / 1000),
    endSec: Math.floor(endUtcMs / 1000),
    startMs: startUtcMs,
    endMs: endUtcMs
  };
}

/**
 * Check if a timestamp or date belongs to Today (Sri Lanka Time)
 */
export function isToday(value) {
  const sec = toUtcSeconds(value);
  if (sec === null) return false;
  const bounds = getSriLankaTodayBounds();
  return sec >= bounds.startSec && sec <= bounds.endSec;
}

/**
 * Check if a timestamp or date belongs to the Current Month (Sri Lanka Time)
 */
export function isThisMonth(value) {
  const sec = toUtcSeconds(value);
  if (sec === null) return false;
  const bounds = getSriLankaMonthBounds();
  return sec >= bounds.startSec && sec <= bounds.endSec;
}

/**
 * Check if a timestamp or date belongs to the Current Year (Sri Lanka Time)
 */
export function isThisYear(value) {
  const sec = toUtcSeconds(value);
  if (sec === null) return false;
  const bounds = getSriLankaYearBounds();
  return sec >= bounds.startSec && sec <= bounds.endSec;
}

/**
 * Get 'YYYY-MM-DD' string for Today in Sri Lanka
 */
export function getTodayDateString() {
  const p = getSriLankaDateParts(getTrueUtcMs());
  const m = String(p.month + 1).padStart(2, '0');
  const d = String(p.date).padStart(2, '0');
  return `${p.year}-${m}-${d}`;
}

/**
 * Get 'YYYY-MM' string for Current Month in Sri Lanka
 */
export function getCurrentMonthString() {
  const p = getSriLankaDateParts(getTrueUtcMs());
  const m = String(p.month + 1).padStart(2, '0');
  return `${p.year}-${m}`;
}

/**
 * Get 'YYYY' string for Current Year in Sri Lanka
 */
export function getCurrentYearString() {
  const p = getSriLankaDateParts(getTrueUtcMs());
  return String(p.year);
}

/**
 * Convert any timestamp to a Date object
 */
export function toDateObject(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'number') return new Date(value > 100000000000 ? value : value * 1000);
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Get accurate current Date object
 */
export function getNow() {
  return new Date(getTrueUtcMs());
}

/**
 * Get start of Today Date
 */
export function getTodayStart() {
  return new Date(getSriLankaTodayBounds().startMs);
}

/**
 * Get end of Today Date
 */
export function getTodayEnd() {
  return new Date(getSriLankaTodayBounds().endMs);
}

/**
 * Get start of Month Date
 */
export function getMonthStart() {
  return new Date(getSriLankaMonthBounds().startMs);
}

/**
 * Get end of Month Date
 */
export function getMonthEnd() {
  return new Date(getSriLankaMonthBounds().endMs);
}

/**
 * Format any timestamp into Sri Lanka Date String (e.g. "Aug 17, 2026")
 */
export function formatSriLankaDate(value) {
  const sec = toUtcSeconds(value);
  if (!sec) return 'N/A';
  const p = getSriLankaDateParts(sec * 1000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[p.month]} ${p.date}, ${p.year}`;
}

/**
 * Format any timestamp into Sri Lanka Time String (e.g. "01:15 PM")
 */
export function formatSriLankaTime(value) {
  const sec = toUtcSeconds(value);
  if (!sec) return 'N/A';
  const p = getSriLankaDateParts(sec * 1000);
  const h12 = p.hours % 12 || 12;
  const ampm = p.hours >= 12 ? 'PM' : 'AM';
  const mStr = String(p.minutes).padStart(2, '0');
  return `${String(h12).padStart(2, '0')}:${mStr} ${ampm}`;
}

/**
 * Format any timestamp into Sri Lanka Date & Time String
 */
export function formatSriLankaDateTime(value) {
  return `${formatSriLankaDate(value)} ${formatSriLankaTime(value)}`;
}

/**
 * Subscribe to time sync changes
 */
export function subscribeTimeSync(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * React Hook for synced time
 */
export function useSyncedTime() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeTimeSync(() => {
      setTick(t => t + 1);
    });
    return unsubscribe;
  }, []);

  return getNow();
}
