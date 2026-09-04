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
  tableShowCode?: string | null;
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
  gabungan?: { fieldShowCode: string; tableShowCode?: string; splitBy?: string; sort?: number }[];
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
  family: (code: string, recordCode: string) =>
    api<Record<string, unknown>>(`/eav/entities/${encodeURIComponent(code)}/records/${encodeURIComponent(recordCode)}/family`),
  history: (code: string, recordCode: string) =>
    api<unknown[]>(`/eav/entities/${encodeURIComponent(code)}/records/${encodeURIComponent(recordCode)}/history`),
  changeTypes: (tableCode: string) =>
    api<Array<{ code: string; table: string; type: string; description: string }>>(`/eav/change-types/${encodeURIComponent(tableCode)}`),
  correction: (code: string, recordCode: string, values: Record<string, string>) =>
    api<unknown>(`/eav/entities/${encodeURIComponent(code)}/records/${encodeURIComponent(recordCode)}/correction`, { method: 'POST', body: JSON.stringify({ values }) }),
  historicalUpdate: (code: string, recordCode: string, changeTypeCode: string, values: Record<string, string>) =>
    api<{ request: { id: number; status: string } }>(`/eav/entities/${encodeURIComponent(code)}/records/${encodeURIComponent(recordCode)}/historical-update`, { method: 'POST', body: JSON.stringify({ changeTypeCode, values }) }),
  uploadAsset: (file: File, folder: string, filename?: string) => {
    const body = new FormData();
    body.append('file', file);
    body.append('folder', folder);
    if (filename) body.append('filename', filename);
    const token = getToken();
    return fetch(`${BASE}/eav/assets/upload`, {
      method: 'POST',
      body,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(async (res) => {
      if (!res.ok) throw new Error(`Gagal upload asset (HTTP ${res.status})`);
      return (await res.json()) as { success: boolean; url: string };
    });
  },
};

// Otoritas dinamis: role + status kerja + feature policy.
export interface EffectiveFeatureAccess {
  code: string;
  name: string;
  route: string | null;
  icon: string | null;
  menuGroup: string | null;
  sort: number;
  read: boolean;
  write: boolean;
  edit: boolean;
  delete: boolean;
  import: boolean;
  export: boolean;
  submit: boolean;
  approve: boolean;
  reject: boolean;
  history: boolean;
  restore: boolean;
  scopes: string[];
}

export interface AccessBootstrap {
  user: LoginUser;
  roleLevels: number[];
  statuses: Array<{
    id: number;
    statusCode: string;
    roleLevel: number;
    position: string | null;
    company: string | null;
    project: string | null;
    department: string | null;
    division: string | null;
    startDate: string;
    endDate: string | null;
  }>;
  features: Record<string, EffectiveFeatureAccess>;
}

export const accessApi = {
  bootstrap: () => api<AccessBootstrap>('/access/bootstrap'),
  me: () => api<{ user: LoginUser; statuses: unknown[]; levels: number[] }>('/access/me'),
  check: (feature: string, action: string) =>
    api<{ feature: string; action: string; allowed: boolean }>(
      `/access/check/${encodeURIComponent(feature)}/${encodeURIComponent(action)}`,
      { method: 'POST' },
    ),
};

export interface RoleLevelItem {
  id: number;
  level: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
}

export interface FeaturePolicyItem {
  id: number;
  roleLevelId: number;
  employmentStatusCode: string;
  canRead: boolean;
  canWrite: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canImport: boolean;
  canExport: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canViewHistory: boolean;
  canRestore: boolean;
  scopeType: string;
  roleLevel: RoleLevelItem;
}

export interface FeatureDefinitionItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  route: string | null;
  icon: string | null;
  menuGroup: string | null;
  sort: number;
  active: boolean;
  isSystem: boolean;
  policies: FeaturePolicyItem[];
}

export interface EmploymentStatusItem {
  id: number;
  employeeNrp: string;
  statusCode: string;
  startDate: string;
  endDate: string | null;
  isPrimary: boolean;
  user: { id: number; nrp: string; name: string };
  roleLevel: RoleLevelItem;
  company: { code: string; name: string } | null;
  project: { code: string; name: string } | null;
  department: { code: string; name: string } | null;
  division: { code: string; name: string } | null;
  position: { code: string; name: string } | null;
}

export const authorityAdminApi = {
  roles: () => api<RoleLevelItem[]>('/access/admin/roles'),
  features: () => api<FeatureDefinitionItem[]>('/access/admin/features'),
  createFeature: (body: Record<string, unknown>) =>
    api<FeatureDefinitionItem>('/access/admin/features', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  users: () => api<LoginUser[]>('/access/admin/users'),
  employmentStatuses: () => api<EmploymentStatusItem[]>('/access/admin/employment-statuses'),
  updateFeature: (code: string, body: Record<string, unknown>) =>
    api<FeatureDefinitionItem>(`/access/admin/features/${encodeURIComponent(code)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  upsertPolicy: (code: string, body: Record<string, unknown>) =>
    api<FeaturePolicyItem>(`/access/admin/features/${encodeURIComponent(code)}/policy`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  createEmploymentStatus: (body: Record<string, unknown>) =>
    api<EmploymentStatusItem>('/access/admin/employment-statuses', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
