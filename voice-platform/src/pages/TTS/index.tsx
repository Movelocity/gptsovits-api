import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Input, Button, message, Space } from 'antd';
import { ttsService } from '../../services/api/ttsService';
import { speakerService } from '../../services/api/speakerService';
import type { Speaker } from '../../services/api/types';
import styles from './styles.module.css';

const { TextArea } = Input;

export const TTS: React.FC = () => {
  const [searchParams] = useSearchParams();
  const speakerId = searchParams.get('speakerId');
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [speaker, setSpeaker] = useState<Speaker | null>(null);

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
    fetchSpeaker();
  }, [speakerId]);

  const handleGenerate = async () => {
    if (!speakerId) {
      message.error('Speaker ID is required');
      return;
    }
    if (!text.trim()) {
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
        text,
        speaker_id: speakerIdNum,
        lang: speaker?.lang || 'en',
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
      <h1>Text to Speech</h1>
      {speaker && (
        <p>Selected speaker: {speaker.name}</p>
      )}
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <TextArea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to convert to speech..."
        />
        <Button
          type="primary"
          onClick={handleGenerate}
          loading={isGenerating}
          block
        >
          Generate Speech
        </Button>
        {audioUrl && (
          <audio controls src={audioUrl} className={styles.audioPlayer}>
            Your browser does not support the audio element.
          </audio>
        )}
      </Space>
    </Card>
  );
}; 