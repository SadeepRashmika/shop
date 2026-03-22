import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { FiPlus, FiEdit2, FiTrash2, FiImage, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import './Advertisements.css';

/**
 * Compress an image file to save storage space.
 * - Resizes to max 800x400 pixels for Ads
 * - Converts to JPEG at 60% quality
 */
const compressImage = (file, maxWidth = 800, maxHeight = 400, quality = 0.6) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

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

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function Advertisements() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    badge: '',
    imageUrl: '',
    imageFile: null,
    compressedFile: null,
    active: true
  });

  const [saving, setSaving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'advertisements'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const adsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAds(adsData);
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      badge: '',
      imageUrl: '',
      imageFile: null,
      compressedFile: null,
      active: true
    });
    setCompressionInfo(null);
    setIsEditing(false);
    setEditId(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEditModal = (ad) => {
    setFormData({
      title: ad.title || '',
      description: ad.description || '',
      badge: ad.badge || '',
      imageUrl: ad.imageUrl || '',
      imageFile: null,
      compressedFile: null,
      active: ad.active !== false
    });
    setCompressionInfo(null);
    setEditId(ad.id);
    setIsEditing(true);
    setModalOpen(true);
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, imageFile: file, compressedFile: null }));
      setIsCompressing(true);
      setCompressionInfo(null);
      
      try {
        const compressed = await compressImage(file, 800, 400, 0.6);
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
        setFormData(prev => ({ ...prev, compressedFile: file }));
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      alert('Please fill out the title and description.');
      return;
    }

    setSaving(true);
    try {
      let finalImageUrl = formData.imageUrl;
      if (formData.compressedFile || formData.imageFile) {
        const fileToConvert = formData.compressedFile || formData.imageFile;
        finalImageUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Failed to read image file'));
          reader.readAsDataURL(fileToConvert);
        });
      }

      const adDataToSave = {
        title: formData.title,
        description: formData.description,
        badge: formData.badge,
        imageUrl: finalImageUrl,
        active: formData.active
      };

      if (isEditing) {
        await updateDoc(doc(db, 'advertisements', editId), {
          ...adDataToSave,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'advertisements'), {
          ...adDataToSave,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setModalOpen(false);
      resetForm();
      fetchAds();
    } catch (error) {
      console.error('Error saving ad:', error);
      alert('Failed to save advertisement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this advertisement?')) return;
    
    try {
      await deleteDoc(doc(db, 'advertisements', id));
      fetchAds();
    } catch (error) {
      console.error('Error deleting ad:', error);
      alert('Failed to delete advertisement.');
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, 'advertisements', id), {
        active: !currentStatus,
        updatedAt: serverTimestamp()
      });
      fetchAds();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status.');
    }
  };

  return (
    <div className="advertisements-page container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Advertisements</h1>
          <p className="page-subtitle">Show promotions and offers on your home page.</p>
        </div>
        <Button onClick={handleOpenAddModal} icon={<FiPlus />}>Add Advertisement</Button>
      </div>

      <div className="ads-grid">
        {loading ? (
          <div className="loading-spinner" style={{ margin: 'auto' }}></div>
        ) : ads.length > 0 ? (
          ads.map(ad => (
            <div key={ad.id} className={`ad-card glass-card ${!ad.active ? 'inactive-ad' : ''}`}>
              <div className="ad-card-header">
                {ad.badge ? (
                  <span className={`ad-badge ${ad.badge.toLowerCase() === 'hot' ? 'hot' : ''}`}>
                    {ad.badge.toUpperCase()}
                  </span>
                ) : (
                  <div></div>
                )}
                <div className="ad-status-toggle" onClick={() => toggleActive(ad.id, ad.active)}>
                  {ad.active ? <FiToggleRight className="text-success-400" size={24} /> : <FiToggleLeft className="text-muted" size={24} />}
                  <span className="text-xs">{ad.active ? 'Active' : 'Hidden'}</span>
                </div>
              </div>
              
              {ad.imageUrl ? (
                <div className="ad-image-wrapper">
                  <img src={ad.imageUrl} alt={ad.title} className="ad-image" />
                </div>
              ) : (
                <div className="ad-image-placeholder">
                  <FiImage size={32} />
                  <span>No Image</span>
                </div>
              )}

              <div className="ad-content">
                <h3 className="ad-title">{ad.title}</h3>
                <p className="ad-desc">{ad.description}</p>
              </div>

              <div className="ad-actions">
                <button className="icon-btn edit-btn" onClick={() => handleOpenEditModal(ad)}>
                  <FiEdit2 /> Edit
                </button>
                <button className="icon-btn delete-btn" onClick={() => handleDelete(ad.id)}>
                  <FiTrash2 /> Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon"><FiImage /></div>
            <h2>No Advertisements Yet</h2>
            <p>Add your first promotion to display it on the home page.</p>
            <Button onClick={handleOpenAddModal} icon={<FiPlus />} style={{ marginTop: '1rem' }}>
              Create Advertisement
            </Button>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={isEditing ? 'Edit Advertisement' : 'Add Advertisement'}>
        <form onSubmit={handleSubmit} className="ad-form">
          <div className="form-group">
            <label>Title <span className="text-error-400">*</span></label>
            <input 
              type="text" 
              name="title"
              value={formData.title} 
              onChange={handleChange} 
              required
              className="form-input"
              placeholder="e.g. Grand Opening Sale!"
            />
          </div>
          
          <div className="form-group">
            <label>Description <span className="text-error-400">*</span></label>
            <textarea 
              name="description"
              value={formData.description} 
              onChange={handleChange} 
              required
              className="form-input"
              rows="3"
              placeholder="e.g. Get 20% off on all items..."
            ></textarea>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Badge Text</label>
              <input 
                type="text" 
                name="badge"
                value={formData.badge} 
                onChange={handleChange} 
                className="form-input"
                placeholder="e.g. NEW or HOT"
              />
            </div>
            
            <div className="form-group">
              <label>Status</label>
              <div className="status-checkbox">
                <input 
                  type="checkbox" 
                  id="ad-active"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                />
                <label htmlFor="ad-active">Visible on Home Page</label>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Image</label>
            <div className={`image-upload-area ${formData.imageFile || formData.imageUrl ? 'has-image' : ''}`} onClick={handlePickFile}>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                accept="image/*" 
                style={{display: 'none'}} 
              />
              
              {isCompressing ? (
                <div className="upload-state">
                  <div className="loading-spinner"></div>
                  <span>Compressing image...</span>
                </div>
              ) : formData.compressedFile || formData.imageFile ? (
                <div className="upload-state">
                  <img src={URL.createObjectURL(formData.compressedFile || formData.imageFile)} alt="Preview" className="upload-preview" />
                  <div className="upload-overlay">
                    <FiImage size={24} />
                    <span>Click to change</span>
                  </div>
                </div>
              ) : formData.imageUrl ? (
                <div className="upload-state">
                  <img src={formData.imageUrl} alt="Preview" className="upload-preview" />
                  <div className="upload-overlay">
                    <FiImage size={24} />
                    <span>Click to change</span>
                  </div>
                </div>
              ) : (
                <div className="upload-state empty">
                  <FiImage size={32} />
                  <span>Click to browse or drag image here</span>
                  <small>Images are automatically compressed</small>
                </div>
              )}
            </div>
            
            {compressionInfo && (
              <div className="compression-info mt-2 text-xs">
                <span className="text-success-400">✅ Compressed</span> from {compressionInfo.original} to {compressionInfo.compressed} 
                {compressionInfo.savings > 0 && <span className="ml-2 font-bold">(Saved {compressionInfo.savings}%)</span>}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{isEditing ? 'Update' : 'Save'} Ad</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
