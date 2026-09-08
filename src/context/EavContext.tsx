import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  eavApi,
  type BuilderEntity,
  type BuilderMeta,
  type EavRecord,
  type FieldShow,
  type GroupForm,
  type PersetujuanStep,
} from '../api';
import { useAuth } from '../auth';

interface EavContextValue {
  entities: Record<string, BuilderEntity>;
  menus: Record<string, string[]>;
  fieldShows: FieldShow[];
  groupForms: GroupForm[];
  persetujuan: Record<string, Record<string, PersetujuanStep>>;
  masterRecords: Record<string, EavRecord[]>;
  isLoaded: boolean;
  loading: boolean;
  error: string;
  fetchSchema: (force?: boolean) => Promise<BuilderMeta | null>;
  fetchMasterRecords: (tableCode: string, force?: boolean) => Promise<EavRecord[]>;
  invalidateSchema: () => Promise<void>;
  updateEntityLocal: (entity: BuilderEntity) => void;
}

const EavContext = createContext<EavContextValue | null>(null);

const SCHEMA_CACHE_KEY = 'mbg_eav_schema';

export function EavProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();

  // 1. Initial State membaca dari localStorage (Cache-First -> 0ms initial render)
  const [cachedMeta] = useState<BuilderMeta | null>(() => {
    try {
      const saved = localStorage.getItem(SCHEMA_CACHE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [entities, setEntities] = useState<Record<string, BuilderEntity>>(
    () => cachedMeta?.entities ?? {},
  );
  const [menus, setMenus] = useState<Record<string, string[]>>(
    () => cachedMeta?.menus ?? {},
  );
  const [fieldShows, setFieldShows] = useState<FieldShow[]>(
    () => cachedMeta?.fieldShows ?? [],
  );
  const [groupForms, setGroupForms] = useState<GroupForm[]>(
    () => cachedMeta?.groupForms ?? [],
  );
  const [persetujuan, setPersetujuan] = useState<
    Record<string, Record<string, PersetujuanStep>>
  >(() => cachedMeta?.persetujuan ?? {});

  const [masterRecords, setMasterRecords] = useState<Record<string, EavRecord[]>>({});
  const [isLoaded, setIsLoaded] = useState<boolean>(() => Boolean(cachedMeta));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch schema dari server (In-Memory Server Cache melayani dalam <15ms)
  const fetchSchema = useCallback(
    async (force = false): Promise<BuilderMeta | null> => {
      if (!token) return null;
      if (!force && isLoaded && Object.keys(entities).length > 0) {
        return {
          entities,
          menus,
          children: {},
          fieldShows,
          groupForms,
          persetujuan,
        };
      }

      setLoading(true);
      setError('');
      try {
        const meta = await eavApi.builder();
        setEntities(meta.entities ?? {});
        setMenus(meta.menus ?? {});
        setFieldShows(meta.fieldShows ?? []);
        setGroupForms(meta.groupForms ?? []);
        setPersetujuan(meta.persetujuan ?? {});
        setIsLoaded(true);

        try {
          localStorage.setItem(SCHEMA_CACHE_KEY, JSON.stringify(meta));
        } catch {
          // kuota localStorage aman, abaikan jika gagal
        }

        return meta;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal memuat skema database';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [token, isLoaded, entities, menus, fieldShows, groupForms, persetujuan],
  );

  // Ambil record master (DARI-TABEL lookup) dengan caching di memori
  const fetchMasterRecords = useCallback(
    async (tableCode: string, force = false): Promise<EavRecord[]> => {
      if (!tableCode || !token) return [];
      if (!force && masterRecords[tableCode]?.length) {
        return masterRecords[tableCode];
      }

      try {
        const recs = await eavApi.records(tableCode);
        setMasterRecords((prev) => ({ ...prev, [tableCode]: recs }));
        return recs;
      } catch {
        return masterRecords[tableCode] || [];
      }
    },
    [token, masterRecords],
  );

  // Invalidate schema saat admin membuat/mengubah/menghapus form
  const invalidateSchema = useCallback(async () => {
    localStorage.removeItem(SCHEMA_CACHE_KEY);
    await fetchSchema(true);
  }, [fetchSchema]);

  const updateEntityLocal = useCallback((entity: BuilderEntity) => {
    setEntities((prev) => ({ ...prev, [entity.code]: entity }));
  }, []);

  // Sync saat token berubah atau belum pernah dimuat sama sekali
  useEffect(() => {
    if (token && (!isLoaded || Object.keys(entities).length === 0)) {
      void fetchSchema();
    }
  }, [token, isLoaded, entities, fetchSchema]);

  return (
    <EavContext.Provider
      value={{
        entities,
        menus,
        fieldShows,
        groupForms,
        persetujuan,
        masterRecords,
        isLoaded,
        loading,
        error,
        fetchSchema,
        fetchMasterRecords,
        invalidateSchema,
        updateEntityLocal,
      }}
    >
      {children}
    </EavContext.Provider>
  );
}

export function useEav() {
  const ctx = useContext(EavContext);
  if (!ctx) {
    throw new Error('useEav harus dipakai di dalam EavProvider');
  }
  return ctx;
}
