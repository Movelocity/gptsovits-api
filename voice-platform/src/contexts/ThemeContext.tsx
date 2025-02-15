import { createContext, useContext, useState, ReactNode } from 'react';
import { ThemeConfig, ThemeContextType, ThemeMode } from '../types/theme';

const defaultTheme: ThemeConfig = {
  mode: 'light',
  primaryColor: '#1890ff',
  secondaryColor: '#722ed1'
};

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  toggleTheme: () => { }
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);

  const toggleTheme = () => {
    setTheme(prev => ({
      ...prev,
      mode: prev.mode === 'light' ? 'dark' : 'light'
    }));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}; 