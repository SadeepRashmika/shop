import { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch user role and profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            // Fallback if document doesn't exist
            const isOwner = firebaseUser.email === 'suminda@smartpos.com';
            setUserData({ 
              name: isOwner ? 'Suminda' : (firebaseUser.displayName || firebaseUser.email.split('@')[0]), 
              role: isOwner ? 'owner' : 'cashier', 
              email: firebaseUser.email 
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Fallback if read is blocked
          const isOwner = firebaseUser.email === 'suminda@smartpos.com';
          setUserData({ 
            name: isOwner ? 'Suminda' : (firebaseUser.displayName || firebaseUser.email.split('@')[0]), 
            role: isOwner ? 'owner' : 'cashier', 
            email: firebaseUser.email 
          });
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (input, password) => {
    let email = input.trim();
    
    // Check if user is logging in with a username instead of an email
    if (!email.includes('@')) {
      if (email.toLowerCase() === 'suminda') {
        email = 'suminda@smartpos.com';
      } else {
        try {
          const q = query(collection(db, 'users'), where('name', '==', email));
          const snap = await getDocs(q);
          if (!snap.empty) {
            email = snap.docs[0].data().email;
          }
        } catch (e) {
          console.warn("Could not find user by name", e);
        }
      }
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      try {
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        } else {
           // Fallback if document doesn't exist but login succeeded
           const isOwner = result.user.email === 'suminda@smartpos.com';
           setUserData({ 
             name: isOwner ? 'Suminda' : (result.user.displayName || result.user.email.split('@')[0]), 
             role: isOwner ? 'owner' : 'cashier', 
             email: result.user.email 
           });
        }
      } catch (err) {
        console.warn("Firestore read blocked. Setting local fallback state.", err);
        const isOwner = result.user.email === 'suminda@smartpos.com';
        setUserData({ 
          name: isOwner ? 'Suminda' : (result.user.displayName || result.user.email.split('@')[0]), 
          role: isOwner ? 'owner' : 'cashier', 
          email: result.user.email 
        });
      }
      return result;
    } catch (error) {
      // Auto-create owner account if it doesn't exist
      if ((error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') && email === 'suminda@smartpos.com' && password.trim() === '200221802060') {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const userProfile = {
          name: 'Suminda',
          email: email,
          role: 'owner',
          language: 'en',
          createdAt: serverTimestamp()
        };
        // Wrap database save in try-catch so permission errors don't stop the login
        try {
          await setDoc(doc(db, 'users', result.user.uid), userProfile);
        } catch (e) {
          console.warn("Firestore rules error ignored for local login. Please update Rules in console later.");
        }
        setUserData(userProfile);
        return result;
      }
      throw error;
    }
  };

  const register = async (email, password, name, role) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const userProfile = {
      name,
      email,
      role,
      language: 'en',
      createdAt: serverTimestamp()
    };
    try {
      await setDoc(doc(db, 'users', result.user.uid), userProfile);
    } catch (e) {
       console.warn("Firestore rules error ignored. Please update Rules in console later.");
    }
    setUserData(userProfile);
    return result;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserData(null);
  };

  const value = {
    user,
    userData,
    loading,
    login,
    register,
    logout,
    isOwner: userData?.role === 'owner',
    isCashier: userData?.role === 'cashier',
    isCustomer: userData?.role === 'customer',
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
