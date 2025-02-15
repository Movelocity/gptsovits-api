import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, message, Typography, Tag } from 'antd';
import { PlayCircleOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { useAppStore } from '../../store';
import { ttsService } from '../../services/api';
import type { TTSRecord } from '../../services/api';
import styles from './styles.module.css';

const { Text } = Typography;

export const Records = () => {
  const { records, isLoadingRecords, currentPage, totalPages, fetchRecords } = useAppStore();
  const [playingAudio, setPlayingAudio] = useState<HTMLAudioElement | null>(null);

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
      title: 'Delete Record',
      content: 'Are you sure you want to delete this record?',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          const response = await ttsService.deleteRecord(recordId);
          if ('error' in response) {
            throw new Error(response.error);
          }
          message.success('Record deleted successfully');
          fetchRecords(currentPage);
        } catch (error) {
          message.error('Failed to delete record');
        }
      }
    });
  };

  const columns = [
    {
      title: 'Speaker',
      dataIndex: 'speaker_name',
      key: 'speaker_name',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Text',
      dataIndex: 'text',
      key: 'text',
      width: '30%',
      ellipsis: true
    },
    {
      title: 'Language',
      dataIndex: 'lang',
      key: 'lang',
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
        <Space>
          <Button
            type="text"
            icon={<PlayCircleOutlined />}
            onClick={() => handlePlay(record)}
          />
          <Button
            type="text"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
          />
          <Button
            type="text"
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