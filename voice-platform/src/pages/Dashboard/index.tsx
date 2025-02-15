import { useEffect } from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { UserOutlined, HistoryOutlined } from '@ant-design/icons';
import { useAppStore } from '../../store';
import { RecentRecords } from './components/RecentRecords';
import { UsageChart } from './components/UsageChart';
import styles from './styles.module.css';

export const Dashboard = () => {
  const { stats, isLoadingStats, fetchDashboardStats } = useAppStore();

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  return (
    <div className={styles.dashboard}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoadingStats}>
            <Statistic
              title="Total Speakers"
              value={stats.totalSpeakers}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoadingStats}>
            <Statistic
              title="Total Records"
              value={stats.totalRecords}
              prefix={<HistoryOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className={styles.chartsRow}>
        <Col xs={24} lg={16}>
          <Card title="Usage Over Time" loading={isLoadingStats}>
            <UsageChart />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Recent Records" loading={isLoadingStats}>
            <RecentRecords records={stats.recentRecords} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}; 