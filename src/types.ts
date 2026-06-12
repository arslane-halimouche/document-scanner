export type ScannedDocument = {
  id: string;
  _id?: string;
  _rev?: string;
  name: string;
  originalDataUrl: string;
  processedDataUrl: string;
  filterMode: 'bw' | 'grayscale' | 'color';
  source: 'camera' | 'file';
  createdAt: string;
  updatedAt: string;
  fileType: string;
  savedToCloud?: boolean;
};