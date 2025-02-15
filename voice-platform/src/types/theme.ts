export type ThemeMode = 'light' | 'dark';

export interface ThemeConfig {
  mode: ThemeMode;
  token: {
    // 主色系
    colorPrimary: string;
    colorInfo: string;
    colorSuccess: string;
    colorWarning: string;
    colorError: string;
    
    // 背景色系
    colorBgContainer: string;
    colorBgElevated: string;
    colorBgLayout: string;
    
    // 文字色系
    colorText: string;
    colorTextSecondary: string;
    colorTextDisabled: string;
    
    // 边框和分割线
    colorBorder: string;
    colorSplit: string;
    
    // 其他配置
    borderRadius: number;
  };
}

export interface ThemeContextType {
  theme: ThemeConfig;
  toggleTheme: () => void;
} 