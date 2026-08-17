import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, doc, getDoc, setDoc, updateDoc, deleteDoc, increment, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiShoppingBag, FiClock, FiCheckCircle, FiXCircle, FiDollarSign, FiTrash2 } from 'react-icons/fi';
import Button from '../../components/ui/Button';
import './Customer.css';

export default function Orders() {
  const { t } = useTranslation();
  const { user, userData, isOwner, isCashier } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
    </div>
  );
}
