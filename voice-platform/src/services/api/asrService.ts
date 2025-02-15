import { API_CONFIG, DEFAULT_FORM_HEADERS } from './config';
import type { ASRResponse, ApiResponse } from './types';

/**
 * Service for Automatic Speech Recognition (ASR) operations
 */
export const asrService = {
    /**
     * Perform speech recognition on an audio file
     * @param audioFile - The audio file to transcribe
     * @param lang - Language code (default: "zh")
     * @returns Promise with the transcribed text
     */
    async transcribeAudio(audioFile: File, lang: string = 'zh'): Promise<ApiResponse<ASRResponse>> {
        try {
            const formData = new FormData();
            formData.append('voicefile', audioFile);
            formData.append('lang', lang);

            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ASR}`, {
                method: 'POST',
                headers: DEFAULT_FORM_HEADERS,
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to transcribe audio');
            }

            const data = await response.json();
            return { data };
        } catch (error) {
            return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
        }
    }
}; 