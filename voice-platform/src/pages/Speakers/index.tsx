import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Upload, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, PlayCircleOutlined, LoadingOutlined, PauseCircleOutlined, AudioOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { speakerService } from '../../services/api';
import type { Speaker } from '../../services/api';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { LANG_MODES } from '../../services/api/config';
import styles from './styles.module.css';


export const Speakers = () => {
  const navigate = useNavigate();
  const { speakers, isLoadingSpeakers, currentPage, totalPages, fetchSpeakers } = useAppStore();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [form] = Form.useForm();
  const { playAudio, stopCurrentAudio, isPlaying, isLoading } = useAudioPlayer();
  const [currentPlayingId, setCurrentPlayingId] = useState<number | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchSpeakers();
  }, [fetchSpeakers]);

  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, [stopCurrentAudio]);

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);

  const handleAdd = () => {
    setEditingSpeaker(null);
    form.resetFields();
    setIsModalVisible(true);
    setAudioFile(null);
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
    }
  };

  const handleEdit = (speaker: Speaker) => {
    setEditingSpeaker(speaker);
    form.setFieldsValue({
      name: speaker.name,
      lang: speaker.lang,
      text: speaker.text,
      description: speaker.description
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (_speakerId: number) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this speaker?',
      content: 'This action cannot be undone.',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          // TODO: Implement delete speaker API call
          message.success('Speaker deleted successfully');
          fetchSpeakers();
        } catch (error) {
          message.error('Failed to delete speaker');
        }
      }
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      if (!audioFile && !editingSpeaker) {
        throw new Error('Please upload a voice file');
      }

      if (editingSpeaker) {
        const response = await speakerService.updateSpeaker({
          spk_id: editingSpeaker.id,
          name: values.name,
          text: values.text,
          lang: values.lang,
          description: values.description,
          ...(audioFile && { voicefile: audioFile })
        });
        if ('error' in response) {
          throw new Error(response.error);
        }
        message.success('Speaker updated successfully');
      } else {
        const response = await speakerService.addSpeaker({
          name: values.name,
          voicefile: audioFile!,
          text: values.text,
          lang: values.lang,
          description: values.description
        });
        if ('error' in response) {
          throw new Error(response.error);
        }
        message.success('Speaker added successfully');
      }
      setIsModalVisible(false);
      fetchSpeakers();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Operation failed');
    }
  };

  const handlePlaySample = (speakerId: number) => {
    if (currentPlayingId === speakerId) {
      stopCurrentAudio();
      setCurrentPlayingId(null);
    } else {
      const audioUrl = speakerService.getSpeakerAudioUrl(speakerId.toString());
      playAudio(audioUrl);
      setCurrentPlayingId(speakerId);
    }
  };

  const handleTTS = (speakerId: number) => {
    navigate(`/page/tts?speakerId=${speakerId}`);
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Speaker) => (
        <Space>
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
            onClick={() => handlePlaySample(record.id)}
          />
          {text}
        </Space>
      )
    },
    {
      title: 'Language',
      dataIndex: 'lang',
      key: 'lang'
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Speaker) => (
        <Space>
          <Button
            type="primary"
            title="Try TTS"
            icon={<AudioOutlined />}
            onClick={() => handleTTS(record.id)}
          />
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
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
    <div className={styles.speakers}>
      <div className={styles.header}>
        <h1>Speakers Management</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          Add Speaker
        </Button>
      </div>

      <Table
        dataSource={speakers}
        columns={columns}
        loading={isLoadingSpeakers}
        rowKey="id"
        pagination={{
          current: currentPage,
          total: totalPages * 10,
          onChange: (page) => fetchSpeakers(page)
        }}
      />

      <Modal
        title={editingSpeaker ? 'Edit Speaker' : 'Add New Speaker'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter speaker name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="lang"
            label="Language"
            rules={[{ required: true, message: 'Please select language' }]}
          >
            <Select options={LANG_MODES.map(lang => ({ label: lang, value: lang }))} />
          </Form.Item>

          <Form.Item
            name="voicefile"
            label="Voice Sample"
            rules={[{ required: true, message: 'Please upload a voice sample' }]}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Upload
                beforeUpload={(file) => {
                  if (audioPreviewUrl) {
                    URL.revokeObjectURL(audioPreviewUrl);
                  }
                  setAudioFile(file);
                  setAudioPreviewUrl(URL.createObjectURL(file));
                  return false;
                }}
                maxCount={1}
                accept="audio/*"
                onRemove={() => {
                  setAudioFile(null);
                  if (audioPreviewUrl) {
                    URL.revokeObjectURL(audioPreviewUrl);
                    setAudioPreviewUrl(null);
                  }
                }}
              >
                <Button icon={<UploadOutlined />}>Upload Audio File</Button>
              </Upload>
              {audioPreviewUrl && (
                <audio controls src={audioPreviewUrl} style={{ width: '100%' }} />
              )}
            </Space>
          </Form.Item>

          <Form.Item
            name="text"
            label="Sample Text"
            rules={[{ required: !editingSpeaker, message: 'Please enter sample text' }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item className={styles.modalFooter}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingSpeaker ? 'Update' : 'Add'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}; 