export function parsePositiveNumber(
  input: string
): { ok: true; value: number } | { ok: false; error: string } {
  const raw = input.trim().replace(',', '.');
  const n = Number(raw);

  if (!Number.isFinite(n)) return { ok: false, error: 'Введите число' };
  if (n <= 0) return { ok: false, error: 'Число должно быть больше 0' };

  return { ok: true, value: n };
}

export function validateYmdOrEmpty(input: string): true | string {
  const s = input.trim();
  if (s.length === 0) return true;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'Формат даты: YYYY-MM-DD';

  const [ys, ms, ds] = s.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);

  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d))
    return 'Некорректная дата';
  if (m < 1 || m > 12) return 'Месяц должен быть 01..12';

  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d < 1 || d > daysInMonth) return 'Некорректный день месяца';

  return true;
}
