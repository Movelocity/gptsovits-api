import { create } from 'zustand';
import { ttsService, speakerService, TTSRecord, Speaker } from '../services/api';

interface DashboardStats {
  totalSpeakers: number;
  totalRecords: number;
  recentRecords: TTSRecord[];
  usageData: {
    date: string;
    count: number;
  }[];
}

interface AppState {
  // Dashboard
  stats: DashboardStats;
  isLoadingStats: boolean;
  // Speakers
  speakers: Speaker[];
  isLoadingSpeakers: boolean;
  // Records
  records: TTSRecord[];
  isLoadingRecords: boolean;
  currentPage: number;
  totalPages: number;
  // Actions
  fetchDashboardStats: () => Promise<void>;
  fetchSpeakers: (page?: number) => Promise<void>;
  fetchRecords: (page?: number) => Promise<void>;
}

const initialStats: DashboardStats = {
  totalSpeakers: 0,
  totalRecords: 0,
  recentRecords: [],
  usageData: []
};

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  stats: initialStats,
  isLoadingStats: false,
  speakers: [],
  isLoadingSpeakers: false,
  records: [],
  isLoadingRecords: false,
  currentPage: 1,
  totalPages: 1,

  // Actions
  fetchDashboardStats: async () => {
    set({ isLoadingStats: true });
    try {
      const [speakersRes, recordsRes] = await Promise.all([
        speakerService.getSpeakers(1, 1),
        ttsService.getRecords(1, 5)
      ]);

      if ('data' in speakersRes && 'data' in recordsRes) {
        // Calculate usage data for the last 7 days
        const today = new Date();
        const usageData = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          return {
            date: date.toISOString().split('T')[0],
            count: Math.floor(Math.random() * 50) // TODO: Replace with actual data
          };
        }).reverse();

        set({
          stats: {
            totalSpeakers: speakersRes.data?.total || 0,
            totalRecords: recordsRes.data?.total || 0,
            recentRecords: recordsRes.data?.items || [],
            usageData
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      set({ isLoadingStats: false });
    }
  },

  fetchSpeakers: async (page = 1) => {
    set({ isLoadingSpeakers: true });
    try {
      const response = await speakerService.getSpeakers(page);
      if ('data' in response) {
        set({
          speakers: response.data?.items || [],
          currentPage: response.data?.page || 1,
          totalPages: response.data?.pages || 1
        });
      }
    } catch (error) {
      console.error('Failed to fetch speakers:', error);
    } finally {
      set({ isLoadingSpeakers: false });
    }
  },

  fetchRecords: async (page = 1) => {
    set({ isLoadingRecords: true });
    try {
      const response = await ttsService.getRecords(page);
      if ('data' in response) {
        set({
          records: response.data?.items || [],
          currentPage: response.data?.page || 1,
          totalPages: response.data?.pages || 1
        });
      }
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      set({ isLoadingRecords: false });
    }
  }
})); 