import { createContext, useContext, useState, ReactNode } from 'react';
import { ThemeConfig, ThemeContextType } from '../types/theme';

const defaultTheme: ThemeConfig = {
  mode: 'light',
  token: {
    // 主色系
    colorPrimary: '#4F46E5',
    colorInfo: '#4F46E5',
    colorSuccess: '#22c55e',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    
    // 背景色系
    colorBgContainer: '#ffffff',
    colorBgElevated: '#f8fafc',
    colorBgLayout: '#f1f5f9',
    
    // 文字色系
    colorText: 'rgba(0, 0, 0, 0.87)',
    colorTextSecondary: 'rgba(0, 0, 0, 0.6)',
    colorTextDisabled: 'rgba(0, 0, 0, 0.38)',
    
    // 边框和分割线
    colorBorder: 'rgba(0, 0, 0, 0.12)',
    colorSplit: 'rgba(0, 0, 0, 0.08)',
    
    // 其他配置
    borderRadius: 6,
  }
};

const darkTheme: ThemeConfig = {
  mode: 'dark',
  token: {
    // 主色系
    colorPrimary: '#646cff',
    colorInfo: '#646cff',
    colorSuccess: '#22c55e',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    
    // 背景色系
    colorBgContainer: '#1a1a1a',
    colorBgElevated: '#242424',
    colorBgLayout: '#2d2d2d',
    
    // 文字色系
    colorText: 'rgba(255, 255, 255, 0.87)',
    colorTextSecondary: 'rgba(255, 255, 255, 0.6)',
    colorTextDisabled: 'rgba(255, 255, 255, 0.38)',
    
    // 边框和分割线
    colorBorder: 'rgba(255, 255, 255, 0.12)',
    colorSplit: 'rgba(255, 255, 255, 0.08)',
    
    // 其他配置
    borderRadius: 6,
  }
};

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  toggleTheme: () => { }
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);

  const toggleTheme = () => {
    setTheme(prev => prev.mode === 'light' ? darkTheme : defaultTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}; 