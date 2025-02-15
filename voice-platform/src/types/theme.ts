export type ThemeMode = 'light' | 'dark';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  secondaryColor: string;
}

export interface ThemeContextType {
  theme: ThemeConfig;
  toggleTheme: () => void;
} 