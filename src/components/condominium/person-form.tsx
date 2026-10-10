"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { addPersonRelationship, inviteResident, savePerson, savePersonContact, setPersonCpf, updatePerson } from "@/lib/condominium/actions";
import { ConfirmedRelationshipForm } from "@/components/condominium/confirmed-relationship-form";
import { PersonPicker } from "@/components/condominium/person-picker";
import { RelationshipSubmitButton } from "@/components/condominium/relationship-submit-button";
import type { PersonRelationshipKind } from "@/lib/condominium/person-return";
import { validatePersonFields } from "@/lib/condominium/person-validation";

export function PersonForm({ returnPath = "", returnKind = "" }: { returnPath?: string; returnKind?: string }) {
  const [state, formAction, pending] = useActionState(savePerson, { error: "" });
  const [clientError, setClientError] = useState("");
  const error = clientError || state.error;
  return <form action={formAction} className="cv-form" onSubmit={(event) => {
    const form = new FormData(event.currentTarget);
    const validation = validatePersonFields({ fullName: String(form.get("full_name") || ""), preferredName: String(form.get("preferred_name") || ""), birthDate: String(form.get("birth_date") || ""), cpf: String(form.get("cpf") || ""), email: String(form.get("email") || ""), phone: String(form.get("phone") || "") });
    setClientError(Object.values(validation)[0] || "");
    if (Object.keys(validation).length) event.preventDefault();
  }}>
    {returnPath && returnKind && <><input type="hidden" name="return_path" value={returnPath}/><input type="hidden" name="return_kind" value={returnKind}/></>}
    <div className="cv-form-section"><h2>Identificação</h2><div className="cv-form-grid">
      <label className="cv-field-lg">Nome completo<input name="full_name" required minLength={2} maxLength={180} autoComplete="name"/></label>
      <label className="cv-field-lg">Nome preferencial<input name="preferred_name" maxLength={120} autoComplete="nickname"/></label>
      <label className="cv-field-md">Data de nascimento<input type="date" name="birth_date"/></label>
      <label className="cv-field-md">CPF (opcional)<input name="cpf" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" maxLength={14}/></label>
    </div></div>
    <div className="cv-form-section"><h2>Contato</h2><div className="cv-form-grid">
      <label className="cv-field-lg">E-mail<input type="email" name="email" autoComplete="email" maxLength={254}/></label>
      <label className="cv-field-md">Telefone<input type="tel" name="phone" autoComplete="tel" maxLength={20} placeholder="+55 11 99999-9999"/></label>
    </div><p className="cv-form-hint">O CPF é opcional. Pessoas com o mesmo nome podem ser cadastradas; e-mail ou telefone já usados no condomínio pedem revisão antes de um novo cadastro.</p></div>
    {error && <p className="cv-alert cv-alert-error" role="alert">{error}</p>}
    <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Cadastrar pessoa"}</Button>
  </form>;
}

