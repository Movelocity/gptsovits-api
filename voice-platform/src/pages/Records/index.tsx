import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, message, Typography, Tag } from 'antd';
import { PlayCircleOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { useAppStore } from '../../store';
import { ttsService } from '../../services/api';
import type { TTSRecord } from '../../services/api';
import styles from './styles.module.css';
import { useTheme } from '../../contexts/ThemeContext';
const { Text } = Typography;

export const Records = () => {
  const { records, isLoadingRecords, currentPage, totalPages, fetchRecords } = useAppStore();
  const [playingAudio, setPlayingAudio] = useState<HTMLAudioElement | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handlePlay = (record: TTSRecord) => {
    if (playingAudio) {
      playingAudio.pause();
      playingAudio.currentTime = 0;
    }

    const audio = new Audio(ttsService.getAudioFileUrl(record.id));
    audio.play().catch(error => {
      message.error('Failed to play audio');
      console.error('Audio playback failed:', error);
    });

    setPlayingAudio(audio);

    audio.addEventListener('ended', () => {
      setPlayingAudio(null);
    });
  };

  const handleDownload = (record: TTSRecord) => {
    const link = document.createElement('a');
    link.href = ttsService.getAudioFileUrl(record.id);
    link.download = `${record.speaker_name}-${record.id}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (recordId: string) => {
    Modal.confirm({
      title: '删除记录',
      content: '确认删除？',
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await ttsService.deleteRecord(recordId);
          if ('error' in response) {
            throw new Error(response.error);
          }
          message.success('删除成功');
          fetchRecords(currentPage);
        } catch (error) {
          message.error('删除失败');
        }
      },
      style: {
        color: theme.token.colorText,
        backgroundColor: theme.token.bgColorSecondary,
      }
    });
  };

  const columns = [
    {
      title: 'Text',
      dataIndex: 'text',
      key: 'text',
      width: '40%',
      ellipsis: true,
      render: (text: string, record: TTSRecord) => (
        <span onClick={() => handlePlay(record)}>
          <PlayCircleOutlined /> {text}
        </span>
      )
    },
    {
      title: 'Speaker',
      dataIndex: 'speaker_name',
      key: 'speaker_name',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Language',
      dataIndex: 'lang',
      key: 'lang',
      // width: '10%',
      render: (lang: string) => (
        <Tag color={lang === 'en' ? 'blue' : 'green'}>
          {lang.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: TTSRecord) => (
        <Space size="small">
          {/* <Button
            // type="text"
            icon={<PlayCircleOutlined />}
            onClick={() => handlePlay(record)}
          /> */}
          <Button
            // type="text"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
          />
          <Button
            // type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      )
    }
  ];

  return (
    <div className={styles.records}>
      <div className={styles.header}>
        <h1>TTS Records</h1>
      </div>

      <Table
        dataSource={records}
        columns={columns}
        loading={isLoadingRecords}
        rowKey="id"
        pagination={{
          current: currentPage,
          total: totalPages * 10,
          onChange: (page) => fetchRecords(page)
        }}
      />
    </div>
  );
}; 