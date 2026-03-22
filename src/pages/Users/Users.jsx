import { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { db, auth } from '../../services/firebase';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiUser, FiMail, FiLock } from 'react-icons/fi';
import './Users.css';

// We need a secondary Firebase app to create users without signing out the current owner
const firebaseConfig = app => app.options; // Extract config from default app
let secondaryAuth;

export default function Users() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    password: '',
    role: 'cashier',
    isEdit: false
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const userList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    
    // Initialize secondary auth on mount if not already initialized
    try {
      const secondaryApp = initializeApp(auth.app.options, "Secondary");
      secondaryAuth = getAuth(secondaryApp);
    } catch(e) { /* App already initialized */ }
  }, []);

  const handleOpenAdd = () => {
    setFormData({ id: '', name: '', email: '', password: '', role: 'cashier', isEdit: false });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setFormData({ id: user.id, name: user.name, email: user.email, password: '', role: user.role, isEdit: true });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this user? (This will remove their database access)")) {
      try {
        await deleteDoc(doc(db, 'users', id));
        setUsers(users.filter(u => u.id !== id));
      } catch (error) {
        console.error("Error deleting user:", error);
        alert("Failed to delete user.");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setActionLoading(true);

    try {
      if (formData.isEdit) {
        // Update user in Firestore
        await updateDoc(doc(db, 'users', formData.id), {
          name: formData.name,
          role: formData.role
        });
      } else {
        // Create new user in Firebase Auth using Secondary App
        if (!secondaryAuth) {
            const secondaryApp = initializeApp(auth.app.options, "Secondary");
            secondaryAuth = getAuth(secondaryApp);
        }
        
        const result = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
        await signOut(secondaryAuth); // immediately sign out secondary app
        
        // Save to Firestore
        const newUser = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          language: 'en',
          createdAt: serverTimestamp()
        };
        await setDoc(doc(db, 'users', result.user.uid), newUser);
      }
      
      setIsModalOpen(false);
      fetchUsers(); // Refresh list
    } catch (err) {
      console.error(err);
      setModalError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(search.toLowerCase()) || 
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="users-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title gradient-text">{t('usersPage.title')}</h1>
          <p className="page-subtitle">{t('usersPage.subtitle')}</p>
        </div>
        <Button onClick={handleOpenAdd} icon={<FiPlus />}>{t('users.addUser')}</Button>
      </div>

      <div className="users-toolbar glass-card">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input 
            type="text" 
            placeholder={t('usersPage.search')} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-state">{t('usersPage.loading')}</div>
      ) : (
        <div className="table-container glass-card">
          <table className="users-table">
            <thead>
              <tr>
                <th>{t('usersPage.table.name')}</th>
                <th>{t('usersPage.table.email')}</th>
                <th>{t('usersPage.table.role')}</th>
                <th>{t('usersPage.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td>
                        <div className="user-name-cell">
                          <div className={`user-avatar ${user.role}`}>{user.name.charAt(0).toUpperCase()}</div>
                          <span className="font-medium">{user.name}</span>
                        </div>
                    </td>
                    <td className="text-secondary">{user.email}</td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="icon-btn edit-btn" onClick={() => handleOpenEdit(user)} title={t('common.edit')}>
                          <FiEdit2 />
                        </button>
                        {user.role !== 'owner' && (
                          <button className="icon-btn delete-btn" onClick={() => handleDelete(user.id)} title={t('common.delete')}>
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="empty-state">{t('usersPage.table.empty')}</td>
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
        title={formData.isEdit ? t('users.editUser') : t('users.addUser')}
      >
        <form onSubmit={handleSubmit} className="user-form">
          {modalError && <div className="modal-error">{modalError}</div>}
          
          <Input
            label={t('usersPage.form.fullName')}
            icon={<FiUser/>}
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            required
            placeholder="e.g. John Doe"
          />
          
          <Input
            label={t('usersPage.form.email')}
            icon={<FiMail/>}
            type="email"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            required
            disabled={formData.isEdit}
            placeholder="john@example.com"
          />
          
          {!formData.isEdit && (
            <Input
              label={t('usersPage.form.password')}
              icon={<FiLock/>}
              type="password"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              required
              placeholder="Min 6 characters"
            />
          )}

          <div className="form-group">
            <label className="input-label">{t('usersPage.form.role')}</label>
            <select 
              className="ui-input"
              value={formData.role} 
              onChange={e => setFormData({...formData, role: e.target.value})}
            >
              <option value="cashier">{t('auth.cashier')}</option>
              <option value="owner">{t('auth.owner')}</option>
              {formData.isEdit && <option value="customer">{t('auth.customer')}</option>}
            </select>
          </div>

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={actionLoading}>{formData.isEdit ? t('common.save') : t('usersPage.form.createUser')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