export function PersonRelationshipForm({ people, units, kind, returnTo, selectedPersonId, defaultUnitId }: { people: { id: string; full_name: string }[]; units: { id: string; code: string; display_name: string | null; operational_status: string }[]; kind: PersonRelationshipKind; returnTo: string; selectedPersonId?: string; defaultUnitId?: string }) {
  return <ConfirmedRelationshipForm action={addPersonRelationship} className="cv-form cv-inline-form" confirmPrimary={kind === "occupancy"}>
    <input type="hidden" name="kind" value={kind}/>
    <input type="hidden" name="return_to" value={returnTo}/>
    {selectedPersonId&&<p className="cv-form-hint" role="status">Pessoa cadastrada e selecionada. Complete os dados do vínculo.</p>}
    <div className="cv-form-grid">
      <PersonPicker people={people} kind={kind} returnTo={returnTo} selectedPersonId={selectedPersonId}/>
      <label className="cv-field-auto">Unidade<select name="unit_id" required defaultValue={defaultUnitId||""}><option value="" disabled>Selecione</option>{units.map((u)=><option key={u.id} value={u.id} disabled={u.operational_status==="inactive" || kind==="occupancy" && u.operational_status==="under_construction"}>{u.display_name || u.code}{u.operational_status==="blocked"?" · Bloqueada":""}</option>)}</select></label>
      {kind === "ownership" && <label className="cv-field-md">Participação (%)<input name="ownership_percentage" type="number" min="0.0001" max="100" step="0.0001" placeholder="Não informada"/></label>}
      {kind === "occupancy" && <label className="cv-field-auto">Tipo de moradia<select name="occupancy_type" defaultValue="tenant"><option value="owner">Proprietário</option><option value="tenant">Inquilino</option><option value="family_member">Familiar</option><option value="dependent">Dependente</option><option value="other">Outro</option></select></label>}
      {kind === "occupancy" && <label className="cv-checkbox-label"><input type="checkbox" name="is_primary" value="true"/> Morador principal</label>}
      <label className="cv-field-md">Início da vigência<input type="date" name="starts_at" required/></label>
      {kind !== "financial" && <label className="cv-field-md">Término (opcional)<input type="date" name="ends_at"/></label>}
      <label className="cv-form-wide">Observações<input name="notes" maxLength={1000}/></label>
    </div>
    {kind === "occupancy" && <p className="cv-form-hint">A data final é exclusiva: com término em 01/11, o vínculo vale até 31/10. Um único morador principal pode estar vigente em cada data.</p>}
    {kind === "ownership" && <p className="cv-form-hint">A soma das participações conhecidas não pode ultrapassar 100% nos períodos sobrepostos. Deixe em branco quando a participação não estiver informada.</p>}
    <RelationshipSubmitButton />
  </ConfirmedRelationshipForm>;
}

export function PersonEditForm({ person }: { person: { id:string; full_name:string; preferred_name:string|null; birth_date:string|null; status:string } }) {
  return <form action={updatePerson} className="cv-form"><input type="hidden" name="person_id" value={person.id}/><div className="cv-form-grid">
    <label className="cv-field-lg">Nome completo<input name="full_name" required defaultValue={person.full_name}/></label><label className="cv-field-lg">Nome preferencial<input name="preferred_name" defaultValue={person.preferred_name||""}/></label>
    <label className="cv-field-md">Data de nascimento<input name="birth_date" type="date" defaultValue={person.birth_date||""}/></label><label className="cv-field-auto">Situação<select name="status" defaultValue={person.status}><option value="active">Ativa</option><option value="inactive">Inativa</option><option value="suspended">Suspensa</option><option value="archived">Arquivada</option></select></label>
  </div><Button type="submit">Salvar dados</Button></form>;
}

export function PersonCpfForm({ personId, currentCpf }: { personId:string; currentCpf:string|null }) {
  const [error, setError] = useState("");
  return <form action={setPersonCpf} className="cv-form" onSubmit={(event) => { const cpf = String(new FormData(event.currentTarget).get("cpf") || ""); const message = cpf && !validatePersonFields({ fullName: "Pessoa", cpf }).cpf ? "" : "Informe um CPF válido."; setError(message); if (message) event.preventDefault(); }}><input type="hidden" name="person_id" value={personId}/><div className="cv-form-grid"><label className="cv-field-md">Novo CPF<input name="cpf" inputMode="numeric" required placeholder="000.000.000-00" maxLength={14}/></label><label className="cv-checkbox-label"><input name="confirm" type="checkbox" value="yes" required/> Confirmo a alteração do documento</label></div>{error && <p className="cv-alert cv-alert-error" role="alert">{error}</p>}<p className="cv-form-hint">{currentCpf?"O documento anterior será preservado no histórico e não será exibido após a troca.":"A inclusão será registrada no histórico."} Um CPF que pertence a outra identidade não pode ser usado.</p><Button variant="secondary" type="submit">{currentCpf?"Alterar CPF":"Adicionar CPF"}</Button></form>;
}

