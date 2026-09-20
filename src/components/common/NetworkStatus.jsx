import React, { useState, useEffect } from 'react';
import { FiWifi, FiWifiOff, FiCloud, FiCheckCircle } from 'react-icons/fi';
import './NetworkStatus.css';

export default function NetworkStatus({ compact = false }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showToast, setShowToast] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      setShowToast(true);
      const timer = setTimeout(() => {
        setJustReconnected(false);
        setShowToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
      setShowToast(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {/* Compact badge for Navbar / Header */}
      <div 
        className={`network-badge ${isOnline ? 'online' : 'offline'} ${compact ? 'compact' : ''}`}
        title={isOnline ? 'Cloud සබැඳිය ක්‍රියාකාරීයි' : 'Offline මාදිලිය: දත්ත Local Save වේ. Signal ලැබුණු විට Cloud Upload වේ.'}
      >
        <span className="network-dot"></span>
        {isOnline ? (
          <>
            <FiWifi className="network-icon" />
            <span className="network-text">Online</span>
          </>
        ) : (
          <>
            <FiWifiOff className="network-icon" />
            <span className="network-text">Offline (Local Save)</span>
          </>
        )}
      </div>

      {/* Floating alert banner when connection state changes */}
      {showToast && (
        <div className={`network-toast ${isOnline ? 'toast-online' : 'toast-offline'}`}>
          <div className="network-toast-icon">
            {isOnline ? <FiCheckCircle /> : <FiWifiOff />}
          </div>
          <div className="network-toast-content">
            <div className="toast-title">
              {isOnline ? 'සම්බන්ධතාවය යථා තත්ත්වයට පත් විය!' : 'Signal / Internet විසන්ධි විය (Offline)'}
            </div>
            <div className="toast-desc">
              {isOnline 
                ? 'Offline කාලයේ තැන්පත් වූ සියලු දත්ත Cloud වෙත Auto-Sync වේ.' 
                : 'දත්ත පරිගණකයේ ආරක්ෂිතව Save වේ. Signal පැමිණි පසු Cloud Upload වේ.'}
            </div>
          </div>
          {!isOnline && (
            <button className="toast-close-btn" onClick={() => setShowToast(false)}>
              ✕
            </button>
          )}
        </div>
      )}
    </>
  );
}
