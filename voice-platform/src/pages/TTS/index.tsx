import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Input, Button, Space, Form, InputNumber, Select, App } from 'antd';
import { ttsService } from '../../services/api/ttsService';
import { speakerService } from '../../services/api/speakerService';
import type { Speaker } from '../../services/api/types';
import styles from './styles.module.css';
import { LANG_MODES } from '../../services/api/config';
const { TextArea } = Input;

interface TTSFormValues {
  text: string;
  top_k?: number;
  top_p?: number;
  temperature?: number;
  version?: string;
}

export const TTS: React.FC = () => {
  const [searchParams] = useSearchParams();
  const speakerId = searchParams.get('speakerId');
  const [form] = Form.useForm<TTSFormValues>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [modelVersions, setModelVersions] = useState<string[]>([]);
  const { message } = App.useApp();

  useEffect(() => {
    const fetchSpeaker = async () => {
      if (!speakerId) return;
      const speakerIdNum = parseInt(speakerId, 10);
      if (isNaN(speakerIdNum)) {
        message.error('Invalid speaker ID');
        return;
      }
      const result = await speakerService.getSpeaker(speakerIdNum);
      if (result.data) {
        setSpeaker(result.data);
      } else {
        message.error('Failed to fetch speaker information');
      }
    };

    const fetchModelVersions = async () => {
      const result = await ttsService.getMovelVersions();
      if (result.data) {
        setModelVersions(result.data);
        form.setFieldsValue({
          version: result.data[0],
        });
      }
    };

    fetchModelVersions();
    fetchSpeaker();
  }, [speakerId]);

  const handleGenerate = async (values: TTSFormValues) => {
    if (!speakerId) {
      message.error('Speaker ID is required');
      return;
    }
    if (!values.text.trim()) {
      message.error('Please enter some text');
      return;
    }

    const speakerIdNum = parseInt(speakerId, 10);
    if (isNaN(speakerIdNum)) {
      message.error('Invalid speaker ID');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await ttsService.generateSpeech({
        text: values.text,
        speaker_id: speakerIdNum,
        lang: speaker?.lang || 'en',
        top_k: values.top_k,
        top_p: values.top_p,
        temperature: values.temperature,
        version: values.version,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data) {
        const audioFileUrl = ttsService.getAudioFileUrl(result.data.id);
        setAudioUrl(audioFileUrl);
        message.success('Speech generated successfully');
      }
    } catch (error) {
      message.error('Failed to generate speech');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!speakerId) {
    return (
      <Card className={styles.container}>
        <h1>Text to Speech</h1>
        <p>No speaker selected. Please select a speaker from the speakers page.</p>
      </Card>
    );
  }

  return (
    <Card className={styles.container}>
      <Form
        form={form}
        onFinish={handleGenerate}
        initialValues={{
          text: '',
          top_k: 10,
          top_p: 0.95,
          temperature: 0.8,
          lang_mode: LANG_MODES[0],
        }}
        layout="vertical"
      >
        <div className={styles.formContainer}>
          <div className={styles.textInputSection}>
            {speaker && (
              <div className={styles.speakerInfo}>
                <strong>{speaker.name}</strong>
                {speaker.lang && <span>{speaker.lang}</span>}
              </div>
            )}
            <Form.Item
              name="text"
              rules={[{ required: true, message: 'Please enter text to convert' }]}
            >
              <TextArea
                rows={8}
                placeholder="Enter text to convert to speech..."
                style={{ resize: 'vertical', minHeight: '200px' }}
              />
            </Form.Item>
            {audioUrl && (
              <div>
                <audio controls src={audioUrl} style={{ width: '100%', height: '2.5rem', marginBottom: '1rem' }}>
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
            <Button
              type="primary"
              htmlType="submit"
              loading={isGenerating}
              block
              size="large"
            >
              Generate Speech
            </Button>
          </div>

          <div className={styles.advancedSection}>
            <Space direction="vertical" style={{ width: '100%', rowGap: 4 }} size="middle">
              <Form.Item
                label="Top K"
                name="top_k"
                tooltip="Controls diversity by limiting the cumulative probability of tokens considered"
              >
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                label="Top P"
                name="top_p"
                tooltip="Controls diversity using nucleus sampling"
              >
                <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                label="Temperature"
                name="temperature"
                tooltip="Controls randomness in the generation process"
              >
                <InputNumber min={0.1} max={2} step={0.1} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                label="Model Version"
                name="version"
                tooltip="Specific model version to use (optional)"
              >
                <Select 
                  options={modelVersions.map(version => ({ label: version, value: version }))}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item
                label="Language Mode"
                name="lang_mode"
                tooltip="Language mode to use (optional)"
              >
                <Select 
                  options={LANG_MODES.map(mode => ({ label: mode, value: mode }))}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Space>
          </div>
        </div>
      </Form>
    </Card>
  );
}; 