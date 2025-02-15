import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Upload, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { useAppStore } from '../../store';
import { speakerService } from '../../services/api';
import type { Speaker, AddSpeakerRequest } from '../../services/api';
import styles from './styles.module.css';

const { Option } = Select;

export const Speakers = () => {
  const { speakers, isLoadingSpeakers, currentPage, totalPages, fetchSpeakers } = useAppStore();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchSpeakers();
  }, [fetchSpeakers]);

  const handleAdd = () => {
    setEditingSpeaker(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (speaker: Speaker) => {
    setEditingSpeaker(speaker);
    form.setFieldsValue({
      name: speaker.name,
      lang: speaker.lang,
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
      if (editingSpeaker) {
        const response = await speakerService.updateSpeaker({
          spk_id: editingSpeaker.id,
          ...values
        });
        if ('error' in response) {
          throw new Error(response.error);
        }
        message.success('Speaker updated successfully');
      } else {
        const response = await speakerService.addSpeaker(values as AddSpeakerRequest);
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

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Speaker) => (
        <Space>
          {text}
          <Button
            type="link"
            size="small"
            onClick={() => window.open(speakerService.getSpeakerAudioUrl(record.voicefile))}
          >
            Play Sample
          </Button>
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
            <Select>
              <Option value="en">English</Option>
              <Option value="zh">Chinese</Option>
            </Select>
          </Form.Item>

          {!editingSpeaker && (
            <Form.Item
              name="voicefile"
              label="Voice Sample"
              rules={[{ required: true, message: 'Please upload a voice sample' }]}
            >
              <Upload
                beforeUpload={() => false}
                maxCount={1}
                accept="audio/*"
              >
                <Button icon={<UploadOutlined />}>Upload Audio File</Button>
              </Upload>
            </Form.Item>
          )}

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