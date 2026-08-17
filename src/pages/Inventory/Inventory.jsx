import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiImage, FiPackage, FiDollarSign, FiTag, FiMaximize, FiDownload, FiZap, FiRefreshCw, FiPrinter, FiCamera } from 'react-icons/fi';
import JsBarcode from 'jsbarcode';
import './Inventory.css';

/**
 * Compress an image file to save storage space.
 * - Resizes to max 300x300 pixels
 * - Converts to JPEG at 50% quality
 * - Typically produces ~20-50KB files instead of several MB
 */
const compressImage = (file, maxWidth = 300, maxHeight = 300, quality = 0.5) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Use white background for JPEG (no transparency)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Image compression failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/** Format bytes to human-readable size */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function Inventory() {
  const { t } = useTranslation();
  const { isOwner } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [compressionInfo, setCompressionInfo] = useState(null); // { original, compressed, savings }
  const [isCompressing, setIsCompressing] = useState(false);
  
  // Barcode scanner state
  const [scannerReady, setScannerReady] = useState(false);
  const barcodeInputRef = useRef(null);

  // Stock Update Quick Modal State
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockItem, setStockItem] = useState(null);
  const [newStockVal, setNewStockVal] = useState('');
  const [stockModalError, setStockModalError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    id: '', // Empty if new item
    name: '',
    category: '',
    itemType: 'non-weighed', // 'weighed' or 'non-weighed'
    purchasePrice: '',
    markedPrice: '',
    sellPrice: '',
    stock: '',
    description: '',
    imageUrl: '',
    imageFile: null,
    compressedFile: null, // Compressed version ready for upload
    barcode: '',
    isEdit: false
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'items'));
      const itemList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(itemList);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchInputRef = useRef(null);

  useEffect(() => {
    fetchItems();
  }, []);

  // Keyboard shortcuts for Inventory page
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

      if ((e.key === 'f' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !isInput)) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        handleOpenAdd();
        return;
      }

      if (isModalOpen && e.altKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        generateRandomBarcode();
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, items]);

  const handleOpenAdd = () => {
    let maxNo = 0;
    items.forEach(item => {
      if (item.itemNo > maxNo) maxNo = item.itemNo;
    });
    const nextNo = maxNo + 1;

    setFormData({ 
      id: '', itemNo: nextNo, name: '', category: 'වී කෙටීම', itemType: 'non-weighed', purchasePrice: '', markedPrice: '', sellPrice: '', stock: '', description: '', 
      imageUrl: '', imageFile: null, compressedFile: null, barcode: '', isEdit: false 
    });
    setModalError('');
    setCompressionInfo(null);
    setScannerReady(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setFormData({ 
      id: item.id, itemNo: item.itemNo || '', name: item.name, category: item.category, 
      itemType: item.itemType || 'non-weighed',
      purchasePrice: item.purchasePrice || '', markedPrice: item.markedPrice || '', sellPrice: item.sellPrice || item.price || '', 
      stock: item.stock, description: item.description, 
      imageUrl: item.imageUrl || '', imageFile: null, compressedFile: null, barcode: item.barcode || '', isEdit: true 
    });
    setModalError('');
    setCompressionInfo(null);
    setScannerReady(false);
    setIsModalOpen(true);
  };

  // Activate scanner mode: focus the barcode field so the USB/BT scanner can fill it
  const activateScannerMode = useCallback(() => {
    setScannerReady(true);
    setTimeout(() => {
      barcodeInputRef.current?.focus();
      barcodeInputRef.current?.select();
    }, 50);
  }, []);

  // Handle Enter key inside the barcode field (scanner sends Enter after scan)
  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setScannerReady(false);
      // Move focus to name field if empty, otherwise stay
      if (!formData.name) {
        document.getElementById('inv-item-name')?.focus();
      }
    }
  };

  const generateRandomBarcode = () => {
    const itemNoVal = formData.itemNo || (items.reduce((max, i) => (i.itemNo > max ? i.itemNo : max), 0) + 1);
    const generated = `ITM${itemNoVal}`;
    setFormData(prev => ({ ...prev, barcode: generated }));
  };

  const downloadBarcode = (barcode, itemName) => {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, barcode, { format: "CODE128" });
    const url = canvas.toDataURL("image/png");
    const link = document.createElement('a');
    link.href = url;
    link.download = `barcode_${itemName}_${barcode}.png`;
    link.click();
  };

  const printBarcodeLabel = (item) => {
    const barcodeVal = item.barcode || `ITM${item.itemNo || ''}`;
    const canvas = document.createElement('canvas');
    try {
      JsBarcode(canvas, barcodeVal, {
        format: "CODE128",
        width: 2,
        height: 50,
        displayValue: true,
        fontSize: 14,
        margin: 5
      });
      const barcodeImgData = canvas.toDataURL("image/png");

      const printWindow = window.open('', '_blank', 'width=400,height=400');
      if (!printWindow) {
        alert("Pop-up blocked! Please allow pop-ups to print barcode label.");
        return;
      }

      printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Barcode Label - ${item.name || ''}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans Sinhala', Arial, sans-serif;
      width: 50mm;
      margin: 0 auto;
      padding: 3mm;
      text-align: center;
      color: #000;
    }
    .shop-name { font-size: 10px; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
    .item-title { font-size: 12px; font-weight: 700; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item-price { font-size: 14px; font-weight: 800; margin-bottom: 4px; }
    .barcode-img { width: 100%; max-width: 45mm; height: auto; display: block; margin: 0 auto; }
    @media print {
      body { width: 50mm; margin: 0; padding: 2mm; }
      @page { size: 50mm 30mm; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="shop-name">සුමින්ද ස්ටෝර්ස්</div>
  <div class="item-title">#${item.itemNo || ''} ${item.name || ''}</div>
  <div class="item-price">Rs. ${Number(item.sellPrice || item.price || 0).toFixed(2)}</div>
  <img src="${barcodeImgData}" class="barcode-img" alt="Barcode" />
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    };
  </script>
</body>
</html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error("Error printing barcode label:", err);
      alert("Could not generate barcode print label.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        await deleteDoc(doc(db, 'items', id));
        setItems(items.filter(item => item.id !== id));
      } catch (error) {
        console.error("Error deleting item:", error);
        alert("Failed to delete item.");
      }
    }
  };

  const handleOpenStockUpdate = (item) => {
    setStockItem(item);
    setNewStockVal(item.stock !== undefined ? String(item.stock) : '');
    setStockModalError('');
    setIsStockModalOpen(true);
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    if (newStockVal === '' || isNaN(Number(newStockVal)) || Number(newStockVal) < 0) {
      setStockModalError("Please enter a valid stock amount (0 or positive).");
      return;
    }
    setActionLoading(true);
    setStockModalError('');
    try {
      const updatedStock = Number(newStockVal);
      await updateDoc(doc(db, 'items', stockItem.id), {
        stock: updatedStock,
        updatedAt: serverTimestamp()
      });
      setIsStockModalOpen(false);
      fetchItems();
    } catch (err) {
      console.error("Error updating stock:", err);
      setStockModalError("Failed to update stock. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const fileInputRef = useRef(null);
  
  const handlePickFile = () => {
    fileInputRef.current?.click();
  };
  
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, imageFile: file, compressedFile: null }));
      setIsCompressing(true);
      setCompressionInfo(null);
      
      try {
        const compressed = await compressImage(file, 300, 300, 0.5);
        const originalSize = file.size;
        const compressedSize = compressed.size;
        const savings = Math.round((1 - compressedSize / originalSize) * 100);
        
        setCompressionInfo({
          original: formatFileSize(originalSize),
          compressed: formatFileSize(compressedSize),
          savings: savings > 0 ? savings : 0
        });
        setFormData(prev => ({ ...prev, compressedFile: compressed }));
      } catch (err) {
        console.error('Compression failed:', err);
        // Fallback: use original file
        setFormData(prev => ({ ...prev, compressedFile: file }));
        setCompressionInfo(null);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setActionLoading(true);

    try {
      let uploadedImageUrl = formData.imageUrl;

      if (formData.imageFile) {
        try {
          // Convert compressed image to Base64 data URL and store directly in Firestore
          // Since images are compressed to ~20-50KB, they fit easily in Firestore documents (1MB limit)
          const fileToConvert = formData.compressedFile || formData.imageFile;
          uploadedImageUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result); // Base64 data URL
            reader.onerror = () => reject(new Error('Failed to read image file'));
            reader.readAsDataURL(fileToConvert);
          });
        } catch (imgError) {
          console.error("Image conversion error:", imgError);
          throw new Error("Could not process the image. Please try a different image.");
        }
      }

      // Check if itemNo is already used by another item
      const itemNumber = Number(formData.itemNo) || 1;
      const duplicateItemNo = items.find(i => Number(i.itemNo) === itemNumber && i.id !== formData.id);
      if (duplicateItemNo) {
        setModalError("This Item Number (#" + itemNumber + ") is already used by another item.");
        setActionLoading(false);
        return;
      }

      // Barcode handling: If scanned/entered barcode exists, use it. Otherwise auto-generate ITM{itemNumber}
      const rawBarcode = formData.barcode ? formData.barcode.trim() : '';
      const finalBarcode = rawBarcode || `ITM${itemNumber}`;

      // Check if barcode is already used by another item
      const duplicateBarcode = items.find(i => 
        i.barcode && 
        i.barcode.trim().toLowerCase() === finalBarcode.toLowerCase() && 
        i.id !== formData.id
      );
      if (duplicateBarcode) {
        setModalError(`මෙම බාරකෝඩ් එක (${finalBarcode}) "${duplicateBarcode.name}" (Item #${duplicateBarcode.itemNo || ''}) සඳහා දැනටමත් භාවිත කර ඇත.`);
        setActionLoading(false);
        return;
      }

      const itemData = {
        itemNo: itemNumber,
        name: formData.name,
        category: formData.category,
        itemType: formData.itemType || 'non-weighed',
        purchasePrice: Number(formData.purchasePrice) || 0,
        markedPrice: formData.markedPrice ? Number(formData.markedPrice) : Number(formData.sellPrice),
        sellPrice: Number(formData.sellPrice),
        profit: Number(formData.sellPrice) - (Number(formData.purchasePrice) || 0),
        stock: Number(formData.stock),
        barcode: finalBarcode,
        description: formData.description,
        imageUrl: uploadedImageUrl,
        updatedAt: serverTimestamp()
      };

      if (formData.isEdit) {
        // Update
        await updateDoc(doc(db, 'items', formData.id), itemData);
      } else {
        // Create
        // Use a clean ID or let Firebase generate. Let's use doc() with random ID if setDoc, or just use timestamp
        const docId = `item_${Date.now()}`;
        itemData.createdAt = serverTimestamp();
        await setDoc(doc(db, 'items', docId), itemData);
      }

      setIsModalOpen(false);
      fetchItems();
    } catch (err) {
      console.error(err);
      setModalError(err.message || 'An error occurred while saving the item.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (!search.trim()) return true;
    const s = search.toLowerCase().trim();
    const cleanS = s.replace('#', '').replace('itm', '').replace('item', '').replace('no', '').trim();

    return (
      item.name?.toLowerCase().includes(s) ||
      item.category?.toLowerCase().includes(s) ||
      item.barcode?.toLowerCase().includes(s) ||
      (item.itemNo !== undefined && item.itemNo !== null && (
        item.itemNo.toString() === cleanS ||
        item.itemNo.toString().includes(cleanS) ||
        `#${item.itemNo}`.includes(s) ||
        `itm${item.itemNo}`.includes(s)
      ))
    );
  });

  return (
    <div className="inventory-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title gradient-text">{t('inventory.title')}</h1>
          <p className="page-subtitle">{t('inventory.subtitle')}</p>
          <div className="inventory-summary-badges mt-2" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Total Items Count Badge */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)', 
              padding: '8px 14px', 
              borderRadius: '8px', 
              border: '1px solid rgba(59, 130, 246, 0.3)', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px'
            }}>
              <FiPackage style={{ color: '#3b82f6', fontSize: '18px' }} />
              <span className="text-secondary" style={{ fontSize: '13px' }}>මුළු භාණ්ඩ ගණන (Total Items):</span>
              <span style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '16px' }}>
                {items.length}
              </span>
              {search.trim() && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                  (පෙන්වන්නේ: {filteredItems.length})
                </span>
              )}
            </div>

            {/* Total Inventory Value Badge (for Owner) */}
            {isOwner && (
              <div style={{
                background: 'rgba(139, 92, 246, 0.1)', 
                padding: '8px 14px', 
                borderRadius: '8px', 
                border: '1px solid rgba(139, 92, 246, 0.3)', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px'
              }}>
                <FiDollarSign style={{ color: '#8b5cf6', fontSize: '18px' }} />
                <span className="text-secondary" style={{ fontSize: '13px' }}>Full Shop Inventory Value:</span>
                <span className="text-primary font-bold" style={{ fontSize: '16px' }}>
                  Rs. {items.reduce((acc, item) => acc + ((Number(item.stock) || 0) * (Number(item.sellPrice || item.price) || 0)), 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
        <Button onClick={handleOpenAdd} icon={<FiPlus />}>
          {t('items.addItem')}
        </Button>
      </div>

      <div className="inventory-toolbar glass-card">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder={t('inventory.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-state">{t('inventory.loading')}</div>
      ) : (
        <div className="table-container glass-card">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>{t('inventory.table.item')}</th>
                <th>Type</th>
                <th>{t('inventory.table.category')}</th>
                <th>{t('inventory.table.sellingPrice')}</th>
                <th>{t('inventory.table.expectedProfit')}</th>
                <th>{t('inventory.table.stock')}</th>
                <th>Total Value</th>
                <th>{t('inventory.table.barcode')}</th>
                <th>{t('inventory.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => {
                  const profit = item.profit !== undefined ? item.profit : ((item.sellPrice || item.price || 0) - (item.purchasePrice || 0));
                  
                  return (
                  <tr key={item.id}>
                    <td className="font-bold text-secondary">#{item.itemNo || '-'}</td>
                    <td>
                      <div className="item-name-cell">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="item-thumbnail" />
                        ) : (
                          <div className="item-thumbnail-placeholder"><FiPackage /></div>
                        )}
                        <div>
                          <span className="font-medium d-block">{item.name}</span>
                          <span className="text-secondary text-sm">{item.description?.substring(0, 30)}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`type-badge ${item.itemType === 'weighed' ? 'weighed' : 'non-weighed'}`}>
                        {item.itemType === 'weighed' ? 'බර කිරන' : 'බර නොකිරන'}
                      </span>
                    </td>
                    <td>
                      <span className="category-badge">{item.category}</span>
                    </td>
                    <td className="font-medium">Rs. {Number(item.sellPrice || item.price || 0).toFixed(2)}</td>
                    <td className="font-medium text-success">
                      Rs. {profit.toFixed(2)}
                    </td>
                    <td>
                      <span className={`stock-badge ${item.stock <= 5 ? 'low-stock' : 'in-stock'}`}>
                        {typeof item.stock === 'number' || !isNaN(Number(item.stock)) 
                          ? (Number(item.stock) % 1 === 0 ? Number(item.stock) : Number(item.stock).toFixed(2)) 
                          : (item.stock || 0)} {item.itemType === 'weighed' ? 'kg' : t('inventory.table.inStock')}
                      </span>
                    </td>
                    <td className="font-bold text-primary">
                       Rs. {Number((item.stock || 0) * (item.sellPrice || item.price || 0)).toFixed(2)}
                    </td>
                    <td>
                      <div className="barcode-cell" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="barcode-text" style={{ fontWeight: 600 }}>{item.barcode || `ITM${item.itemNo || ''}`}</span>
                        <button 
                          type="button" 
                          onClick={() => printBarcodeLabel(item)} 
                          title="Print Barcode Label / Sticker"
                          style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', padding: '3px 6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 600 }}
                        >
                          <FiPrinter style={{ fontSize: '12px' }} /> Print
                        </button>
                        <button 
                          type="button" 
                          onClick={() => downloadBarcode(item.barcode || `ITM${item.itemNo || ''}`, item.name)} 
                          title="Download Barcode PNG Image"
                          style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', padding: '3px 6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}
                        >
                          <FiDownload style={{ fontSize: '12px' }} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="icon-btn edit-btn" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.2)' }} onClick={() => handleOpenStockUpdate(item)} title="Update Stock">
                          <FiRefreshCw />
                        </button>
                        <button className="icon-btn edit-btn" onClick={() => handleOpenEdit(item)} title={t('common.edit')}>
                          <FiEdit2 />
                        </button>
                        <button className="icon-btn delete-btn" onClick={() => handleDelete(item.id)} title={t('common.delete')}>
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                )
              ) : (
                <tr>
                  <td colSpan="10" className="empty-state">{t('inventory.table.empty')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={formData.isEdit ? t('items.editItem') : t('items.addItem')}
      >
        <form onSubmit={handleSubmit} className="inventory-form">
          {modalError && <div className="modal-error">{modalError}</div>}
          
          <div className="form-row">
            <Input
              id="inv-item-name"
              label={t('inventory.form.itemName')}
              icon={<FiPackage/>}
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
              placeholder="e.g. Wireless Mouse"
            />
            
            <div className="form-group">
              <label className="input-label">{t('inventory.form.category')}</label>
              <div className="input-wrapper">
                <span className="input-icon"><FiTag /></span>
                <select 
                  className="ui-input select-with-icon"
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="වී කෙටීම">වී කෙටීම</option>
                  <option value="පොල් කෙටීම">පොල් කෙටීම</option>
                  <option value="සහල්">සහල්</option>
                  <option value="පොල්තෙල්">පොල්තෙල්</option>
                  <option value="හාඩ්වයාර්">හාඩ්වයාර්</option>
                  <option value="බිස්කට්">බිස්කට්</option>
                  <option value="සබන්">සබන්</option>
                  <option value="කුළුබඩු">කුළුබඩු</option>
                  <option value="ඉලෙක්ට්රනික බඩු">ඉලෙක්ට්රනික බඩු</option>
                  <option value="වෙනත් භාණ්ඩ">වෙනත් භාණ්ඩ</option>
                </select>
              </div>
            </div>
          </div>

          {/* Item Type Selection */}
          <div className="form-group">
            <label className="input-label">භාණ්ඩ වර්ගය / Item Type</label>
            <div className="item-type-toggle">
              <button
                type="button"
                className={`type-toggle-btn ${formData.itemType === 'non-weighed' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, itemType: 'non-weighed'})}
              >
                <span className="type-emoji">📦</span>
                <span className="type-label-main">බර නොකිරන භාන්ඩ</span>
                <span className="type-label-sub">Sold by piece/unit</span>
              </button>
              <button
                type="button"
                className={`type-toggle-btn ${formData.itemType === 'weighed' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, itemType: 'weighed'})}
              >
                <span className="type-emoji">⚖️</span>
                <span className="type-label-main">බර කිරන භාණ්ඩ</span>
                <span className="type-label-sub">Sold by weight (kg)</span>
              </button>
            </div>
          </div>
          
          <div className="form-row">
            <Input
              label={t('inventory.form.purchasePrice')}
              icon={<FiDollarSign/>}
              type="number"
              step="0.01"
              value={formData.purchasePrice}
              onChange={e => setFormData({...formData, purchasePrice: e.target.value})}
              placeholder="0.00"
            />
            <Input
              label="සඳහන් මිල (MRP - Optional)"
              icon={<FiDollarSign/>}
              type="number"
              step="0.01"
              value={formData.markedPrice}
              onChange={e => setFormData({...formData, markedPrice: e.target.value})}
              placeholder={formData.sellPrice || "0.00"}
            />
            <Input
              label={t('inventory.form.sellPrice')}
              icon={<FiDollarSign/>}
              type="number"
              step="0.01"
              value={formData.sellPrice}
              onChange={e => setFormData({...formData, sellPrice: e.target.value})}
              required
              placeholder="0.00"
            />
          </div>

          <div className="form-row">
            <div className="form-group profit-calculator">
              <label className="input-label">{t('inventory.form.autoProfit')}</label>
              <div className="profit-display">
                Rs. {((Number(formData.sellPrice) || 0) - (Number(formData.purchasePrice) || 0)).toFixed(2)}
              </div>
            </div>
            
            <Input
              label={formData.itemType === 'weighed' ? 'Initial Stock (kg)' : t('inventory.form.initialStock')}
              icon={<FiPackage/>}
              type="number"
              step={formData.itemType === 'weighed' ? '0.01' : '1'}
              value={formData.stock}
              onChange={e => setFormData({...formData, stock: e.target.value})}
              required
              placeholder={formData.itemType === 'weighed' ? '0.00 kg' : '0'}
            />
          </div>

          {/* Image Upload Area */}
          <div className="form-group">
            <label className="input-label">
              {t('inventory.form.productImage')}
              <span className="label-badge"><FiZap /> Low Space</span>
            </label>
            
            <div className={`image-upload-area ${formData.imageFile || formData.imageUrl ? 'has-image' : ''}`} onClick={handlePickFile}>
              <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*" 
                onChange={handleImageChange}
                className="file-input-hidden"
              />
              
              {isCompressing ? (
                <div className="compressing-indicator">
                  <div className="compress-spinner"></div>
                  <span className="upload-text">Compressing image...</span>
                  <span className="upload-hint">Optimizing for low space usage</span>
                </div>
              ) : (
                <div className="file-upload-content">
                  <FiImage className="upload-icon" />
                  <span className="upload-text">
                    {formData.imageFile 
                      ? `${t('inventory.form.selected')} ${formData.imageFile.name}` 
                      : formData.imageUrl 
                        ? t('inventory.form.changeImage') 
                        : t('inventory.form.selectImage')}
                  </span>
                  <span className="upload-hint">Images auto-compressed to save space (max ~50KB)</span>
                </div>
              )}
              
              {(formData.imageUrl || formData.imageFile) && (
                <div className="preview-container">
                    <img 
                      src={formData.imageFile ? URL.createObjectURL(formData.compressedFile || formData.imageFile) : formData.imageUrl} 
                      alt="Preview" 
                      className="image-preview"
                    />
                    <button 
                      type="button" 
                      className="remove-image-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData({ ...formData, imageFile: null, compressedFile: null, imageUrl: '' });
                        setCompressionInfo(null);
                      }}
                      title="Remove image"
                    >
                      ×
                    </button>
                </div>
              )}
            </div>

            {/* Compression Info Badge */}
            {compressionInfo && (
              <div className="compression-info">
                <FiZap className="compression-icon" />
                <div className="compression-details">
                  <span className="compression-sizes">
                    {compressionInfo.original} → {compressionInfo.compressed}
                  </span>
                  <span className="compression-savings">
                    {compressionInfo.savings}% space saved!
                  </span>
                </div>
              </div>
            )}
          </div>

            <div className="url-input-fallback">
              <span className="divider-text">OR paste image link:</span>
              <Input
                placeholder="https://example.com/image.jpg"
                value={formData.imageUrl}
                onChange={e => setFormData({...formData, imageUrl: e.target.value, imageFile: null, compressedFile: null})}
                icon={<FiSearch />}
              />
            </div>

          {/* Barcode Section */}
          <div className="form-group">
            <label className="input-label">
              {t('items.barcode')}
              <span className="label-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', marginLeft: '8px' }}>
                📷 Scan or Auto-Generate
              </span>
            </label>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              බිස්කට් වැනි භාණ්ඩවල ඇති බාරකෝඩ් එක <strong>"📷 Scan Now"</strong> ක්ලික් කර Scan කරන්න. බාරකෝඩ් නොමැති භාණ්ඩ සඳහා <strong>"⚡ Auto Generate"</strong> ක්ලික් කරන්න, ඉන්පසු Print කර Scanner එකෙන් Scan කරන්න.
            </p>

            {/* Scanner Ready Indicator */}
            {scannerReady && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'rgba(16, 185, 129, 0.12)', border: '2px solid #10b981',
                borderRadius: '10px', padding: '10px 14px', marginBottom: '10px',
                animation: 'scannerPulse 1.2s ease-in-out infinite'
              }}>
                <span style={{ fontSize: '22px' }}>📡</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#10b981', fontSize: '13px' }}>Scanner Ready! / ස්කෑනර් සූදානම්!</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Scan the barcode now. It will auto-fill below. / දැන් Scanner එකෙන් scan කරන්න.</div>
                </div>
                <button type="button" onClick={() => setScannerReady(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>×</button>
              </div>
            )}

            <div className="barcode-gen-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <div className="input-wrapper" style={{ position: 'relative' }}>
                  <span className="input-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: scannerReady ? '#10b981' : 'var(--text-muted)', transition: 'color 0.3s' }}>
                    <FiMaximize />
                  </span>
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    className={`input-field has-icon${scannerReady ? ' barcode-scan-active' : ''}`}
                    placeholder={scannerReady ? '🔴 Scanning... / ස්කෑන් වෙමින්...' : 'Scan barcode or leave blank for auto-generate...'}
                    value={formData.barcode}
                    onChange={e => setFormData({...formData, barcode: e.target.value})}
                    onKeyDown={handleBarcodeKeyDown}
                    onBlur={() => setScannerReady(false)}
                    onFocus={() => { if (barcodeInputRef.current === document.activeElement) setScannerReady(true); }}
                    style={{
                      borderColor: scannerReady ? '#10b981' : undefined,
                      boxShadow: scannerReady ? '0 0 0 3px rgba(16,185,129,0.2)' : undefined,
                      transition: 'border-color 0.3s, box-shadow 0.3s'
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={activateScannerMode}
                style={{
                  background: scannerReady ? '#10b981' : 'rgba(16,185,129,0.12)',
                  color: scannerReady ? '#fff' : '#10b981',
                  border: '2px solid #10b981',
                  borderRadius: '8px', padding: '0 14px', cursor: 'pointer',
                  fontWeight: 700, fontSize: '13px',
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  transition: 'all 0.2s', whiteSpace: 'nowrap'
                }}
              >
                <FiCamera /> Scan Now
              </button>
              <Button type="button" variant="secondary" onClick={generateRandomBarcode} size="sm">
                ⚡ Auto Generate
              </Button>
            </div>
            {formData.barcode && (
              <div className="barcode-preview-area" style={{ marginTop: '10px', padding: '10px', background: '#ffffff', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <canvas ref={el => { if (el && formData.barcode) { try { JsBarcode(el, formData.barcode, { format: "CODE128", height: 45, displayValue: true }); } catch(e) {} } }} />
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <button 
                    type="button" 
                    className="barcode-download-mini"
                    onClick={() => printBarcodeLabel({ ...formData, itemNo: formData.itemNo, sellPrice: formData.sellPrice })}
                    style={{ background: '#10b981', color: '#ffffff', border: 'none', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <FiPrinter /> Print Sticker Label
                  </button>
                  <button 
                    type="button" 
                    className="barcode-download-mini"
                    onClick={() => downloadBarcode(formData.barcode, formData.name || 'item')}
                    style={{ background: '#3b82f6', color: '#ffffff', border: 'none', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <FiDownload /> Download PNG
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="input-label">{t('inventory.form.description')}</label>
            <textarea 
              className="ui-input ui-textarea"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Enter product description here..."
              rows="3"
            />
          </div>

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={actionLoading}>{formData.isEdit ? t('common.save') : t('items.addItem')}</Button>
          </div>
        </form>
      </Modal>
      {/* Quick Stock Update Modal */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title={`Update Stock: ${stockItem?.name}`}
      >
        <form onSubmit={handleStockSubmit} className="inventory-form">
          {stockModalError && <div className="modal-error">{stockModalError}</div>}
          
          <div style={{ marginBottom: '1rem' }}>
             <p className="text-secondary pb-1" style={{ fontSize: 'var(--fs-sm)' }}>Current Stock Level:</p>
             <h2 className="font-bold text-xl" style={{ color: 'var(--primary-400)' }}>
               {stockItem?.stock || 0} {stockItem?.itemType === 'weighed' ? 'kg' : 'units'}
             </h2>
          </div>

          <Input
            label={stockItem?.itemType === 'weighed' ? "New Stock Level (kg)" : "New Stock Level (Units)"}
            icon={<FiPackage/>}
            type="number"
            step={stockItem?.itemType === 'weighed' ? '0.01' : '1'}
            value={newStockVal}
            onChange={e => setNewStockVal(e.target.value)}
            required
            placeholder="Enter new amount"
            autoFocus
          />

          <div className="modal-actions mt-4">
            <Button type="button" variant="secondary" onClick={() => setIsStockModalOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={actionLoading}>Update Stock</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
