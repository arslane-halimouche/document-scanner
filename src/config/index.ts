interface MiniAppParams {
  language?: string;
  theme?: string;
  token?: string;
  apiBaseUrl?: string;
  miniAppId?: string;
  folderId?: string;
  applicationId?: string;
}

declare global {
  interface Window {
    MINI_APP_PARAMS?: MiniAppParams;
  }
}

function getUrlParams(): MiniAppParams {
  const p = new URLSearchParams(window.location.search);
  return {
    language: p.get('language') ?? undefined,
    theme: p.get('theme') ?? undefined,
    token: p.get('token') ?? undefined,
    apiBaseUrl: p.get('apiBaseUrl') ?? undefined,
    miniAppId: p.get('miniAppId') ?? undefined,
    folderId: p.get('folderId') ?? undefined,
    applicationId: p.get('applicationId') ?? undefined,
  };
}

function getEnvParams(): MiniAppParams {
  if (!import.meta.env.DEV) return {};
  return {
    language: import.meta.env.VITE_DEV_LANGUAGE ?? undefined,
    theme: import.meta.env.VITE_DEV_THEME ?? undefined,
    token: import.meta.env.VITE_DEV_TOKEN ?? undefined,
    apiBaseUrl: import.meta.env.VITE_DEV_API_BASE_URL ?? undefined,
    miniAppId: import.meta.env.VITE_DEV_MINI_APP_ID ?? undefined,
    folderId: import.meta.env.VITE_DEV_FOLDER_ID ?? undefined,
    applicationId: import.meta.env.VITE_DEV_APPLICATION_ID ?? undefined,
  };
}

export interface AppConfig {
  language: string;
  theme: 'light' | 'dark';
  miniAppId: string;
  folderId: string | null;
  applicationId: string | null;
  apiBaseUrl: string | null;
  token: string | null;
  syncEnabled: boolean;
  storageKey: string;
}

export function getConfig(): AppConfig {
  const w = window.MINI_APP_PARAMS ?? {};
  const u = getUrlParams();
  const e = getEnvParams();
  const miniAppId = w.miniAppId ?? u.miniAppId ?? e.miniAppId ?? 'document-scanner';
  const apiBaseUrl = w.apiBaseUrl ?? u.apiBaseUrl ?? e.apiBaseUrl ?? null;
  const token = w.token ?? u.token ?? e.token ?? null;
  return {
    language: w.language ?? u.language ?? e.language ?? 'es',
    theme: (w.theme ?? u.theme ?? e.theme ?? 'light') as AppConfig['theme'],
    miniAppId,
    folderId: w.folderId ?? u.folderId ?? e.folderId ?? null,
    applicationId: w.applicationId ?? u.applicationId ?? e.applicationId ?? null,
    apiBaseUrl,
    token,
    syncEnabled: Boolean(apiBaseUrl && token),
    storageKey: `miniapp_data_${miniAppId}`,
  };
}