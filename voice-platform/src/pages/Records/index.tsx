import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, message, Typography, Tag } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, DeleteOutlined, DownloadOutlined, LoadingOutlined } from '@ant-design/icons';
import { useAppStore } from '../../store';
import { ttsService } from '../../services/api';
import type { TTSRecord } from '../../services/api';
import styles from './styles.module.css';
import { useTheme } from '../../contexts/ThemeContext';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
const { Text } = Typography;

export const Records = () => {
  const { records, isLoadingRecords, currentPage, totalPages, fetchRecords } = useAppStore();
  const { playAudio, stopCurrentAudio, isPlaying, isLoading } = useAudioPlayer();
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, [stopCurrentAudio]);

  const handlePlay = (record: TTSRecord) => {
    if (currentPlayingId === record.id) {
      stopCurrentAudio();
      setCurrentPlayingId(null);
    } else {
      const audioUrl = ttsService.getAudioFileUrl(record.id);
      playAudio(audioUrl);
      setCurrentPlayingId(record.id);
    }
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
        <div>
          <Button
            type="text"
            icon={
              isLoading && currentPlayingId === record.id ? (
                <LoadingOutlined />
              ) : currentPlayingId === record.id && isPlaying ? (
                <PauseCircleOutlined />
              ) : (
                <PlayCircleOutlined />
              )
            }
            onClick={() => handlePlay(record)}
          />
          {text}
        </div>
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
          <Button
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
          />
          <Button
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