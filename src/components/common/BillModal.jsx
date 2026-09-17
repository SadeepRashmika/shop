import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FiPrinter, FiX, FiCheckCircle } from 'react-icons/fi';
import { getShopInfo, formatBillQty, generateBillPDF } from '../../services/receiptService';
import { formatSriLankaDateTime } from '../../services/timeService';
import './BillModal.css';

export default function BillModal({ isOpen, onClose, billData }) {
  if (!billData) return null;

  const shopInfo = getShopInfo();
  const billNum = billData.billNumber ? String(billData.billNumber).padStart(6, '0') : (billData.id ? billData.id.substring(0, 8) : '000000');
  const dateStr = formatSriLankaDateTime(billData.date || billData.timestamp);
  const items = billData.items || [];
  const billTotal = Number(billData.total || 0);

  const isCash = (billData.paymentMethod || '').toLowerCase() === 'cash';
  const isCredit = (billData.paymentMethod || '').toLowerCase() === 'credit';
  const isHomeUse = (billData.paymentMethod || '').toLowerCase() === 'home_use';

  const tendered = (billData.tenderedAmount !== undefined && billData.tenderedAmount !== null && Number(billData.tenderedAmount) > 0)
    ? Number(billData.tenderedAmount)
    : (isCash ? billTotal : 0);

  const change = Math.max(0, tendered - billTotal);
  const creditOwed = Math.max(0, billTotal - tendered);

  const totalSavings = isCredit ? 0 : items.reduce((sum, item) => {
    const mPrice = Number(item.markedPrice) || Number(item.sellPrice || item.price || 0);
    const sPrice = Number(item.sellPrice || item.price || 0);
    const qty = Number(item.quantity) || 1;
    return sum + Math.max(0, (mPrice - sPrice) * qty);
  }, 0);

  const handlePrint = () => {
    generateBillPDF(billData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`🧾 විකුණුම් බිල්පත (Bill #${billNum})`}
      maxWidth="500px"
    >
      <div className="bill-receipt-paper">
        {/* Header */}
        <div className="receipt-header-section">
          <div className="receipt-shop-name">{shopInfo.name}</div>
          <div className="receipt-shop-detail">{shopInfo.address}</div>
          <div className="receipt-shop-detail">Tel: {shopInfo.phone} {shopInfo.email ? `| ${shopInfo.email}` : ''}</div>
          <div className="receipt-bill-badge">BILL #{billNum}</div>
        </div>

        {/* Metadata */}
        <div className="receipt-meta-grid">
          <div className="receipt-meta-row">
            <span>📅 දිනය / වේලාව:</span>
            <strong>{dateStr}</strong>
          </div>
          <div className="receipt-meta-row">
            <span>👤 අයකැමි (Cashier):</span>
            <span>{billData.cashierName || 'Cashier'}</span>
          </div>
          <div className="receipt-meta-row">
            <span>💳 ගෙවීම් ක්‍රමය:</span>
            <span style={{ 
              textTransform: 'uppercase', 
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '4px',
              background: isCash ? '#dcfce7' : isCredit ? '#fee2e2' : '#e0e7ff',
              color: isCash ? '#166534' : isCredit ? '#991b1b' : '#3730a3'
            }}>
              {billData.paymentMethod || 'CASH'}
            </span>
          </div>
          {billData.debtorName && (
            <div className="receipt-meta-row">
              <span>👤 ණයගැතියා (Customer):</span>
              <strong>{billData.debtorName}</strong>
            </div>
          )}
        </div>

        {/* Items Table */}
        <table className="receipt-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>භාණ්ඩය</th>
              <th style={{ textAlign: 'center' }}>ප්‍රමාණය</th>
              <th style={{ textAlign: 'right' }}>මිල</th>
              <th style={{ textAlign: 'right' }}>එකතුව</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const qtyNum = Number(item.quantity) || 0;
              const sPrice = Number(item.sellPrice ?? item.price ?? item.markedPrice ?? (qtyNum > 0 ? (Number(item.subtotal) / qtyNum) : 0)) || 0;
              const subtotal = Number(item.subtotal ?? (sPrice * qtyNum)) || 0;
              const formattedQty = formatBillQty(item);

              return (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{item.name || 'Item'}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{formattedQty}</td>
                  <td style={{ textAlign: 'right' }}>Rs. {sPrice.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>Rs. {subtotal.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="receipt-totals-section">
          <div className="receipt-total-row">
            <span>වර්ග ගණන (Item Types):</span>
            <strong>{items.length}</strong>
          </div>
          <div className="receipt-total-row grand-total">
            <span>මුළු එකතුව (Total):</span>
            <span>Rs. {billTotal.toFixed(2)}</span>
          </div>
          {!isHomeUse && (
            <div className="receipt-total-row">
              <span>ලැබුණු මුදල (Paid):</span>
              <span>Rs. {tendered.toFixed(2)}</span>
            </div>
          )}
          {isCash && (
            <div className="receipt-total-row" style={{ color: '#16a34a', fontWeight: 700 }}>
              <span>ඉතිරි මුදල (Change):</span>
              <span>Rs. {change.toFixed(2)}</span>
            </div>
          )}
          {isCredit && (
            <div className="receipt-total-row" style={{ color: '#dc2626', fontWeight: 700 }}>
              <span>ණය මුදල (Owed):</span>
              <span>Rs. {creditOwed.toFixed(2)}</span>
            </div>
          )}
          {billData.profit !== undefined && (
            <div className="receipt-total-row" style={{ color: '#2563eb', fontSize: '12px' }}>
              <span>ලාභය (Profit):</span>
              <span>Rs. {Number(billData.profit || 0).toFixed(2)}</span>
            </div>
          )}

          {totalSavings > 0 && (
            <div className="receipt-savings-banner">
              🎉 ඔබට ලැබුණු මුළු ලාභය / ඉතිරිය: Rs. {totalSavings.toFixed(2)}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="receipt-footer-text">
          <div>ස්තූතියි! නැවත එන්න! (Thank You! Come Again!)</div>
        </div>
      </div>

      <div className="bill-modal-actions">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          icon={<FiX />}
        >
          වසන්න (Close)
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handlePrint}
          icon={<FiPrinter />}
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', fontWeight: 700 }}
        >
          🖨️ බිල්පත Print කරන්න
        </Button>
      </div>
    </Modal>
  );
}