export function PersonContactForms({ personId, emails, phones, canManage }: {
  personId:string;
  emails:{id:string;email:string;is_primary:boolean;is_verified:boolean}[];
  phones:{id:string;phone_e164:string;phone_type:string;is_primary:boolean;is_verified:boolean;is_whatsapp:boolean}[];
  canManage:boolean;
}) {
  if(!canManage)return null;
  return <section className="cv-panel"><h2>Editar contatos</h2><p className="cv-muted">A alteração remove a verificação do contato editado. Os contatos existentes são mantidos no histórico operacional; não há exclusão nesta tela.</p>
    <div className="cv-contact-editors">
      {emails.map((email)=><ContactForm key={email.id} personId={personId} contactType="email" contactId={email.id} value={email.email} kind="email" isPrimary={email.is_primary} isWhatsapp={false}/>)}
      {phones.map((phone)=><ContactForm key={phone.id} personId={personId} contactType="phone" contactId={phone.id} value={phone.phone_e164} kind={phone.phone_type} isPrimary={phone.is_primary} isWhatsapp={phone.is_whatsapp}/>)}
      <ContactForm personId={personId} contactType="email" value="" kind="email" isPrimary={emails.length===0} isWhatsapp={false}/>
      <ContactForm personId={personId} contactType="phone" value="" kind="mobile" isPrimary={phones.length===0} isWhatsapp={false}/>
    </div>
  </section>;
}

function ContactForm({personId,contactType,contactId,value,kind,isPrimary,isWhatsapp}:{personId:string;contactType:"email"|"phone";contactId?:string;value:string;kind:string;isPrimary:boolean;isWhatsapp:boolean}) {
  const [error, setError] = useState("");
  return <form action={savePersonContact} className="cv-contact-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); const contact = String(form.get("value") || ""); const errors = validatePersonFields({ fullName: "Pessoa", email: contactType === "email" ? contact : "", phone: contactType === "phone" ? contact : "" }); const message = errors.email || errors.phone || ""; setError(message); if (message) event.preventDefault(); }}><input type="hidden" name="person_id" value={personId}/><input type="hidden" name="contact_id" value={contactId||""}/><input type="hidden" name="contact_type" value={contactType}/>
    <label className={contactType==="email"?"cv-field-lg":"cv-field-md"}>{contactType==="email"?"E-mail":"Telefone (E.164)"}<input name="value" required type={contactType==="email"?"email":"tel"} inputMode={contactType==="email"?undefined:"tel"} placeholder={contactType==="email"?"nome@exemplo.com":"+5511999999999"} defaultValue={value}/></label>
    {contactType==="phone"&&<label className="cv-field-auto">Tipo<select name="kind" defaultValue={kind}><option value="mobile">Celular</option><option value="landline">Fixo</option><option value="work">Comercial</option><option value="other">Outro</option></select></label>}
    <label className="cv-checkbox-label"><input name="is_primary" type="checkbox" value="yes" defaultChecked={isPrimary}/> Principal</label>
    {contactType==="phone"&&<label className="cv-checkbox-label"><input name="is_whatsapp" type="checkbox" value="yes" defaultChecked={isWhatsapp}/> WhatsApp</label>}
    {error && <p className="cv-alert cv-alert-error" role="alert">{error}</p>}
    <Button variant="secondary" size="compact" type="submit">{contactId?"Salvar contato":"Adicionar contato"}</Button>
  </form>;
}

export function ResidentInviteForm({ personId, emails, canInvite }: { personId:string; emails:{email:string;is_primary:boolean}[]; canInvite:boolean }) {
  if(!canInvite)return null;
  const ordered=[...emails].sort((a,b)=>Number(b.is_primary)-Number(a.is_primary));
  return <section className="cv-panel"><h2>Convidar para acesso residente</h2>
    {!ordered.length?<p className="cv-muted">Cadastre um e-mail antes de enviar o convite.</p>:<form action={inviteResident} className="cv-form cv-inline-form"><input type="hidden" name="person_id" value={personId}/><div className="cv-form-grid"><label className="cv-field-lg">E-mail do convite<select name="email" required defaultValue={ordered[0].email}>{ordered.map((item)=><option value={item.email} key={item.email}>{item.email}{item.is_primary?" · Principal":""}</option>)}</select></label></div><p className="cv-form-hint">Convite disponível somente para pessoa ativa com vínculo de propriedade ou moradia vigente/futuro neste condomínio. Responsabilidade financeira isolada não habilita acesso.</p><Button type="submit">Enviar convite</Button></form>}
  </section>;
}
