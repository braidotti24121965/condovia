import { addPersonRelationship, inviteResident, savePerson, savePersonContact, setPersonCpf, updatePerson } from "@/lib/condominium/actions";
import { ConfirmedRelationshipForm } from "@/components/condominium/confirmed-relationship-form";
import { PersonPicker } from "@/components/condominium/person-picker";
import type { PersonRelationshipKind } from "@/lib/condominium/person-return";

export function PersonForm({ returnPath = "", returnKind = "" }: { returnPath?: string; returnKind?: string }) {
  return <form action={savePerson} className="cv-form">
    {returnPath && returnKind && <><input type="hidden" name="return_path" value={returnPath}/><input type="hidden" name="return_kind" value={returnKind}/></>}
    <div className="cv-form-section"><h2>Identificação</h2><div className="cv-form-grid">
      <label>Nome completo<input name="full_name" required minLength={2} maxLength={180} autoComplete="name"/></label>
      <label>Nome preferencial<input name="preferred_name" maxLength={120} autoComplete="nickname"/></label>
      <label>Data de nascimento<input type="date" name="birth_date"/></label>
      <label>CPF (opcional)<input name="cpf" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00"/></label>
    </div></div>
    <div className="cv-form-section"><h2>Contato</h2><div className="cv-form-grid">
      <label>E-mail<input type="email" name="email" autoComplete="email" maxLength={254}/></label>
      <label>Telefone<input type="tel" name="phone" autoComplete="tel" maxLength={20} placeholder="+55 11 99999-9999"/></label>
    </div><p className="cv-form-hint">O CPF é opcional. Pessoas com o mesmo nome podem ser cadastradas; e-mail ou telefone já usados no condomínio pedem revisão antes de um novo cadastro.</p></div>
    <button className="button button-primary" type="submit">Cadastrar pessoa</button>
  </form>;
}

export function PersonRelationshipForm({ people, units, kind, returnTo, selectedPersonId, defaultUnitId }: { people: { id: string; full_name: string }[]; units: { id: string; code: string; display_name: string | null; operational_status: string }[]; kind: PersonRelationshipKind; returnTo: string; selectedPersonId?: string; defaultUnitId?: string }) {
  return <ConfirmedRelationshipForm action={addPersonRelationship} className="cv-form cv-inline-form" confirmPrimary={kind === "occupancy"}>
    <input type="hidden" name="kind" value={kind}/>
    {selectedPersonId&&<p className="cv-form-hint" role="status">Pessoa cadastrada e selecionada. Complete os dados do vínculo.</p>}
    <div className="cv-form-grid">
      <PersonPicker people={people} kind={kind} returnTo={returnTo} selectedPersonId={selectedPersonId}/>
      <label>Unidade<select name="unit_id" required defaultValue={defaultUnitId||""}><option value="" disabled>Selecione</option>{units.map((u)=><option key={u.id} value={u.id} disabled={u.operational_status==="inactive" || kind==="occupancy" && u.operational_status==="under_construction"}>{u.display_name || u.code}{u.operational_status==="blocked"?" · Bloqueada":""}</option>)}</select></label>
      {kind === "ownership" && <label>Participação (%)<input name="ownership_percentage" type="number" min="0.0001" max="100" step="0.0001" placeholder="Não informada"/></label>}
      {kind === "occupancy" && <label>Tipo de moradia<select name="occupancy_type" defaultValue="tenant"><option value="owner">Proprietário</option><option value="tenant">Inquilino</option><option value="family_member">Familiar</option><option value="dependent">Dependente</option><option value="other">Outro</option></select></label>}
      {kind === "occupancy" && <label className="cv-checkbox-label"><input type="checkbox" name="is_primary" value="true"/> Morador principal</label>}
      <label>Início da vigência<input type="date" name="starts_at" required/></label>
      {kind !== "financial" && <label>Término (opcional)<input type="date" name="ends_at"/></label>}
      <label className="cv-form-wide">Observações<input name="notes" maxLength={1000}/></label>
    </div>
    {kind === "occupancy" && <p className="cv-form-hint">A data final é exclusiva: com término em 01/11, o vínculo vale até 31/10. Um único morador principal pode estar vigente em cada data.</p>}
    {kind === "ownership" && <p className="cv-form-hint">A soma das participações conhecidas não pode ultrapassar 100% nos períodos sobrepostos. Deixe em branco quando a participação não estiver informada.</p>}
    <button className="button button-primary" type="submit">Adicionar vínculo</button>
  </ConfirmedRelationshipForm>;
}

