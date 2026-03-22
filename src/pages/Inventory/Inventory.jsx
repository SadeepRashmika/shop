import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiImage, FiPackage, FiDollarSign, FiTag, FiMaximize, FiDownload, FiZap } from 'react-icons/fi';
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

  // Form State
  const [formData, setFormData] = useState({
    id: '', // Empty if new item
    name: '',
    category: '',
    itemType: 'non-weighed', // 'weighed' or 'non-weighed'
    purchasePrice: '',
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

  useEffect(() => {
    fetchItems();
  }, []);

  const handleOpenAdd = () => {
    let maxNo = 0;
    items.forEach(item => {
      if (item.itemNo > maxNo) maxNo = item.itemNo;
    });
    const nextNo = maxNo + 1;

    setFormData({ 
      id: '', itemNo: nextNo, name: '', category: 'වී කෙටීම', itemType: 'non-weighed', purchasePrice: '', sellPrice: '', stock: '', description: '', 
      imageUrl: '', imageFile: null, compressedFile: null, barcode: `ITM${nextNo}`, isEdit: false 
    });
    setModalError('');
    setCompressionInfo(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setFormData({ 
      id: item.id, name: item.name, category: item.category, 
      itemType: item.itemType || 'non-weighed',
      purchasePrice: item.purchasePrice || '', sellPrice: item.sellPrice || item.price || '', 
      stock: item.stock, description: item.description, 
      imageUrl: item.imageUrl || '', imageFile: null, compressedFile: null, barcode: item.barcode || '', isEdit: true 
    });
    setModalError('');
    setCompressionInfo(null);
    setIsModalOpen(true);
  };

  const generateRandomBarcode = () => {
    const random = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    setFormData({ ...formData, barcode: random });
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

      const itemData = {
        itemNo: itemNumber,
        name: formData.name,
        category: formData.category,
        itemType: formData.itemType || 'non-weighed',
        purchasePrice: Number(formData.purchasePrice),
        sellPrice: Number(formData.sellPrice),
        profit: Number(formData.sellPrice) - Number(formData.purchasePrice),
        stock: Number(formData.stock),
        barcode: formData.barcode || `item_${Date.now()}`,
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
    if (search && item.itemNo?.toString() === search.trim()) return true;
    return item.name.toLowerCase().includes(search.toLowerCase()) || 
           item.category.toLowerCase().includes(search.toLowerCase()) ||
           item.barcode?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="inventory-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title gradient-text">{t('inventory.title')}</h1>
          <p className="page-subtitle">{t('inventory.subtitle')}</p>
          {isOwner && (
            <div className="mt-2 text-sm" style={{background: 'rgba(139, 92, 246, 0.1)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.3)', display: 'inline-block'}}>
              <span className="text-secondary mr-2" style={{marginRight: '8px'}}>Full Shop Inventory Value:</span>
              <span className="text-primary font-bold text-lg">Rs. {items.reduce((acc, item) => acc + ((item.stock || 0) * (item.sellPrice || item.price || 0)), 0).toFixed(2)}</span>
            </div>
          )}
        </div>
        <Button onClick={handleOpenAdd} icon={<FiPlus />}>{t('items.addItem')}</Button>
      </div>

      <div className="inventory-toolbar glass-card">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input 
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
                        {item.stock} {item.itemType === 'weighed' ? 'kg' : t('inventory.table.inStock')}
                      </span>
                    </td>
                    <td className="font-bold text-primary">
                       Rs. {Number((item.stock || 0) * (item.sellPrice || item.price || 0)).toFixed(2)}
                    </td>
                    <td>
                      <div className="barcode-cell" onClick={() => downloadBarcode(item.barcode, item.name)} title="Click to download barcode">
                        <span className="barcode-text">{item.barcode}</span>
                        <FiDownload className="download-icon-sm" />
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
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
              required
              placeholder="0.00"
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
            <label className="input-label">{t('items.barcode')}</label>
            <div className="barcode-gen-row">
              <Input
                placeholder="Barcode number"
                value={formData.barcode}
                onChange={e => setFormData({...formData, barcode: e.target.value})}
                icon={<FiMaximize />}
              />
              <Button type="button" variant="secondary" onClick={generateRandomBarcode} size="sm">
                {t('items.generateBarcode')}
              </Button>
            </div>
            {formData.barcode && (
              <div className="barcode-preview-area">
                <canvas ref={el => { if (el && formData.barcode) { try { JsBarcode(el, formData.barcode, { format: "CODE128", height: 50, displayValue: true }); } catch(e) {} } }} />
                <button 
                  type="button" 
                  className="barcode-download-mini"
                  onClick={() => downloadBarcode(formData.barcode, formData.name || 'item')}
                  title="Download barcode"
                >
                  <FiDownload /> Download
                </button>
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
    </div>
  );
}
