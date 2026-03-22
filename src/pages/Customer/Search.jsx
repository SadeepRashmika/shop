import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import { FiSearch, FiShoppingBag, FiInfo, FiPlus, FiCheckCircle, FiTrash2, FiShoppingCart } from 'react-icons/fi';
import Modal from '../../components/ui/Modal';
import './Customer.css';

export default function CustomerSearch() {
  const { t } = useTranslation();
  const { user, userData } = useAuth();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [orderModal, setOrderModal] = useState(false);
  const [orderQty, setOrderQty] = useState(1);
  const [cart, setCart] = useState([]);
  const [cartModal, setCartModal] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'items'));
        setItems(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const filteredItems = items.filter(i => {
    if (search && i.itemNo?.toString() === search.trim()) return true;
    return i.name.toLowerCase().includes(search.toLowerCase()) || 
           i.category.toLowerCase().includes(search.toLowerCase()) ||
           i.barcode?.toLowerCase().includes(search.toLowerCase());
  });

  const handleAddToCart = () => {
    if (!selectedItem) return;
    
    const existing = cart.find(i => i.id === selectedItem.id);
    if (existing) {
       setCart(cart.map(i => i.id === selectedItem.id ? { 
          ...i, 
          quantity: i.quantity + orderQty, 
          subtotal: i.price * (i.quantity + orderQty) 
       } : i));
    } else {
       setCart([...cart, { 
          id: selectedItem.id,
          name: selectedItem.name,
          price: selectedItem.sellPrice,
          quantity: orderQty,
          subtotal: selectedItem.sellPrice * orderQty
       }]);
    }
    setOrderModal(false);
    setOrderQty(1);
  };

  const cartSubtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);

  const handleCheckoutCart = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const orderData = {
        customerId: user.uid,
        customerName: userData?.name || 'Unknown',
        items: cart,
        total: cartSubtotal,
        status: 'pending',
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'orders'), orderData);
      setCart([]);
      setCartModal(false);
      setOrderSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Failed to place order.");
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  return (
    <div className="customer-page fade-in">
      <div className="page-header">
        <h1 className="page-title gradient-text">{t('nav.search')}</h1>
        <p className="page-subtitle">Browse products and place your orders online</p>
      </div>

      <div className="search-bar-hero glass-card">
         <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="What are you looking for today?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
         </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="loading-state">Browsing catalog...</div>
      ) : (
        <div className="catalog-grid mt-8">
           {filteredItems.map(item => (
             <div key={item.id} className="catalog-card glass-card">
                <div className="catalog-img">
                   {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <div className="img-placeholder"><FiShoppingBag /></div>}
                   <span className="catalog-cat">{item.category}</span>
                </div>
                <div className="catalog-content">
                   <h3 className="catalog-name">{item.name}</h3>
                   <p className="catalog-desc">{item.description?.substring(0, 60)}...</p>
                   <div className="catalog-bottom">
                      <span className="catalog-price">Rs. {item.sellPrice.toFixed(2)}</span>
                      <div className="catalog-actions">
                         <button className="info-btn" onClick={() => { setSelectedItem(item); setOrderModal(true); }}><FiInfo /></button>
                         <Button size="sm" onClick={() => { setSelectedItem(item); setOrderModal(true); }} icon={<FiPlus />}>Order</Button>
                      </div>
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}

      {/* Order Modal */}
      <Modal isOpen={orderModal} onClose={() => setOrderModal(false)} title="Product Details">
         {selectedItem && (
            <div className="details-view">
               <div className="details-header">
                  <div className="details-img">
                     {selectedItem.imageUrl ? <img src={selectedItem.imageUrl} alt={selectedItem.name} /> : <FiShoppingBag />}
                  </div>
                  <div className="details-title">
                     <h2>{selectedItem.name}</h2>
                     <span className="category-badge">{selectedItem.category}</span>
                     <h2 className="text-primary mt-2">Rs. {selectedItem.sellPrice.toFixed(2)}</h2>
                  </div>
               </div>
               
               <div className="details-body mt-6">
                  <h4>Description</h4>
                  <p>{selectedItem.description || "No description available for this item."}</p>
                  
                  <div className="qty-selector mt-6">
                     <span>Quantity:</span>
                     <div className="qty-controls">
                        <button onClick={() => setOrderQty(Math.max(1, orderQty - 1))}>-</button>
                        <span>{orderQty}</span>
                        <button onClick={() => setOrderQty(orderQty + 1)}>+</button>
                     </div>
                  </div>
                  
                  <div className="total-display mt-4">
                     <span>Total Price:</span>
                     <h3>Rs. {(selectedItem.sellPrice * orderQty).toFixed(2)}</h3>
                  </div>
               </div>

               <div className="modal-actions mt-8">
                  <Button variant="secondary" onClick={() => setOrderModal(false)}>Cancel</Button>
                  <Button onClick={handleAddToCart} icon={<FiShoppingBag />}>Add To Cart</Button>
               </div>
            </div>
         )}
      </Modal>

      {cart.length > 0 && (
        <div className="floating-cart-bar">
          <div className="cart-summary">
            <span className="cart-total-items">{cart.length} item(s) in cart</span>
            <span className="cart-total-price">Rs. {cartSubtotal.toFixed(2)}</span>
          </div>
          <Button onClick={() => setCartModal(true)} icon={<FiShoppingCart />}>View Cart</Button>
        </div>
      )}

      {/* Cart Modal */}
      <Modal isOpen={cartModal} onClose={() => setCartModal(false)} title="Your Cart">
         <div className="details-view">
            {cart.length > 0 ? (
               <>
                 <div className="cart-modal-items">
                    {cart.map(item => (
                       <div key={item.id} className="cart-modal-item">
                          <div className="cart-modal-item-info">
                             <span className="cart-modal-item-name">{item.name}</span>
                             <span className="cart-modal-item-price">Rs. {item.price.toFixed(2)}</span>
                          </div>
                          <div className="cart-modal-qty">
                             <span>x{item.quantity}</span>
                             <span className="text-secondary ml-3">Rs. {item.subtotal.toFixed(2)}</span>
                             <button className="remove-item-btn" onClick={() => removeFromCart(item.id)}>
                               <FiTrash2 />
                             </button>
                          </div>
                       </div>
                    ))}
                 </div>
                 
                 <div className="total-display mt-4">
                    <span>Total Amount:</span>
                    <h3>Rs. {cartSubtotal.toFixed(2)}</h3>
                 </div>

                 <div className="modal-actions mt-6">
                    <Button variant="secondary" onClick={() => setCartModal(false)}>Keep Shopping</Button>
                    <Button onClick={handleCheckoutCart} icon={<FiCheckCircle />} loading={loading}>Place Complete Order</Button>
                 </div>
               </>
            ) : (
               <div className="text-center py-6 text-secondary">
                 Your cart is empty.
               </div>
            )}
         </div>
      </Modal>

      {/* Success Modal */}
      <Modal isOpen={orderSuccess} onClose={() => setOrderSuccess(false)} title="Order Placed!">
         <div className="success-content">
            <FiCheckCircle className="success-icon" />
            <h3>Thank you for your order!</h3>
            <p>Your order has been placed and is currently pending processing.</p>
            <div className="mt-6">
               <Button onClick={() => setOrderSuccess(false)}>Continue Shopping</Button>
            </div>
         </div>
      </Modal>
    </div>
  );
}
