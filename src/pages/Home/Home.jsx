import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/layout/Navbar';
import Button from '../../components/ui/Button';
import { FiPackage, FiBarChart2, FiGlobe, FiMaximize } from 'react-icons/fi';
import './Home.css';

export default function Home() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [ads, setAds] = useState([]);

  useEffect(() => {
    const fetchActiveAds = async () => {
      try {
        const q = query(collection(db, 'advertisements'), where('active', '==', true));
        const snap = await getDocs(q);
        const adsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by createdAt manually if not indexed, or just reverse
        adsData.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
        setAds(adsData);
      } catch (err) {
        console.error("Failed to fetch ads", err);
      }
    };
    fetchActiveAds();
  }, []);

  const features = [
    { icon: <FiPackage />, title: t('home.featureInventory'), desc: t('home.featureInventoryDesc') },
    { icon: <FiBarChart2 />, title: t('home.featureSales'), desc: t('home.featureSalesDesc') },
    { icon: <FiGlobe />, title: t('home.featureMultiLang'), desc: t('home.featureMultiLangDesc') },
    { icon: <FiMaximize />, title: t('home.featureBarcode'), desc: t('home.featureBarcodeDesc') },
  ];

  return (
    <div className="home-page">
      <Navbar />

      {/* Hero Section */}
      <section className="hero" id="hero-section">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1"></div>
          <div className="hero-orb hero-orb-2"></div>
          <div className="hero-orb hero-orb-3"></div>
        </div>

        <div className="hero-content container fade-in">
          <h1 className="hero-title">
            <span className="gradient-text">{t('home.welcome')}</span>
          </h1>
          <p className="hero-tagline">{t('home.tagline')}</p>

          <div className="hero-actions">
            {isAuthenticated ? (
              <Button size="lg" onClick={() => navigate('/dashboard')}>{t('nav.dashboard')}</Button>
            ) : (
              <>
                <Button size="lg" onClick={() => navigate('/register')}>{t('home.getStarted')}</Button>
                <Button variant="secondary" size="lg" onClick={() => navigate('/login')}>{t('nav.login')}</Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section container" id="features-section">
        <h2 className="section-title">{t('home.features')}</h2>
        <div className="features-grid">
          {features.map((feature, i) => (
            <div
              key={i}
              className="feature-card glass-card slide-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Promotions Section */}
      {ads.length > 0 ? (
        <section className="promo-section container" id="promotions-section">
          <h2 className="section-title">Latest Offers & Promotions</h2>
          <div className="promo-grid">
            {ads.map((ad) => (
              <div key={ad.id} className="promo-card glass-card" style={{ padding: ad.imageUrl ? '0' : 'var(--space-6)', overflow: 'hidden' }}>
                {ad.imageUrl && (
                  <div style={{ width: '100%', height: '180px', position: 'relative' }}>
                    <img src={ad.imageUrl} alt={ad.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {ad.badge && (
                      <div className={`promo-badge ${ad.badge.toLowerCase() === 'hot' ? 'hot' : ''}`} style={{ position: 'absolute', top: '12px', left: '12px' }}>
                        {ad.badge}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ padding: ad.imageUrl ? 'var(--space-4)' : '0' }}>
                  {!ad.imageUrl && ad.badge && (
                    <div className={`promo-badge ${ad.badge.toLowerCase() === 'hot' ? 'hot' : ''}`} style={{ marginBottom: '12px' }}>
                      {ad.badge}
                    </div>
                  )}
                  <h3>{ad.title}</h3>
                  <p>{ad.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="promo-section container" id="promotions-section">
          <h2 className="section-title">{t('home.promotions')}</h2>
          <div className="promo-grid">
            <div className="promo-card glass-card">
              <div className="promo-badge">NEW</div>
              <h3>🎉 Welcome to SmartPOS!</h3>
              <p>Explore our fast & efficient point of sale system today.</p>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="home-footer">
        <div className="container">
          <p className="footer-text">© 2026 SmartPOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
