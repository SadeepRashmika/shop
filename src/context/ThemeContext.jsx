import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first, then system preference
    const saved = localStorage.getItem('smartpos-theme');
    if (saved) return saved;
    // Default to dark (current theme)
    return 'dark';
  });

  useEffect(() => {
    // Apply theme class to <html> element
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('smartpos-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
