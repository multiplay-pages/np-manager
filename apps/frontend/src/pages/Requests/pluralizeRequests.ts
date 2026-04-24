export function pluralizeRequests(total: number): string {
  if (total === 1) return 'sprawa'
  const mod10 = total % 10
  const mod100 = total % 100
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'sprawy'
  return 'spraw'
}
