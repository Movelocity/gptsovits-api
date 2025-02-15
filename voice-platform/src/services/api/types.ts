export interface TTSRequest {
    text: string;
    lang: string;
    speaker_id: number;
    top_k?: number;
    top_p?: number;
    temperature?: number;
    version?: string;
}

export interface TTSResponse {
    id: string;
}

export interface TTSRecord {
    id: string;
    text: string;
    lang: string;
    speaker_id: number;
    top_k: number;
    top_p: number;
    temperature: number;
    created_at: string;
    model_version: string;
    speaker_name: string;
    speaker_desc: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    page: number;
    pages: number;
    total: number;
}

export interface Speaker {
    id: number;
    name: string;
    voicefile: string;
    text: string;
    lang: string;
    description?: string;
    model_version?: string;
}

export interface AddSpeakerRequest {
    name: string;
    voicefile: File;
    text: string;
    lang: string;
    description?: string;
    version?: string;
}

export interface UpdateSpeakerRequest extends Partial<AddSpeakerRequest> {
    spk_id: number;
}

export interface ASRResponse {
    data: string;
}

export type ApiResponse<T> = {
    data: T;
    error?: never;
} | {
    data?: never;
    error: string;
} 