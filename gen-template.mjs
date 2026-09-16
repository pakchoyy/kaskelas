import XLSX from 'xlsx';

const data = [
  ['Nama', 'Blok'],
  ['Alea', 'Etan'],
  ['Budi', 'Kulon'],
  ['Citra', 'Etan'],
  ['Dani', 'Kulon'],
  ['Eka', 'Etan'],
  ['Farhan', 'Kulon'],
];

const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Siswa');
XLSX.writeFile(wb, 'public/template-siswa.xlsx');

console.log('Template updated with 6 examples (3 Etan, 3 Kulon)');
