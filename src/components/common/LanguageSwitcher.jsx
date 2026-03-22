import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

export default function LanguageSwitcher({ variant = 'default' }) {
  const { i18n } = useTranslation();

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('pos-language', lang);
  };

  return (
    <div className={`language-switcher ${variant}`}>
      <button
        className={`lang-btn ${i18n.language === 'en' ? 'active' : ''}`}
        onClick={() => changeLanguage('en')}
        id="lang-en"
      >
        EN
      </button>
      <button
        className={`lang-btn ${i18n.language === 'si' ? 'active' : ''}`}
        onClick={() => changeLanguage('si')}
        id="lang-si"
      >
        සිං
      </button>
    </div>
  );
}
