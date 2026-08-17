/**
 * Time Synchronization Service
 * 
 * Ensures accurate calculation of "Today's Sales", reports, timestamps and receipts
 * even if the user's laptop or device system clock is wrong (e.g. incorrect year, month, or time).
 * 
 * Syncs real UTC network time via Cloudflare, jsDelivr, and public time APIs,
 * caching the offset so the entire POS system operates with true real-world time.
 */

import { useState, useEffect } from 'react';

let serverOffsetMs = 0;
const listeners = new Set();
let isSyncing = false;
let hasSynced = false;

// Initialize cached offset from localStorage if available
try {
  const cachedOffset = localStorage.getItem('pos_time_offset');
  if (cachedOffset !== null) {
    const parsed = parseInt(cachedOffset, 10);
    if (!isNaN(parsed)) {
      serverOffsetMs = parsed;
    }
  }
} catch (e) {
  console.warn('[TimeService] Could not access localStorage for time offset:', e);
}

function notifyListeners() {
  listeners.forEach(cb => {
    try {
      cb(serverOffsetMs);
    } catch (err) {
      console.error('[TimeService] Listener error:', err);
    }
  });
}

/**
 * Perform network time synchronization with fallback providers
 */
export async function syncTime() {
  if (isSyncing) return serverOffsetMs;
  isSyncing = true;

  const timeProviders = [
    // 1. Cloudflare CDN Trace (Fastest, ultra-reliable global NTP-synced timestamp)
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('https://cloudflare.com/cdn-cgi/trace', {
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const text = await res.text();
      const match = text.match(/ts=(\d+\.?\d*)/);
      if (match) {
        return Math.round(parseFloat(match[1]) * 1000);
      }
      throw new Error('No ts in Cloudflare response');
    },

    // 2. jsDelivr CDN HTTP Date Header
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('https://cdn.jsdelivr.net', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const dateHeader = res.headers.get('date');
      if (dateHeader) {
        const timeMs = new Date(dateHeader).getTime();
        if (!isNaN(timeMs)) return timeMs;
      }
      throw new Error('No date header in jsDelivr response');
    },

    // 3. TimeAPI.io (Asia/Colombo timezone)
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('https://timeapi.io/api/time/current/zone?timeZone=Asia/Colombo', {
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data.dateTime) {
        const timeMs = new Date(data.dateTime).getTime();
        if (!isNaN(timeMs)) return timeMs;
      }
      throw new Error('Invalid TimeAPI response');
    },

    // 4. WorldTimeAPI
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Colombo', {
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data.unixtime) {
        return data.unixtime * 1000;
      }
      if (data.datetime) {
        const timeMs = new Date(data.datetime).getTime();
        if (!isNaN(timeMs)) return timeMs;
      }
      throw new Error('Invalid WorldTimeAPI response');
    }
  ];

  for (const provider of timeProviders) {
    try {
      const startTime = Date.now();
      const serverTimeMs = await provider();
      const endTime = Date.now();
      const roundTrip = (endTime - startTime) / 2;
      const trueNow = serverTimeMs + roundTrip;
      
      const newOffset = trueNow - Date.now();
      
      // Update offset
      serverOffsetMs = Math.round(newOffset);
      hasSynced = true;

      try {
        localStorage.setItem('pos_time_offset', serverOffsetMs.toString());
      } catch (e) {}

      console.log(`[TimeService] Time synchronized successfully. Offset: ${serverOffsetMs}ms (Laptop clock diff: ${(serverOffsetMs / 1000).toFixed(1)}s)`);
      notifyListeners();
      isSyncing = false;
      return serverOffsetMs;
    } catch (e) {
      // Try next provider
    }
  }

  isSyncing = false;
  return serverOffsetMs;
}

// Auto-sync on import and lifecycle events
if (typeof window !== 'undefined') {
  // Initial sync
  syncTime();

  // Periodic sync every 5 minutes
  setInterval(() => {
    syncTime();
  }, 5 * 60 * 1000);

  // Sync on window focus or coming back online
  window.addEventListener('online', () => syncTime());
  window.addEventListener('focus', () => syncTime());
}

/**
 * Calibrate time using Firestore timestamp if network time failed
 */
export function calibrateFromTimestamp(timestampSeconds) {
  if (hasSynced || !timestampSeconds) return;
  const tsMs = timestampSeconds * 1000;
  const localMs = Date.now();
  // If local clock is off by more than 1 day from latest transaction
  if (Math.abs(localMs - tsMs) > 24 * 60 * 60 * 1000) {
    console.log('[TimeService] Calibrating offset from latest database timestamp');
    serverOffsetMs = tsMs - localMs;
    try {
      localStorage.setItem('pos_time_offset', serverOffsetMs.toString());
    } catch (e) {}
    notifyListeners();
  }
}

/**
 * Get current accurate Date object (laptop time + server offset)
 */
export function getNow() {
  return new Date(Date.now() + serverOffsetMs);
}

/**
 * Get current accurate timestamp in milliseconds
 */
export function getNowMs() {
  return Date.now() + serverOffsetMs;
}

/**
 * Get start of Today (00:00:00.000) based on synchronized real time
 */
export function getTodayStart() {
  const now = getNow();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/**
 * Get end of Today (23:59:59.999) based on synchronized real time
 */
export function getTodayEnd() {
  const now = getNow();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

/**
 * Get start of Current Month (1st 00:00:00.000) based on synchronized real time
 */
export function getMonthStart() {
  const now = getNow();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Get end of Current Month (last day 23:59:59.999) based on synchronized real time
 */
export function getMonthEnd() {
  const now = getNow();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Get start of Current Year (Jan 1 00:00:00.000) based on synchronized real time
 */
export function getYearStart() {
  const now = getNow();
  return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
}

/**
 * Get end of Current Year (Dec 31 23:59:59.999) based on synchronized real time
 */
export function getYearEnd() {
  const now = getNow();
  return new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
}

/**
 * Get accurate 'YYYY-MM-DD' string for today
 */
export function getTodayDateString() {
  const now = getNow();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get accurate 'YYYY-MM' string for current month
 */
export function getCurrentMonthString() {
  const now = getNow();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Get accurate 'YYYY' string for current year
 */
export function getCurrentYearString() {
  const now = getNow();
  return String(now.getFullYear());
}

/**
 * Convert any Firestore timestamp, Date string, or Date to Date object
 */
export function toDateObject(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (value.seconds !== undefined) return new Date(value.seconds * 1000);
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Check if a timestamp or date is within today
 */
export function isToday(value) {
  const d = toDateObject(value);
  if (!d) return false;
  const time = d.getTime();
  return time >= getTodayStart().getTime() && time <= getTodayEnd().getTime();
}

/**
 * Check if a timestamp or date is within the current month
 */
export function isThisMonth(value) {
  const d = toDateObject(value);
  if (!d) return false;
  const time = d.getTime();
  return time >= getMonthStart().getTime() && time <= getMonthEnd().getTime();
}

/**
 * Check if a timestamp or date is within the current year
 */
export function isThisYear(value) {
  const d = toDateObject(value);
  if (!d) return false;
  const time = d.getTime();
  return time >= getYearStart().getTime() && time <= getYearEnd().getTime();
}

/**
 * Subscribe to time sync changes
 */
export function subscribeTimeSync(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * React Hook to get synced time and auto-refresh when sync occurs
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
