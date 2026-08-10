import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../ui/Modal';
import { FiCommand, FiGrid, FiShoppingCart, FiPackage, FiHelpCircle } from 'react-icons/fi';
import './KeyboardShortcutsModal.css';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  const { t } = useTranslation();

  const shortcutsList = [
    {
      category: 'POS / Sales Screen (විකුණුම් තිරය)',
      icon: <FiShoppingCart />,
      items: [
        { keys: ['F1', 'Ctrl + F', '/'], desc: 'Focus Barcode / Item Search Bar (සෙවුම් තීරුවට යන්න)' },
        { keys: ['Enter'], desc: 'Add scanned barcode / selected item to cart (කරත්තයට එක් කරන්න)' },
        { keys: ['F8', 'Ctrl + Enter'], desc: 'Open Checkout / Complete Bill (ගෙවීම් තිරයට යන්න)' },
        { keys: ['F9', 'Alt + R'], desc: 'Open Quick Reload Modal (රීලෝඩ් කරන්න)' },
        { keys: ['Alt + N'], desc: 'Add Custom Item - නොමැති භාණ්ඩ' },
        { keys: ['Alt + C'], desc: 'Clear Cart (කරත්තය හිස් කරන්න)' },
        { keys: ['Escape'], desc: 'Close open modal / Clear search (නැවත මුලට යන්න)' },
      ]
    },
    {
      category: 'System Navigation (පද්ධතිය පුරා යෑම)',
      icon: <FiGrid />,
      items: [
        { keys: ['F1', 'Alt + 1'], desc: 'Go to Sales / POS Page (විකුණුම් තිරය)' },
        { keys: ['F2', 'Alt + 2'], desc: 'Go to Inventory Page (තොග කළමනාකරණය)' },
        { keys: ['F3', 'Alt + 3'], desc: 'Go to Debtors Page (ණයගැතී කළමනාකරණය)' },
        { keys: ['F4', 'Alt + 4'], desc: 'Go to Reload Page (රීලෝඩ් පිටුව)' },
        { keys: ['F5', 'Alt + 5'], desc: 'Go to Cash Manager (මුදල් කළමනාකරණය)' },
        { keys: ['F6', 'Alt + 6'], desc: 'Go to Reports Page (වාර්තා පිටුව)' },
        { keys: ['F10', 'Alt + H'], desc: 'Go to Dashboard (උපකරණ පුවරුව)' },
        { keys: ['F12', 'Shift + ?'], desc: 'Toggle Keyboard Shortcuts Guide (මෙම පුවරුව)' },
      ]
    },
    {
      category: 'Inventory Page (තොග කළමනාකරණය)',
      icon: <FiPackage />,
      items: [
        { keys: ['F2', 'Alt + A'], desc: 'Add New Item Modal (නව භාණ්ඩයක් එක් කරන්න)' },
        { keys: ['Alt + G'], desc: 'Auto Generate Barcode inside modal' },
        { keys: ['Escape'], desc: 'Close item modal' },
      ]
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⌨️ Keyboard Shortcuts Guide (යතුරුපුවරු කෙටිමං)">
      <div className="shortcuts-modal-content">
        <p className="shortcuts-intro">
          You can operate the entire SmartPOS system without a mouse! Use the following keys:
        </p>

        <div className="shortcuts-sections">
          {shortcutsList.map((sec, idx) => (
            <div key={idx} className="shortcuts-section">
              <h3 className="section-title">
                <span className="sec-icon">{sec.icon}</span>
                {sec.category}
              </h3>
              <div className="shortcuts-table">
                {sec.items.map((item, i) => (
                  <div key={i} className="shortcut-row">
                    <div className="shortcut-keys">
                      {item.keys.map((k, ki) => (
                        <React.Fragment key={ki}>
                          {ki > 0 && <span className="key-separator">or</span>}
                          <kbd className="key-badge">{k}</kbd>
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="shortcut-desc">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="shortcuts-footer">
          <button className="shortcuts-close-btn" onClick={onClose}>
            Got it! (Press Esc)
          </button>
        </div>
      </div>
    </Modal>
  );
}
