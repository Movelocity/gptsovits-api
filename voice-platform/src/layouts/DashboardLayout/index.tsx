import { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  HistoryOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { NavItem } from '../../types/layout';
import styles from './styles.module.css';

const { Header, Sider, Content } = Layout;

const navItems: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: <DashboardOutlined />
  },
  {
    key: 'speakers',
    label: 'Speakers',
    path: '/speakers',
    icon: <UserOutlined />
  },
  {
    key: 'records',
    label: 'Records',
    path: '/records',
    icon: <HistoryOutlined />
  }
];

export const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { theme: appTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = theme.useToken();

  const handleMenuClick = (path: string) => {
    navigate(path);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme={appTheme.mode}
        className={styles.sider}
      >
        <div className={styles.logo} />
        <Menu
          theme={appTheme.mode}
          mode="inline"
          selectedKeys={[location.pathname]}
          items={navItems.map(item => ({
            key: item.path,
            icon: item.icon,
            label: item.label,
            onClick: () => handleMenuClick(item.path)
          }))}
        />
      </Sider>
      <Layout>
        <Header className={styles.header} style={{ background: token.colorBgContainer }}>
          {collapsed ? (
            <MenuUnfoldOutlined
              className={styles.trigger}
              onClick={() => setCollapsed(false)}
            />
          ) : (
            <MenuFoldOutlined
              className={styles.trigger}
              onClick={() => setCollapsed(true)}
            />
          )}
        </Header>
        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}; 