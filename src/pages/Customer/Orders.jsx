import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, doc, getDoc, setDoc, updateDoc, deleteDoc, increment, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiShoppingBag, FiClock, FiCheckCircle, FiXCircle, FiDollarSign, FiTrash2, FiEye } from 'react-icons/fi';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import './Customer.css';

export default function Orders() {
  const { t } = useTranslation();
  const { user, userData, isOwner, isCashier } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingOrder, setViewingOrder] = useState(null);

  const navigate = useNavigate();

  const handleBillOrder = (order) => {
    if (order.status === 'completed') return;
    navigate('/sales', { 
      state: { 
        orderItems: order.items, 
        orderId: order.id, 
        customerName: order.customerName, 
        customerId: order.customerId 
      } 
    });
  };

  const handleDeleteOrder = async (orderId) => {
    if (!isOwner) {
      alert("මෙම ක්‍රියාවලිය සඳහා අවසර ඇත්තේ Owner හට පමණි.");
      return;
    }
    const inputPass = prompt("ඇණවුම මකා දැමීමට කරුණාකර Master Password එක ඇතුළත් කරන්න:");
    if (inputPass === null) return;
    if (inputPass !== "723412641") {
      alert("වැරදි මුරපදයක් (Incorrect password). ක්‍රියාවලිය අවලංගු විය.");
      return;
    }

    if (!window.confirm("⚠️ මෙම ඇණවුම ස්ථිරවම මකා දැමීමට (Delete) අවශ්‍යද?")) return;

    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err) {
      console.error("Error deleting order:", err);
      alert("ඇණවුම මකා දැමීමට නොහැකි විය.");
    }
  };

  const handleClearAllOrders = async () => {
    if (!isOwner) {
      alert("මෙම ක්‍රියාවලිය සඳහා අවසර ඇත්තේ Owner හට පමණි.");
      return;
    }
    const inputPass = prompt("සියලුම ඇණවුම් (All Orders) එකවර මකා දැමීමට කරුණාකර Master Password එක ඇතුළත් කරන්න:");
    if (inputPass === null) return;
    if (inputPass !== "723412641") {
      alert("වැරදි මුරපදයක් (Incorrect password). ක්‍රියාවලිය අවලංගු විය.");
      return;
    }

    if (!window.confirm("⚠️ ඔබට පද්ධතියේ ඇති සියලුම ඇණවුම් (All Orders) එකවර ස්ථිරවම මකා දැමීමට අවශ්‍යද?\n\nමෙය ආපසු හැරවිය නොහැක.")) return;

    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const deletePromises = snap.docs.map(d => deleteDoc(doc(db, 'orders', d.id)));
      await Promise.all(deletePromises);
      setOrders([]);
      alert("සියලුම ඇණවුම් සාර්ථකව මකා දමන ලදී (All orders cleared successfully).");
    } catch (err) {
      console.error("Error clearing all orders:", err);
      alert("සියලු ඇණවුම් මකා දැමීමට නොහැකි විය.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        let q;
        if (isOwner || isCashier) {
          // Staff sees all orders
          q = query(
            collection(db, 'orders'),
            orderBy('createdAt', 'desc')
          );
        } else {
          // Customers see only their orders
          q = query(
            collection(db, 'orders'),
            where('customerId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
        }
        
        const snapshot = await getDocs(q);
        setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching orders:", err);
        // Fallback: fetch all and filter client-side if index not ready
        try {
          const allOrders = await getDocs(collection(db, 'orders'));
          let mappedOrders = allOrders.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          if (!isOwner && !isCashier) {
            mappedOrders = mappedOrders.filter(o => o.customerId === user.uid);
          }
          
          mappedOrders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          setOrders(mappedOrders);
        } catch (e2) {
          console.error("Fallback fetch failed:", e2);
        }
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchOrders();
  }, [user]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <FiCheckCircle />;
      case 'cancelled': return <FiXCircle />;
      default: return <FiClock />;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="orders-page fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title gradient-text">{t('nav.orders')}</h1>
          <p className="page-subtitle">{t('orders.subtitle')}</p>
        </div>
        {isOwner && orders.length > 0 && (
          <Button 
            variant="danger" 
            size="sm" 
            onClick={handleClearAllOrders}
            icon={<FiTrash2 />}
            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
          >
            සියලු ඇණවුම් මකන්න (Clear All)
          </Button>
        )}
      </div>

      {loading ? (
        <div className="loading-state">{t('common.loading')}</div>
      ) : orders.length > 0 ? (
        <div className="orders-list">
          {orders.map(order => (
            <div key={order.id} className="order-card glass-card">
              <div className="order-left">
                <div className={`order-icon-wrap ${order.status || 'pending'}`}>
                  {getStatusIcon(order.status)}
                </div>
                <div className="order-details">
                  <h4>
                    {order.items?.map(i => `${i.name} (x${i.quantity})`).join(', ') || 'Order'}
                  </h4>
                  <p>{formatDate(order.createdAt)} • {order.items?.length || 0} item(s)</p>
                  {(isOwner || isCashier) && order.customerName && (
                    <p className="text-primary mt-1" style={{fontSize: '13px'}}>Customer: {order.customerName}</p>
                  )}
                </div>
              </div>
              <div className="order-right" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px'}}>
                <span className="order-amount" style={{fontSize: '18px', fontWeight: 'bold'}}>
                  Rs. {Number(order.total || 0).toFixed(2)}
                </span>
                <span className={`order-status ${order.status || 'pending'}`}>
                  {order.status || 'pending'}
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {(isOwner || isCashier) && (
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => setViewingOrder(order)} 
                      icon={<FiEye />}
                      title="බිල පරීක්ෂා කරන්න (View Bill)"
                      style={{ padding: '6px 10px' }}
                    >
                      View
                    </Button>
                  )}
                  {(isOwner || isCashier) && order.status !== 'completed' && order.status !== 'cancelled' && (
                    <Button size="sm" onClick={() => handleBillOrder(order)} icon={<FiDollarSign />}>
                      Bill It
                    </Button>
                  )}
                  {isOwner && (
                    <Button 
                      size="sm" 
                      variant="danger" 
                      onClick={() => handleDeleteOrder(order.id)} 
                      icon={<FiTrash2 />}
                      title="ඇණවුම මකන්න (Delete Order)"
                      style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px 10px' }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-orders glass-card">
          <FiShoppingBag className="empty-orders-icon" />
          <h3>{t('orders.empty')}</h3>
          <p>{t('orders.emptyDesc')}</p>
        </div>
      )}

      {/* View Bill Modal (Does NOT reduce stock) */}
      <Modal
        isOpen={Boolean(viewingOrder)}
        onClose={() => setViewingOrder(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiEye style={{ color: 'var(--primary-400)' }} />
            <span>ඇණවුම් බිල්පත (Order Bill Preview)</span>
          </div>
        }
        size="md"
      >
        {viewingOrder && (
          <div className="order-bill-preview">
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-color)', paddingBottom: '12px', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>සුමින්ද ස්ටෝර්ස්</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>තලහගම, මාකදුර | 0777640334</p>
                </div>
                <span className={`order-status ${viewingOrder.status || 'pending'}`}>
                  {viewingOrder.status || 'pending'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', marginBottom: '14px' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Customer: </span><strong>{viewingOrder.customerName || 'Unknown'}</strong></div>
                <div style={{ textAlign: 'right' }}><span style={{ color: 'var(--text-muted)' }}>Date: </span><strong>{formatDate(viewingOrder.createdAt)}</strong></div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '6px 0' }}>භාණ්ඩය (Item)</th>
                    <th style={{ padding: '6px 0', textAlign: 'center' }}>ප්‍රමාණය (Qty)</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>මිල (Price)</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>එකතුව (Total)</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewingOrder.items || []).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 0', fontWeight: '500' }}>{item.name}</td>
                      <td style={{ padding: '8px 0', textAlign: 'center' }}>x{item.quantity}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>Rs. {Number(item.price || item.sellPrice || 0).toFixed(2)}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold' }}>
                        Rs. {Number(item.subtotal || ((item.price || item.sellPrice || 0) * (item.quantity || 1))).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid var(--border-color)', marginTop: '12px', paddingTop: '12px' }}>
                <span style={{ fontSize: '15px', fontWeight: 'bold' }}>මුළු මුදල (Grand Total):</span>
                <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--success-400)' }}>
                  Rs. {Number(viewingOrder.total || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ 
              background: 'rgba(59, 130, 246, 0.08)', 
              border: '1px solid rgba(59, 130, 246, 0.25)', 
              borderRadius: '8px', 
              padding: '10px 14px', 
              fontSize: '12px', 
              color: '#93c5fd', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              marginBottom: '16px' 
            }}>
              <span>ℹ️</span>
              <span><strong>සැ.යු:</strong> මෙම බිල බැලීමෙන් (View) තොගයෙන් (Stock) භාණ්ඩ අඩු නොවේ. තොගයෙන් අඩු වන්නේ "Bill It" කර විකිණුම් සම්පූර්ණ කළ පසු පමණි.</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" onClick={() => setViewingOrder(null)}>
                Close
              </Button>
              {(isOwner || isCashier) && viewingOrder.status !== 'completed' && viewingOrder.status !== 'cancelled' && (
                <Button 
                  onClick={() => {
                    const ord = viewingOrder;
                    setViewingOrder(null);
                    handleBillOrder(ord);
                  }} 
                  icon={<FiDollarSign />}
                >
                  Bill & Print
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
