export interface ExplanationResponse {
  explanation: string;
  spatialDescription: string;
  imagePrompt: string;
}

export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  TRANSCRIBING = 'TRANSCRIBING',
  PROCESSING_TEXT = 'PROCESSING_TEXT',
  GENERATING_IMAGE = 'GENERATING_IMAGE',
  GENERATING_AUDIO = 'GENERATING_AUDIO',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface Message {
  role: 'user' | 'model';
  content: string;
}

export interface GeneratedContent {
  text: string;
  spatialDescription: string;
  imageUrl?: string;
  audioUrl?: string; // Blob URL
}