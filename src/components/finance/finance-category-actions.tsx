"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";

type Action = (formData: FormData) => void | Promise<void>;
type Category = { id: string; name: string; kind: "payable" | "receivable" | "both"; status: "active" | "inactive" };
const kindLabel = (kind: Category["kind"]) => kind === "payable" ? "Saídas" : kind === "receivable" ? "Entradas" : "Entradas e saídas";

export function FinanceCategoryTable({ categories, period, updateAction, statusAction, deleteAction }: { categories: Category[]; period: string; updateAction: Action; statusAction: Action; deleteAction: Action }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  return <div className="cv-table-wrap"><table className="cv-table cv-finance-categories-table"><thead><tr><th>Nome</th><th>Aplicação</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{categories.map(category => <FinanceCategoryRow key={category.id} category={category} period={period} editing={editingId === category.id} onEdit={() => setEditingId(category.id)} onCancel={() => setEditingId(null)} updateAction={updateAction} statusAction={statusAction} deleteAction={deleteAction} />)}</tbody></table></div>;
}

function FinanceCategoryRow({ category, period, editing, onEdit, onCancel, updateAction, statusAction, deleteAction }: { category: Category; period: string; editing: boolean; onEdit: () => void; onCancel: () => void; updateAction: Action; statusAction: Action; deleteAction: Action }) {
  const [confirming, setConfirming] = useState(false);
  const formId = `finance-category-edit-${category.id}`;
  if (editing) return <tr>
    <td><input form={formId} name="name" defaultValue={category.name} required minLength={2} aria-label="Nome da categoria" /></td>
    <td><select form={formId} name="kind" defaultValue={category.kind} aria-label="Aplicação da categoria"><option value="both">Entradas e saídas</option><option value="payable">Saídas</option><option value="receivable">Entradas</option></select></td>
    <td>{category.status === "active" ? "Ativa" : "Inativa"}</td>
    <td><form id={formId} action={updateAction} className="cv-inline-actions cv-finance-category-actions"><input type="hidden" name="id" value={category.id} /><input type="hidden" name="period" value={period} /><SubmitButton type="submit" size="compact" pendingLabel="Salvando...">Salvar</SubmitButton><button type="button" className="button button-secondary button-compact" onClick={onCancel}>Cancelar</button></form></td>
  </tr>;
  return <tr>
    <td>{category.name}</td><td>{kindLabel(category.kind)}</td><td>{category.status === "active" ? "Ativa" : "Inativa"}</td>
    <td><div className="cv-inline-actions cv-finance-category-actions"><button type="button" className="button button-secondary button-compact" onClick={onEdit}>Editar</button><form action={statusAction}><input type="hidden" name="id" value={category.id} /><input type="hidden" name="period" value={period} /><input type="hidden" name="status" value={category.status === "active" ? "inactive" : "active"} /><SubmitButton type="submit" size="compact" variant="secondary" pendingLabel={category.status === "active" ? "Inativando..." : "Reativando..."}>{category.status === "active" ? "Inativar" : "Reativar"}</SubmitButton></form>{confirming ? <form action={deleteAction}><input type="hidden" name="id" value={category.id} /><input type="hidden" name="period" value={period} /><SubmitButton type="submit" size="compact" variant="destructive" pendingLabel="Excluindo...">Confirmar exclusão</SubmitButton></form> : <button type="button" className="button button-destructive button-compact" onClick={() => setConfirming(true)}>Excluir</button>}</div></td>
  </tr>;
}
