"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { updateAccessPointAction } from "@/lib/gatehouse/actions";
import type { AccessPoint } from "@/lib/gatehouse/types";

const typeLabels = { pedestrian: "Pedestres", vehicle: "Veículos", service: "Serviço", mixed: "Misto" } as const;

export function AccessPointList({ accessPoints }: { accessPoints: AccessPoint[] }) {
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setError(null);
    const result = await updateAccessPointAction(null, new FormData(event.currentTarget));
    setLoading(false); if (result?.error) setError(result.error); else setEditing(null);
  };

  return <>
    {error && <div style={{ marginBottom: "16px" }}><Alert tone="error">{error}</Alert></div>}
    <div className="cv-table-wrap"><table className="cv-table"><thead><tr><th>Nome</th><th>Tipo</th><th>Status</th><th>Ação</th></tr></thead><tbody>
      {accessPoints.map((point) => editing === point.id ? (
        <tr key={point.id}><td colSpan={4}><form onSubmit={submit} className="cv-form" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", alignItems: "end", gap: "8px" }}><input type="hidden" name="id" value={point.id} /><label>Nome<input name="name" defaultValue={point.name} required minLength={2} /></label><label>Tipo<select name="type" defaultValue={point.type}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Status<select name="status" defaultValue={point.status}><option value="active">Ativo</option><option value="inactive">Inativo</option></select></label><Button type="submit" disabled={loading}>{loading ? "..." : "Salvar"}</Button></form></td></tr>
      ) : (
        <tr key={point.id}><td><strong>{point.name}</strong></td><td>{typeLabels[point.type]}</td><td><span className={`cv-status cv-status-${point.status}`}>{point.status === "active" ? "Ativo" : "Inativo"}</span></td><td><Button type="button" variant="outline" onClick={() => setEditing(point.id)}>Editar</Button></td></tr>
      ))}
    </tbody></table></div>
  </>;
}
