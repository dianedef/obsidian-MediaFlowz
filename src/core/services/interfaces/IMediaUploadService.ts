export interface IUploadResponse {
    url: string;
    publicId?: string;
    width?: number;
    height?: number;
    format?: string;
}

export interface IUploadOptions {
    folder?: string;
    transformation?: string;
    tags?: string[];
}

export interface IMediaUploadService {
    upload(file: File, options?: IUploadOptions): Promise<IUploadResponse>;
    delete(publicId: string): Promise<void>;
    getUrl(publicId: string, transformation?: string): string;
    isConfigured(): boolean;
} 