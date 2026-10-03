export type StructureRecord = { id: string; parent_id: string | null; name: string; code: string | null; structure_type: string; sort_order: number; status: string };
export type StructureNode = StructureRecord & { children: StructureNode[] };
export type UnitCatalogRecord = { structure_id: string | null; code: string; display_name: string | null; unit_type: string; operational_status: string };
export type UnitCatalogFilters = { query?: string; structure?: string; type?: string; status?: string };

export function sanitizeCatalogSearch(value: string) {
  return value.replace(/[%_(),\u0000-\u001f]/g, " ").trim();
}

export function filterUnitCatalog<T extends UnitCatalogRecord>(rows: T[], filters: UnitCatalogFilters) {
  const query = sanitizeCatalogSearch(filters.query ?? "").toLocaleLowerCase("pt-BR");
  return rows.filter((row) => {
    if (query && !`${row.code} ${row.display_name ?? ""}`.toLocaleLowerCase("pt-BR").includes(query)) return false;
    if (filters.structure && row.structure_id !== filters.structure) return false;
    if (filters.type && row.unit_type !== filters.type) return false;
    if (filters.status && row.operational_status !== filters.status) return false;
    return true;
  });
}

export function buildStructureTree(records: StructureRecord[]): StructureNode[] {
  const nodes = new Map(records.map((record) => [record.id, { ...record, children: [] as StructureNode[] }]));
  const roots: StructureNode[] = [];
  for (const node of nodes.values()) {
    if (node.parent_id === null) roots.push(node);
    else nodes.get(node.parent_id)?.children.push(node);
  }
  const sort = (items: StructureNode[]) => {
    items.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "pt-BR"));
    items.forEach((item) => sort(item.children));
  };
  sort(roots);
  return roots;
}
