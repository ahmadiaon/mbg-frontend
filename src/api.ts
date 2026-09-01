export interface LoginUser {
  id: number;
  nrp: string;
  name: string;
  email?: string | null;
  role: number;
}

export interface LoginSuccess {
  status: 'success';
  token: string;
  user: LoginUser;
}

export interface NeedVerification {
  status: 'need_verification';
  nrp: string;
  name: string;
  validationToken: string;
  waNumber: string;
}

export type LoginResult = LoginSuccess | NeedVerification;

export interface ValidationResult {
  found: boolean;
  nrp: string;
  name: string;
}

const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('mbg_token');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `Terjadi kesalahan (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export async function downloadFile(path: string, filename: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Gagal mengunduh (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function uploadFile<T>(path: string, file: File): Promise<T> {
  const token = getToken();
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    body: fd,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let message = `Terjadi kesalahan (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const authApi = {
  check: (nrp: string) =>
    api<{ found: boolean; isPin: boolean; name: string }>('/auth/check', {
      method: 'POST',
      body: JSON.stringify({ nrp }),
    }),
  login: (nrp: string, credential: string) =>
    api<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ nrp, credential }),
    }),
  validate: (token: string) =>
    api<ValidationResult>(`/auth/validation/${encodeURIComponent(token)}`),
  setPin: (token: string, pin: string) =>
    api<{ message: string }>('/auth/set-pin', {
      method: 'POST',
      body: JSON.stringify({ token, pin }),
    }),
};

export interface SlipItem {
  id: number;
  year: number;
  month: number;
  codeFile: string;
  fileUrl: string | null;
}

export const payslipApi = {
  list: () => api<SlipItem[]>('/payslips'),
};

// =====================================================================
// EAV — engine database dinamis (entity / field / value)
// =====================================================================

export interface BuilderField {
  id: number;
  entityId: number;
  code: string;
  name: string;
  fullCode: string;
  type: string;
  level: number;
  sort: number;
  visibility: string | null;
  data_source?: { entitySource: string | null; fieldSource: string | null } | null;
}

export interface BuilderEntity {
  id: number;
  code: string;
  name: string;
  menu: string | null;
  parentId: number | null;
  primaryCode: string | null;
  active: boolean;
  fields?: Record<string, BuilderField>;
}

export interface BuilderMeta {
  entities: Record<string, BuilderEntity>;
  menus: Record<string, string[]>;
  children: Record<string, string[]>;
  fieldShows?: FieldShow[];
  groupForms?: GroupForm[];
}

export interface FieldShow {
  id: number;
  entityCode: string;
  fieldCode: string;
  fieldShowCode: string;
  splitBy: string | null;
  sort: number;
}

export interface GroupForm {
  id: number;
  uuid: string;
  description: string;
  active: boolean;
}

export interface EavRecord {
  recordCode: string;
  recordUuid: string;
  values: Record<string, string>;
}

export interface CreateEntityBody {
  code: string;
  name: string;
  menu?: string;
  parentCode?: string;
  primaryCode?: string;
}

export interface CreateFieldBody {
  code: string;
  name: string;
  type?: string;
  level?: number;
  sort?: number;
  visibility?: string;
  sourceEntityCode?: string;
  sourceFieldCode?: string;
  gabungan?: { fieldShowCode: string; splitBy?: string; sort?: number }[];
}

export const eavApi = {
  builder: (table?: string, record?: string) => {
    const q = new URLSearchParams();
    if (table) q.set('table', table);
    if (record) q.set('record', record);
    const s = q.toString();
    return api<BuilderMeta>(`/eav/builder${s ? `?${s}` : ''}`);
  },
  entities: () => api<BuilderEntity[]>('/eav/entities'),
  createEntity: (body: CreateEntityBody) =>
    api<BuilderEntity>('/eav/entities', { method: 'POST', body: JSON.stringify(body) }),
  updateEntity: (code: string, body: Partial<CreateEntityBody>) =>
    api<BuilderEntity>(`/eav/entities/${encodeURIComponent(code)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteEntity: (code: string) =>
    api<{ message: string }>(`/eav/entities/${encodeURIComponent(code)}`, { method: 'DELETE' }),

  entityFields: (code: string) =>
    api<BuilderEntity>(`/eav/entities/${encodeURIComponent(code)}/fields`),
  createField: (code: string, body: CreateFieldBody) =>
    api<BuilderField>(`/eav/entities/${encodeURIComponent(code)}/fields`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateField: (code: string, fieldCode: string, body: Partial<CreateFieldBody>) =>
    api<BuilderField>(
      `/eav/entities/${encodeURIComponent(code)}/fields/${encodeURIComponent(fieldCode)}`,
      { method: 'PUT', body: JSON.stringify(body) },
    ),
  deleteField: (code: string, fieldCode: string) =>
    api<{ message: string }>(
      `/eav/entities/${encodeURIComponent(code)}/fields/${encodeURIComponent(fieldCode)}`,
      { method: 'DELETE' },
    ),

  records: (code: string) =>
    api<EavRecord[]>(`/eav/entities/${encodeURIComponent(code)}/records`),
  storeRecord: (code: string, body: { recordCode: string; recordUuid?: string; values: Record<string, string> }) =>
    api<{ recordCode: string; recordUuid: string; saved: Record<string, string> }>(
      `/eav/entities/${encodeURIComponent(code)}/records`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  deleteRecord: (code: string, recordCode: string) =>
    api<{ message: string }>(
      `/eav/entities/${encodeURIComponent(code)}/records/${encodeURIComponent(recordCode)}`,
      { method: 'DELETE' },
    ),
  exportXlsx: (code: string) =>
    downloadFile(`/eav/entities/${encodeURIComponent(code)}/export`, `${code}.xlsx`),
  importXlsx: (file: File) =>
    uploadFile<{ imported: number }>('/eav/import', file),
};
