"use client";

import { useActionState, useState, type FormEvent } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/submit-button";
import { addPersonRelationship, inviteResident, savePerson, savePersonContact, setPersonCpf, updatePerson } from "@/lib/condominium/actions";
import { ConfirmedRelationshipForm } from "@/components/condominium/confirmed-relationship-form";
import { PersonPicker } from "@/components/condominium/person-picker";
import type { PersonRelationshipKind } from "@/lib/condominium/person-return";
import { validatePersonFields } from "@/lib/condominium/person-validation";

export function PersonForm({ returnPath = "", returnKind = "" }: { returnPath?: string; returnKind?: string }) {
  const [state, formAction, pending] = useActionState(savePerson, { error: "" });
  const [clientError, setClientError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const readFields = (form: HTMLFormElement) => ({
    fullName: String(new FormData(form).get("full_name") || ""),
    preferredName: String(new FormData(form).get("preferred_name") || ""),
    birthDate: String(new FormData(form).get("birth_date") || ""),
    cpf: String(new FormData(form).get("cpf") || ""),
    email: String(new FormData(form).get("email") || ""),
    phone: String(new FormData(form).get("phone") || ""),
  });
  const validateField = (form: HTMLFormElement, field: string) => {
    const fields = readFields(form);
    const errors = validatePersonFields(fields);
    setFieldErrors((current) => ({ ...current, [field]: errors[field] || "" }));
    return errors[field] || "";
  };
  const error = clientError || state.error;
  return <form action={formAction} className="cv-form" onSubmit={(event) => {
    const validation = validatePersonFields(readFields(event.currentTarget));
    setFieldErrors(validation);
    setClientError(Object.values(validation)[0] || "");
    if (Object.keys(validation).length) event.preventDefault();
  }}>
    {returnPath && returnKind && <><input type="hidden" name="return_path" value={returnPath}/><input type="hidden" name="return_kind" value={returnKind}/></>}
    <div className="cv-form-section"><h2>Identificação</h2><div className="cv-form-grid">
      <label className="cv-field-lg">Nome completo<input name="full_name" required minLength={2} maxLength={180} autoComplete="name" onBlur={(event) => validateField(event.currentTarget.form!, "full_name")} onChange={() => setFieldErrors((current) => ({ ...current, full_name: "" }))}/>{fieldErrors.full_name && <FieldError message={fieldErrors.full_name}/>}</label>
      <label className="cv-field-lg">Nome preferencial<input name="preferred_name" maxLength={120} autoComplete="nickname" onBlur={(event) => validateField(event.currentTarget.form!, "preferred_name")} onChange={() => setFieldErrors((current) => ({ ...current, preferred_name: "" }))}/>{fieldErrors.preferred_name && <FieldError message={fieldErrors.preferred_name}/>}</label>
      <label className="cv-field-md">Data de nascimento<input type="text" name="birth_date" inputMode="numeric" placeholder="DD/MM/AAAA" maxLength={10} onChange={(event) => { event.currentTarget.value = formatBirthDate(event.currentTarget.value); validateField(event.currentTarget.form!, "birth_date"); }} onBlur={(event) => validateField(event.currentTarget.form!, "birth_date")}/>{fieldErrors.birth_date && <FieldError message={fieldErrors.birth_date}/>}</label>
      <label className="cv-field-md">CPF (opcional)<input name="cpf" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" maxLength={14} onChange={(event) => { event.currentTarget.value = formatCpf(event.currentTarget.value); validateField(event.currentTarget.form!, "cpf"); }} onBlur={(event) => validateField(event.currentTarget.form!, "cpf")}/>{fieldErrors.cpf && <FieldError message={fieldErrors.cpf}/>}</label>
    </div></div>
    <div className="cv-form-section"><h2>Contato</h2><div className="cv-form-grid">
      <label className="cv-field-lg">E-mail<input type="email" name="email" autoComplete="email" maxLength={254} onBlur={(event) => validateField(event.currentTarget.form!, "email")} onChange={(event) => validateField(event.currentTarget.form!, "email")}/>{fieldErrors.email && <FieldError message={fieldErrors.email}/>}</label>
      <label className="cv-field-md">Telefone<input type="tel" name="phone" autoComplete="tel" maxLength={19} placeholder="+55 (11) 99999-9999" onChange={(event) => { event.currentTarget.value = formatPhone(event.currentTarget.value); validateField(event.currentTarget.form!, "phone"); }} onBlur={(event) => validateField(event.currentTarget.form!, "phone")}/>{fieldErrors.phone && <FieldError message={fieldErrors.phone}/>}</label>
    </div><p className="cv-form-hint">O CPF é opcional. Pessoas com o mesmo nome podem ser cadastradas; e-mail ou telefone já usados no condomínio pedem revisão antes de um novo cadastro.</p></div>
    {error && <p className="cv-alert cv-alert-error" role="alert">{error}</p>}
    <SubmitButton type="submit" disabled={pending}>{pending ? "Salvando…" : "Cadastrar pessoa"}</SubmitButton>
  </form>;
}

function FieldError({ message }: { message: string }) {
  return <span className="cv-field-error" role="alert">{message}</span>;
}

function formatBirthDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{2})(\d)/, "$1/$2").replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
}

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^55/, "").slice(0, 11);
  if (!digits) return "";
  const area = digits.slice(0, 2);
  const number = digits.slice(2);
  return `+55${area ? ` (${area}${area.length === 2 ? ")" : ""}` : ""}${number ? ` ${number.slice(0, 5)}${number.length > 5 ? `-${number.slice(5)}` : ""}` : ""}`;
}

