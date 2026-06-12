import { getConfig } from '../config';

export interface BaseDoc {
  _id?: string;
  _rev?: string;
}

export interface ListResponse<T> {
  docs: T[];
  bookmark?: string;
}

function buildHeaders(token: string, miniAppId: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-mini-app-id': miniAppId,
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { apiBaseUrl, token, miniAppId } = getConfig();
  if (!apiBaseUrl || !token) throw new Error('NO_CONTEXT');
  const res = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      ...buildHeaders(token, miniAppId),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function modelPath(miniAppId: string, modelName: string, docId?: string): string {
  const base = `/mini-apps/${miniAppId}/models/${modelName}/data`;
  return docId ? `${base}/${docId}` : base;
}

export const modelApi = {
  list<T extends BaseDoc>(modelName: string, limit = 50, bookmark?: string): Promise<ListResponse<T>> {
    const { miniAppId } = getConfig();
    const params = new URLSearchParams({ limit: String(limit) });
    if (bookmark) params.set('bookmark', bookmark);
    return request<ListResponse<T>>(`${modelPath(miniAppId, modelName)}?${params}`);
  },

  get<T extends BaseDoc>(modelName: string, docId: string): Promise<T> {
    const { miniAppId } = getConfig();
    return request<T>(modelPath(miniAppId, modelName, docId));
  },

  create<T extends BaseDoc>(modelName: string, data: Omit<T, '_id' | '_rev'>): Promise<T> {
    const { miniAppId } = getConfig();
    return request<T>(modelPath(miniAppId, modelName), {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
  },

  update<T extends BaseDoc>(modelName: string, docId: string, data: Omit<T, '_id' | '_rev'>, rev: string): Promise<T> {
    const { miniAppId } = getConfig();
    return request<T>(modelPath(miniAppId, modelName, docId), {
      method: 'PUT',
      body: JSON.stringify({ data, _rev: rev }),
    });
  },

  remove(modelName: string, docId: string, rev: string): Promise<void> {
    const { miniAppId } = getConfig();
    return request<void>(`${modelPath(miniAppId, modelName, docId)}?rev=${encodeURIComponent(rev)}`, {
      method: 'DELETE',
    });
  },
};