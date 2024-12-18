export interface IUploadOptions {
    variant?: string;
    metadata?: Record<string, any>;
}

export interface IUploadResponse {
    url: string;
    publicId: string;
    metadata?: {
        id: string;
        type: string;
        playback?: any;
        [key: string]: any;
    };
}

export interface IMediaUploadService {
    upload(file: File, options?: IUploadOptions): Promise<IUploadResponse>;
    delete(publicId: string): Promise<void>;
    getUrl(publicId: string, variant?: string): string;
    isConfigured(): boolean;
    handleMediaUpload(data: { files: FileList | File[] }): Promise<void>;
} 