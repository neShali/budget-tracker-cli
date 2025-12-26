export function title(text: string): string {
  return `=== ${text} ===`;
}

export function shortId(id: string): string {
  return id.length <= 8 ? id : `${id.slice(0, 4)}…${id.slice(-4)}`;
}

export function formatMoney(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  const abs = Math.abs(value);
  return `${sign}${abs}`;
}

export function pressEnterLabel(): string {
  return 'Enter — продолжить';
}
