import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, theme as antTheme, App as AntdApp } from 'antd';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { router } from './routes';

const AppContent = () => {
  const { theme } = useTheme();

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.mode === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: theme.token
      }}
    >
      <AntdApp>
        <RouterProvider router={router} />
      </AntdApp>
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
