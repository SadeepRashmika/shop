import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiShoppingBag, FiClock, FiCheckCircle, FiXCircle, FiDollarSign } from 'react-icons/fi';
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
      <div className="page-header">
        <h1 className="page-title gradient-text">{t('nav.orders')}</h1>
        <p className="page-subtitle">{t('orders.subtitle')}</p>
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
                {(isOwner || isCashier) && order.status !== 'completed' && order.status !== 'cancelled' && (
                  <Button size="sm" onClick={() => handleBillOrder(order)} icon={<FiDollarSign />}>
                    Bill It
                  </Button>
                )}
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
