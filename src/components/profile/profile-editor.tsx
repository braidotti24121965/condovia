"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateMyDisplayName, type ActionState } from "@/lib/auth/actions";

const initialState: ActionState = {};

export function ProfileEditor({ displayName, email }: { displayName: string; email: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(displayName);
  const [submittedName, setSubmittedName] = useState(displayName);
  const [state, formAction, pending] = useActionState(updateMyDisplayName, initialState);

  useEffect(() => {
    if (!state.success) return;
    setEditing(false);
    setName(submittedName);
    router.refresh();
  }, [router, state.success, submittedName]);

  const cancel = () => {
    setName(displayName);
    setEditing(false);
  };

  return editing ? <form action={formAction} onSubmit={() => setSubmittedName(name.trim())} className="profile-edit-form">
    <div className="profile-fields">
      <label className="profile-edit-field">Nome<input name="preferred_name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoComplete="name" required /></label>
      <div><span>E-mail de acesso</span><strong>{email || "Não informado"}</strong></div>
    </div>
    {state.error && <p className="profile-feedback profile-feedback-error" role="alert">{state.error}</p>}
    {state.success && <p className="profile-feedback profile-feedback-success" role="status">{state.success}</p>}
    <div className="profile-edit-actions"><Button variant="secondary" type="button" onClick={cancel} disabled={pending}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar alterações"}</Button></div>
  </form> : <>
    <div className="profile-fields"><div><span>Nome</span><strong>{displayName || "Não informado"}</strong></div><div><span>E-mail de acesso</span><strong>{email || "Não informado"}</strong></div></div>
    {state.success && <p className="profile-feedback profile-feedback-success" role="status">{state.success}</p>}
    <div className="profile-edit-actions"><Button type="button" onClick={() => setEditing(true)}>Editar dados</Button></div>
  </>;
}
