import { api } from './api';

export interface ProfileData {
  nrp: string;
  nama: string;
  perusahaan: string;
  site: string;
  jabatan: string;
  departemen: string;
  masaKerja: string;
}

/**
 * Mengubah string menjadi slug (spasi diubah jadi '-', diubah jadi UPPERCASE).
 * Aturan: s.replace(/[^A-Za-z0-9\-_&]/g, ' ') -> .replace(/[./_ ]/g, '-') -> .toUpperCase()
 */
export function slugify(s: string): string {
  return s
    .replace(/[^A-Za-z0-9\-_&]/g, ' ')
    .replace(/[./_ ]/g, '-')
    .toUpperCase();
}

/**
 * Hitung masa kerja (tahun, bulan, hari) dari string tanggal YYYY-MM-DD.
 * Port dari fungsi `hitungMasaKerja` di blade Laravel lama.
 */
export function hitungMasaKerja(tanggalMulaiStr: string): {
  tahun: number;
  bulan: number;
  hari: number;
} {
  const parts = tanggalMulaiStr.split('-').map(Number);
  const start = new Date(parts[0], parts[1] - 1, parts[2]);
  const now = new Date();

  let tahun = now.getFullYear() - start.getFullYear();
  let bulan = now.getMonth() - start.getMonth();
  let hari = now.getDate() - start.getDate();

  if (bulan < 0) {
    tahun--;
    bulan += 12;
  }

  if (hari < 0) {
    const bulanSebelum = new Date(now.getFullYear(), now.getMonth(), 0);
    const hariDalamBulanSebelum = bulanSebelum.getDate();
    hari += hariDalamBulanSebelum;
    bulan--;
    if (bulan < 0) {
      tahun--;
      bulan += 12;
    }
  }

  return { tahun, bulan, hari };
}

export function formatMasaKerja(m: {
  tahun: number;
  bulan: number;
  hari: number;
}): string {
  return `${m.tahun} tahun ${m.bulan} bulan ${m.hari} hari`;
}

/**
 * Ambil data profil karyawan dari EAV builder dan resolve nilai DARI-TABEL
 * menjadi nama tampil. Backend `buildSession` mengembalikan data record
 * dengan struktur: data[fieldCode] = { value_data, uuid_data, code_data }.
 */
export async function fetchProfile(nrp: string): Promise<ProfileData> {
  const slug = slugify(nrp);

  // 1. Record KARYAWAN + anak-anaknya (IDENTITAS-KARYAWAN, KONTRAK-KARYAWAN)
  const profile = await api<{ data: Record<string, { value_data?: string }> }>(
    `/eav/builder?table=KARYAWAN&record=${encodeURIComponent(slug)}`,
  );
  const record = profile?.data ?? {};

  const get = (code: string): string => record[code]?.value_data ?? '';

  const nrpVal = get('NRP');
  const namaVal = get('NAMA-KARYAWAN');
  const tanggalMasuk = get('TANGGAL-MASUK-KERJA--TMK-');
  const perusahaanSlug = get('PERUSAHAAN');
  const projectSlug = get('PROJECT');
  const jabatanSlug = get('JABATAN');
  const departemenSlug = get('DEPARTEMEN');

  // 2. Resolve DARI-TABEL: bangun map slug -> nama tampil dari entity referensi
  const resolve = async (
    entityCode: string,
    fieldCode: string,
  ): Promise<Map<string, string>> => {
    const map = new Map<string, string>();
    const res = await api<{ data: Record<string, Record<string, { value_data?: string }>> }>(
      `/eav/builder?table=${entityCode}`,
    );
    const rows = res?.data ?? {};
    for (const [recCode, fields] of Object.entries(rows)) {
      const val = fields?.[fieldCode]?.value_data;
      if (val) map.set(recCode, val);
    }
    return map;
  };

  const [perusahaanMap, projectMap, jabatanMap, departemenMap] =
    await Promise.all([
      resolve('PERUSAHAAN', 'NAMA-PERUSAHAAN-PENDEK'),
      resolve('PROJECT', 'NAMA-PROJECT-PENDEK'),
      resolve('JABATAN', 'JABATAN'),
      resolve('DEPARTEMEN', 'DEPARTEMEN'),
    ]);

  return {
    nrp: nrpVal || nrp,
    nama: namaVal,
    perusahaan: perusahaanMap.get(perusahaanSlug) || perusahaanSlug,
    site: projectMap.get(projectSlug) || projectSlug,
    jabatan: jabatanMap.get(jabatanSlug) || jabatanSlug,
    departemen: departemenMap.get(departemenSlug) || departemenSlug,
    masaKerja: tanggalMasuk
      ? formatMasaKerja(hitungMasaKerja(tanggalMasuk))
      : '',
  };
}
