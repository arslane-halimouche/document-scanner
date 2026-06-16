interface BaseDoc {
  _id?: string;
  _rev?: string;
}

interface ListResponse<T> {
  docs: T[];
  bookmark?: string;
}

declare global {
  interface Window {
    modelApi?: {
      list: <T extends BaseDoc>(modelName: string, limit: number, bookmark?: string) => Promise<ListResponse<T>>;
      create: <T extends BaseDoc>(modelName: string, data: Record<string, unknown>) => Promise<T>;
      get: <T extends BaseDoc>(modelName: string, id: string) => Promise<T>;
      update: <T extends BaseDoc>(modelName: string, id: string, data: Record<string, unknown>, rev: string) => Promise<T>;
      remove: (modelName: string, id: string, rev: string) => Promise<void>;
    };
  }
}

export function getModelApi() {
  if (!window.modelApi) {
    throw new Error('modelApi no disponible — La app debe ejecutarse dentro de ConsulPoint');
  }
  return window.modelApi;
}

export function isModelApiAvailable(): boolean {
  return Boolean(window.modelApi);
}

export type { BaseDoc, ListResponse };