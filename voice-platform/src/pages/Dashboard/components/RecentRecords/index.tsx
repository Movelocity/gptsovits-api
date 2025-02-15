import { List, Typography, Space } from 'antd';
import { SoundOutlined } from '@ant-design/icons';
import { TTSRecord } from '../../../../services/api';
import styles from './styles.module.css';

const { Text } = Typography;

interface RecentRecordsProps {
  records: TTSRecord[];
}

export const RecentRecords: React.FC<RecentRecordsProps> = ({ records }) => {
  return (
    <List
      className={styles.recentRecords}
      dataSource={records}
      renderItem={(record) => (
        <List.Item>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <SoundOutlined />
              <Text strong>{record.speaker_name}</Text>
            </Space>
            <Text type="secondary" className={styles.text}>
              {record.text}
            </Text>
            <Text type="secondary" className={styles.date}>
              {new Date(record.created_at).toLocaleString()}
            </Text>
          </Space>
        </List.Item>
      )}
    />
  );
}; 