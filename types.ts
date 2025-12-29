export enum ViewState {
  PLAN = 'PLAN',
  ARCHITECTURE = 'ARCHITECTURE',
  PROTO = 'PROTO',
  SIMULATION = 'SIMULATION',
  CODE = 'CODE',
}

export interface ProjectStep {
  id: number;
  title: string;
  details: string[];
  completed: boolean;
}

export interface ProtoDefinition {
  name: string;
  content: string;
}

export interface CodeFile {
  path: string;
  name: string;
  language: 'rust' | 'toml' | 'proto' | 'markdown' | 'bash';
  content: string;
}

export interface MockLog {
  id: string;
  timestamp: string;
  source: 'CLIENT' | 'SERVER' | 'DB';
  message: string;
  type: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARN';
}

export interface FileUploadStatus {
  fileName: string;
  progress: number;
  status: 'IDLE' | 'UPLOADING' | 'COMPLETED' | 'VERIFYING';
  hash?: string;
}