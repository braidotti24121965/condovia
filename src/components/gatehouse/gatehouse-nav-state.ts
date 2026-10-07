export function isGatehouseNavItemActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/app/gatehouse") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
