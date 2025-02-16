import { useState, useEffect } from 'react';
import { Layout, Menu, theme } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  HistoryOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { NavItem } from '../../types/layout';
import styles from './styles.module.css';
import classNames from 'classnames';

const { Header, Sider, Content } = Layout;

const navItems: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/page',
    icon: <DashboardOutlined />
  },
  {
    key: 'speakers',
    label: 'Speakers',
    path: '/page/speakers',
    icon: <UserOutlined />
  },
  {
    key: 'records',
    label: 'Records',
    path: '/page/records',
    icon: <HistoryOutlined />
  }
];

export const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { theme: appTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = theme.useToken();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMenuClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      setCollapsed(true);
    }
  };

  const handleOverlayClick = () => {
    if (isMobile) {
      setCollapsed(true);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', width: '98vw' }} className={classNames({[styles.siderCollapsed]: collapsed})}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme={appTheme.mode}
        className={styles.sider}
        style={{ background: appTheme.token.bgColorSecondary }}
      >
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
      <div
        className={classNames(styles.overlay, {
          [styles.overlayHidden]: collapsed || !isMobile
        })}
        onClick={handleOverlayClick}
      />
      <Layout style={{ width: '100%', background: token.colorBgContainer }} >
        <Header className={styles.header} style={{ background: appTheme.token.bgColorSecondary }}>
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
        <Content className={styles.content} style={{ }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}; 