import { useState, useCallback, useEffect } from 'react';

// Global audio manager to ensure only one audio plays at a time
class AudioManager {
  private static instance: AudioManager;
  private currentAudio: HTMLAudioElement | null = null;
  private listeners: Set<(isPlaying: boolean, isLoading: boolean) => void> = new Set();

  private constructor() {}

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  subscribe(listener: (isPlaying: boolean, isLoading: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(isPlaying: boolean, isLoading: boolean) {
    this.listeners.forEach(listener => listener(isPlaying, isLoading));
  }

  stopCurrentAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      this.notifyListeners(false, false);
    }
  }

  playAudio(url: string) {
    this.stopCurrentAudio();
    this.notifyListeners(false, true);

    const audio = new Audio(url);
    this.currentAudio = audio;
    
    audio.addEventListener('canplaythrough', () => {
      if (this.currentAudio === audio) {
        this.notifyListeners(true, false);
        audio.play().catch(error => {
          console.error('Audio playback failed:', error);
          if (this.currentAudio === audio) {
            this.currentAudio = null;
            this.notifyListeners(false, false);
          }
        });
      }
    });

    audio.addEventListener('error', () => {
      console.error('Audio loading failed');
      if (this.currentAudio === audio) {
        this.currentAudio = null;
        this.notifyListeners(false, false);
      }
    });

    audio.addEventListener('ended', () => {
      if (this.currentAudio === audio) {
        this.currentAudio = null;
        this.notifyListeners(false, false);
      }
    });
  }

  isCurrentAudioPlaying() {
    return !!this.currentAudio && !this.currentAudio.paused;
  }
}

export const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioManager = AudioManager.getInstance();

  useEffect(() => {
    const unsubscribe = audioManager.subscribe((playing, loading) => {
      setIsPlaying(playing);
      setIsLoading(loading);
    });
    return unsubscribe;
  }, []);

  const playAudio = useCallback((url: string) => {
    audioManager.playAudio(url);
  }, []);

  const stopCurrentAudio = useCallback(() => {
    audioManager.stopCurrentAudio();
  }, []);

  return {
    playAudio,
    stopCurrentAudio,
    isPlaying,
    isLoading
  };
}; 