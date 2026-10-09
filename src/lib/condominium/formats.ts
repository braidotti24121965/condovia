/** Civil dates are displayed in Brazilian format and submitted as ISO, without timezone conversion. */
export function formatCivilDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{2})(\d)/, "$1/$2").replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
}
export function civilDateToIso(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return "";
  const [, day, month, year] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (!Number(year) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== `${year}-${month}-${day}`) return "";
  return `${year}-${month}-${day}`;
}
export function isoToCivilDate(value: string) {
  return /^(\d{4})-(\d{2})-(\d{2})$/.test(value) ? value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$3/$2/$1") : "";
}
