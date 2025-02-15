import { API_CONFIG, DEFAULT_HEADERS, DEFAULT_FORM_HEADERS } from './config';
import type { Speaker, AddSpeakerRequest, UpdateSpeakerRequest, PaginatedResponse, ApiResponse } from './types';

/**
 * Service for managing speakers in the system
 */
export const speakerService = {
  /**
   * Add a new speaker to the system
   * @param params - Speaker creation parameters including audio file
   * @returns Promise with the created speaker ID and name
   */
  async addSpeaker(params: AddSpeakerRequest): Promise<ApiResponse<{ id: number; name: string }>> {
    try {
      const formData = new FormData();
      formData.append('name', params.name);
      formData.append('voicefile', params.voicefile);
      formData.append('text', params.text);
      formData.append('lang', params.lang);
      if (params.description) formData.append('description', params.description);
      if (params.version) formData.append('version', params.version);

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SPEAKER}`, {
        method: 'POST',
        headers: DEFAULT_FORM_HEADERS,
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to add speaker');
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Update an existing speaker's information
   * @param params - Speaker update parameters
   * @returns Promise indicating success or failure
   */
  async updateSpeaker(params: UpdateSpeakerRequest): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const formData = new FormData();
      formData.append('spk_id', params.spk_id.toString());
      if (params.name) formData.append('name', params.name);
      if (params.voicefile) formData.append('voicefile', params.voicefile);
      if (params.text) formData.append('text', params.text);
      if (params.lang) formData.append('lang', params.lang);
      if (params.description) formData.append('description', params.description);
      if (params.version) formData.append('version', params.version);

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SPEAKER_UPDATE}`, {
        method: 'POST',
        headers: DEFAULT_FORM_HEADERS,
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to update speaker');
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get information about a specific speaker
   * @param speakerId - ID of the speaker to retrieve
   * @returns Promise with the speaker information
   */
  async getSpeaker(speakerId: number): Promise<ApiResponse<Speaker>> {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SPEAKER}?id=${speakerId}`,
        {
          headers: DEFAULT_HEADERS,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch speaker');
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get a paginated list of all speakers
   * @param page - Page number
   * @param pageSize - Number of items per page
   * @returns Promise with paginated speaker list
   */
  async getSpeakers(page: number = 1, pageSize: number = 10): Promise<ApiResponse<PaginatedResponse<Speaker>>> {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SPEAKERS}?page=${page}&page_size=${pageSize}`,
        {
          headers: DEFAULT_HEADERS,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch speakers');
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get the URL for a speaker's reference audio file
   * @param fileId - ID of the reference audio file
   * @returns URL to the audio file
   */
  getSpeakerAudioUrl(fileId: string): string {
    return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VOICEFILE}?type=ref&id=${fileId}`;
  }
}; 