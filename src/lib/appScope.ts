declare const __APP_SCOPE__: string | undefined;

export const isKwaru = (typeof __APP_SCOPE__ !== 'undefined' ? __APP_SCOPE__ : (import.meta as any).env?.VITE_APP_SCOPE || process.env.APP_SCOPE) === 'kwaru';

export const appTitle = isKwaru ? 'Rekap Sodaqoh Kelompok Waru' : 'Kas Kelas dan Tabungan Guru';
export const navSiswaLabel = isKwaru ? 'Jamaah' : 'Siswa';
export const navGuruLabel = isKwaru ? 'Ibu-ibu' : 'Guru';
export const navIuranLabel = isKwaru ? 'Sodaqoh' : 'Iuran';

export const appScope: 'kwaru' | 'kaskelas' = isKwaru ? 'kwaru' : 'kaskelas';
