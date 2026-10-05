export function shouldShowFloor(condominiumType: string | null | undefined): boolean {
  return condominiumType !== "horizontal";
}
