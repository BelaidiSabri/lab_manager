/** Format dates as DD/MM/YYYY (design system). */
export function formatDateDMY(value: Date | string | number | undefined | null): string {
  if (value === undefined || value === null) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
