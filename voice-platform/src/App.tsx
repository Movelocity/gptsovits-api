import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, theme as antTheme } from 'antd';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { router } from './routes';

const AppContent = () => {
  const { theme } = useTheme();

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.mode === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: theme.primaryColor,
          colorInfo: theme.primaryColor,
          borderRadius: 6,
        }
      }}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  );
};

export const App = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};