export function PersonEditForm({ person }: { person: { id:string; full_name:string; preferred_name:string|null; birth_date:string|null; status:string } }) {
  return <form action={updatePerson} className="cv-form"><input type="hidden" name="person_id" value={person.id}/><div className="cv-form-grid">
    <label>Nome completo<input name="full_name" required defaultValue={person.full_name}/></label><label>Nome preferencial<input name="preferred_name" defaultValue={person.preferred_name||""}/></label>
    <label>Data de nascimento<input name="birth_date" type="date" defaultValue={person.birth_date||""}/></label><label>Situação<select name="status" defaultValue={person.status}><option value="active">Ativa</option><option value="inactive">Inativa</option><option value="suspended">Suspensa</option><option value="archived">Arquivada</option></select></label>
  </div><button className="button button-primary" type="submit">Salvar dados</button></form>;
}

export function PersonCpfForm({ personId, currentCpf }: { personId:string; currentCpf:string|null }) {
  return <form action={setPersonCpf} className="cv-form"><input type="hidden" name="person_id" value={personId}/><div className="cv-form-grid"><label>Novo CPF<input name="cpf" inputMode="numeric" required placeholder="000.000.000-00"/></label><label className="cv-checkbox-label"><input name="confirm" type="checkbox" value="yes" required/> Confirmo a alteração do documento</label></div><p className="cv-form-hint">{currentCpf?"O documento anterior será preservado no histórico e não será exibido após a troca.":"A inclusão será registrada no histórico."} Um CPF que pertence a outra identidade não pode ser usado.</p><button className="button button-secondary" type="submit">{currentCpf?"Alterar CPF":"Adicionar CPF"}</button></form>;
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
  return <form action={savePersonContact} className="cv-contact-form"><input type="hidden" name="person_id" value={personId}/><input type="hidden" name="contact_id" value={contactId||""}/><input type="hidden" name="contact_type" value={contactType}/>
    <label>{contactType==="email"?"E-mail":"Telefone (E.164)"}<input name="value" required type={contactType==="email"?"email":"tel"} inputMode={contactType==="email"?undefined:"tel"} placeholder={contactType==="email"?"nome@exemplo.com":"+5511999999999"} defaultValue={value}/></label>
    {contactType==="phone"&&<label>Tipo<select name="kind" defaultValue={kind}><option value="mobile">Celular</option><option value="landline">Fixo</option><option value="work">Comercial</option><option value="other">Outro</option></select></label>}
    <label className="cv-checkbox-label"><input name="is_primary" type="checkbox" value="yes" defaultChecked={isPrimary}/> Principal</label>
    {contactType==="phone"&&<label className="cv-checkbox-label"><input name="is_whatsapp" type="checkbox" value="yes" defaultChecked={isWhatsapp}/> WhatsApp</label>}
    <button className="button button-outline button-small" type="submit">{contactId?"Salvar contato":"Adicionar contato"}</button>
  </form>;
}

export function ResidentInviteForm({ personId, emails, canInvite }: { personId:string; emails:{email:string;is_primary:boolean}[]; canInvite:boolean }) {
  if(!canInvite)return null;
  const ordered=[...emails].sort((a,b)=>Number(b.is_primary)-Number(a.is_primary));
  return <section className="cv-panel"><h2>Convidar para acesso residente</h2>
    {!ordered.length?<p className="cv-muted">Cadastre um e-mail antes de enviar o convite.</p>:<form action={inviteResident} className="cv-form cv-inline-form"><input type="hidden" name="person_id" value={personId}/><div className="cv-form-grid"><label>E-mail do convite<select name="email" required defaultValue={ordered[0].email}>{ordered.map((item)=><option value={item.email} key={item.email}>{item.email}{item.is_primary?" · Principal":""}</option>)}</select></label></div><p className="cv-form-hint">Convite disponível somente para pessoa ativa com vínculo de propriedade ou moradia vigente/futuro neste condomínio. Responsabilidade financeira isolada não habilita acesso.</p><button className="button button-primary" type="submit">Enviar convite</button></form>}
  </section>;
}