export function PersonRelationshipForm({ people, units, kind, returnTo, selectedPersonId, defaultUnitId }: { people: { id: string; full_name: string }[]; units: { id: string; code: string; display_name: string | null; operational_status: string }[]; kind: PersonRelationshipKind; returnTo: string; selectedPersonId?: string; defaultUnitId?: string }) {
  const [dateErrors, setDateErrors] = useState<Record<string, string>>({});
  const [occupancyType, setOccupancyType] = useState("tenant");
  const [state, formAction] = useActionState(addPersonRelationship, { error: "" });
  const formatRelationshipDate = (value: string) => { const digits = value.replace(/\D/g, "").slice(0, 8); return digits.replace(/^(\d{2})(\d)/, "$1/$2").replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3"); };
  const validateRelationshipDates = (event: FormEvent<HTMLFormElement>) => {
    const form = new FormData(event.currentTarget);
    const startsAt = String(form.get("starts_at") || ""); const endsAt = String(form.get("ends_at") || "");
    const errors: Record<string, string> = {};
    if (!form.get("person_id")) errors.person = "Selecione uma pessoa.";
    if (!form.get("unit_id")) errors.unit = "Selecione uma unidade.";
    if (!validatePersonFields({ fullName: "Pessoa", birthDate: startsAt }).birth_date) { /* valid */ } else errors.starts_at = "Informe uma data de início válida.";
    if (endsAt && validatePersonFields({ fullName: "Pessoa", birthDate: endsAt }).birth_date) errors.ends_at = "Informe uma data de término válida.";
    const startsIso = startsAt.split("/").reverse().join("-"); const endsIso = endsAt.split("/").reverse().join("-");
    if (endsAt && startsAt && endsIso <= startsIso) errors.ends_at = "A data de término deve ser posterior à data de início.";
    setDateErrors(errors); if (Object.keys(errors).length) event.preventDefault();
  };
  return <ConfirmedRelationshipForm action={formAction} className="cv-form cv-inline-form" confirmPrimary={kind === "occupancy"} onSubmit={validateRelationshipDates}>
    <input type="hidden" name="kind" value={kind}/>
    <input type="hidden" name="return_to" value={returnTo}/>
    {selectedPersonId&&<p className="cv-form-hint" role="status">Pessoa cadastrada e selecionada. Complete os dados do vínculo.</p>}
    <div className="cv-form-grid">
      <PersonPicker people={people} kind={kind} returnTo={returnTo} selectedPersonId={selectedPersonId}/>
      <label className="cv-field-auto">Unidade<select name="unit_id" required defaultValue={defaultUnitId||""}><option value="" disabled>Selecione</option>{units.map((u)=><option key={u.id} value={u.id} disabled={u.operational_status==="inactive" || kind==="occupancy" && u.operational_status==="under_construction"}>{u.display_name || u.code}{u.operational_status==="blocked"?" · Bloqueada":""}</option>)}</select>{dateErrors.unit && <FieldError message={dateErrors.unit}/>}</label>
      {kind === "ownership" && <label className="cv-field-md">Participação (%)<input name="ownership_percentage" type="number" min="0.0001" max="100" step="0.0001" placeholder="Não informada"/></label>}
      {kind === "occupancy" && <label className="cv-field-auto">Tipo de moradia<select name="occupancy_type" value={occupancyType} onChange={(event) => setOccupancyType(event.currentTarget.value)}><option value="owner">Proprietário</option><option value="tenant">Inquilino</option><option value="family_member">Familiar</option><option value="dependent">Dependente</option><option value="other">Outro</option></select></label>}
      {kind === "occupancy" && <label className="cv-checkbox-label"><input type="checkbox" name="is_primary" value="true"/> Morador principal</label>}
      <label className="cv-field-md">Início da vigência<input type="text" name="starts_at" inputMode="numeric" placeholder="DD/MM/AAAA" maxLength={10} required onChange={(event) => { event.currentTarget.value = formatRelationshipDate(event.currentTarget.value); }} />{dateErrors.starts_at && <FieldError message={dateErrors.starts_at}/>}</label>
      {kind !== "financial" && <label className="cv-field-md">Término (opcional)<input type="text" name="ends_at" inputMode="numeric" placeholder="DD/MM/AAAA" maxLength={10} onChange={(event) => { event.currentTarget.value = formatRelationshipDate(event.currentTarget.value); }} />{dateErrors.ends_at && <FieldError message={dateErrors.ends_at}/>}</label>}
      <label className="cv-form-wide">Observações<input name="notes" maxLength={1000}/></label>
    </div>
    {kind === "occupancy" && <p className="cv-form-hint">A data final é exclusiva: com término em 01/11, o vínculo vale até 31/10. Um único morador principal pode estar vigente em cada data.</p>}
    {kind === "occupancy" && occupancyType === "owner" && <p className="cv-form-hint" role="status">Para cadastrar como Proprietário, primeiro crie o vínculo de propriedade em <Link href="/app/condominium/owners">Proprietários</Link> para a mesma pessoa, unidade e período. Depois retorne a esta tela para registrar a moradia.</p>}
    {kind === "ownership" && <p className="cv-form-hint">A soma das participações conhecidas não pode ultrapassar 100% nos períodos sobrepostos. Deixe em branco quando a participação não estiver informada.</p>}
    {state.error && <p className="cv-alert cv-alert-error" role="alert">{state.error}</p>}
    <SubmitButton pendingLabel="Salvando...">Adicionar vínculo</SubmitButton>
  </ConfirmedRelationshipForm>;
}

export function PersonEditForm({ person }: { person: { id:string; full_name:string; preferred_name:string|null; birth_date:string|null; status:string } }) {
  return <form action={updatePerson} className="cv-form"><input type="hidden" name="person_id" value={person.id}/><div className="cv-form-grid">
    <label className="cv-field-lg">Nome completo<input name="full_name" required defaultValue={person.full_name}/></label><label className="cv-field-lg">Nome preferencial<input name="preferred_name" defaultValue={person.preferred_name||""}/></label>
    <label className="cv-field-md">Data de nascimento<input name="birth_date" type="date" defaultValue={person.birth_date||""}/></label><label className="cv-field-auto">Situação<select name="status" defaultValue={person.status}><option value="active">Ativa</option><option value="inactive">Inativa</option><option value="suspended">Suspensa</option><option value="archived">Arquivada</option></select></label>
  </div><SubmitButton type="submit">Salvar dados</SubmitButton></form>;
}

export function PersonCpfForm({ personId, currentCpf }: { personId:string; currentCpf:string|null }) {
  const [error, setError] = useState("");
  return <form action={setPersonCpf} className="cv-form" onSubmit={(event) => { const cpf = String(new FormData(event.currentTarget).get("cpf") || ""); const message = cpf && !validatePersonFields({ fullName: "Pessoa", cpf }).cpf ? "" : "Informe um CPF válido."; setError(message); if (message) event.preventDefault(); }}><input type="hidden" name="person_id" value={personId}/><div className="cv-form-grid"><label className="cv-field-md">Novo CPF<input name="cpf" inputMode="numeric" required placeholder="000.000.000-00" maxLength={14}/></label><label className="cv-checkbox-label"><input name="confirm" type="checkbox" value="yes" required/> Confirmo a alteração do documento</label></div>{error && <p className="cv-alert cv-alert-error" role="alert">{error}</p>}<p className="cv-form-hint">{currentCpf?"O documento anterior será preservado no histórico e não será exibido após a troca.":"A inclusão será registrada no histórico."} Um CPF que pertence a outra identidade não pode ser usado.</p><SubmitButton variant="secondary" type="submit">{currentCpf?"Alterar CPF":"Adicionar CPF"}</SubmitButton></form>;
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
    <SubmitButton variant="secondary" size="compact" type="submit">{contactId?"Salvar contato":"Adicionar contato"}</SubmitButton>
  </form>;
}

export function ResidentInviteForm({ personId, emails, canInvite }: { personId:string; emails:{email:string;is_primary:boolean}[]; canInvite:boolean }) {
  if(!canInvite)return null;
  const ordered=[...emails].sort((a,b)=>Number(b.is_primary)-Number(a.is_primary));
  return <section className="cv-panel"><h2>Convidar para acesso residente</h2>
    {!ordered.length?<p className="cv-muted">Cadastre um e-mail antes de enviar o convite.</p>:<form action={inviteResident} className="cv-form cv-inline-form"><input type="hidden" name="person_id" value={personId}/><div className="cv-form-grid"><label className="cv-field-lg">E-mail do convite<select name="email" required defaultValue={ordered[0].email}>{ordered.map((item)=><option value={item.email} key={item.email}>{item.email}{item.is_primary?" · Principal":""}</option>)}</select></label></div><p className="cv-form-hint">Convite disponível somente para pessoa ativa com vínculo de propriedade ou moradia vigente/futuro neste condomínio. Responsabilidade financeira isolada não habilita acesso.</p><SubmitButton type="submit" pendingLabel="Enviando...">Enviar convite</SubmitButton></form>}
  </section>;
}
