import { API_CONFIG, DEFAULT_HEADERS } from './config';
import type { TTSRequest, TTSResponse, TTSRecord, PaginatedResponse, ApiResponse } from './types';

/**
 * Service for handling Text-to-Speech (TTS) operations
 */
export const ttsService = {
  /**
   * Generate speech from text using a specified speaker's voice
   * @param params - TTS generation parameters
   * @returns Promise with the generated audio file ID
   */
  async generateSpeech(params: TTSRequest): Promise<ApiResponse<TTSResponse>> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TTS}`, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Retrieve TTS generation records with pagination
   * @param page - Page number
   * @param pageSize - Number of items per page
   * @returns Promise with paginated TTS records
   */
  async getRecords(page: number = 1, pageSize: number = 10): Promise<ApiResponse<PaginatedResponse<TTSRecord>>> {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.RECORDS}?page=${page}&page_size=${pageSize}`,
        {
          headers: DEFAULT_HEADERS,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch TTS records');
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Delete a specific TTS record and its associated audio file
   * @param recordId - ID of the record to delete
   * @returns Promise indicating success or failure
   */
  async deleteRecord(recordId: string): Promise<ApiResponse<{ msg: string }>> {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.RECORD}?id=${recordId}`,
        {
          method: 'DELETE',
          headers: DEFAULT_HEADERS,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete TTS record');
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get the audio file URL for a generated TTS file
   * @param fileId - ID of the generated audio file
   * @returns URL to the audio file
   */
  getAudioFileUrl(fileId: string): string {
    return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VOICEFILE}?type=gen&id=${fileId}`;
  },

  async getMovelVersions(): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/versions`,
        {
          method: 'GET',
          headers: DEFAULT_HEADERS,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete TTS record');
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }
}; 