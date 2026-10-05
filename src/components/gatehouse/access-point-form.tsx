"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { createAccessPointAction } from "@/lib/gatehouse/actions";

export function AccessPointForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createAccessPointAction(null, new FormData(event.currentTarget));
    setLoading(false);
    if (result?.error) setError(result.error);
    else setOpen(false);
  };

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}><Plus size={16} /> Novo ponto de acesso</Button>
      {open && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.5)", display: "grid", placeItems: "center", zIndex: 50, padding: "16px" }}>
          <div className="cv-panel" style={{ width: "min(100%, 500px)" }}>
            <div className="cv-panel-heading" style={{ marginBottom: "16px" }}>
              <h2><Plus size={18} /> Cadastrar ponto de acesso</h2>
              <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Fechar"><X size={18} /></button>
            </div>
            {error && <div style={{ marginBottom: "16px" }}><Alert tone="error">{error}</Alert></div>}
            <form onSubmit={handleSubmit} className="cv-form">
              <label className="cv-field-wide">Nome *<input name="name" required minLength={2} placeholder="Ex: Portaria Principal" /></label>
              <label className="cv-field-wide">Tipo *
                <select name="type" defaultValue="mixed">
                  <option value="pedestrian">Pedestres</option><option value="vehicle">Veículos</option><option value="service">Serviço</option><option value="mixed">Misto</option>
                </select>
              </label>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
