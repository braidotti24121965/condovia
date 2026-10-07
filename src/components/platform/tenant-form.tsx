"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Alert } from "@/components/ui/feedback";
import { formatBrazilianCnpj, formatBrazilianPhone, formatBrazilianPostalCode, normalizePostalCode } from "@/lib/condominium/format";
import { createTenant } from "@/lib/platform/actions";
import { initialTenantState, tenantFieldNames, validateTenantValues, type TenantFieldErrors, type TenantFieldName, type TenantFormValues } from "@/lib/platform/tenant-form";
import { lookupBrazilianPostalCode } from "@/lib/platform/postal-code";
import { Button } from "@/components/ui/button";

const fieldOrder: TenantFieldName[] = [...tenantFieldNames];

export function TenantForm() {
  const [state, formAction, pending] = useActionState(createTenant, initialTenantState);
  const [values, setValues] = useState<TenantFormValues>(state.values);
  const [clientErrors, setClientErrors] = useState<TenantFieldErrors>({});
  const [postalStatus, setPostalStatus] = useState("");
  const lastPostalCode = useRef("");
  const errors = { ...state.fieldErrors, ...clientErrors };

  const focusFirstError = (fieldErrors: TenantFieldErrors) => {
    const name = fieldOrder.find((field) => fieldErrors[field]);
    if (!name) return;
    requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(`[name="${name}"]`);
      element?.focus();
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  useEffect(() => {
    setValues(state.values);
    focusFirstError(state.fieldErrors);
  }, [state]);

  const update = (name: TenantFieldName, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setClientErrors((current) => ({ ...current, [name]: undefined }));
  };

  const lookupPostalCode = async (maskedValue: string) => {
    const cep = normalizePostalCode(maskedValue);
    if (cep.length !== 8 || cep === lastPostalCode.current) return;
    lastPostalCode.current = cep;
    setPostalStatus("Consultando CEP…");
    try {
      const address = await lookupBrazilianPostalCode(cep);
      if (!address) {
        setClientErrors((current) => ({ ...current, postal_code: "Informe um CEP válido." }));
        setPostalStatus("");
        return;
      }
      setValues((current) => ({ ...current, street: address.street, district: address.district, city: address.city, state: address.state }));
      setPostalStatus("Endereço preenchido. Você pode ajustar os dados.");
    } catch {
      lastPostalCode.current = "";
      setPostalStatus("Não foi possível consultar o CEP. Preencha o endereço manualmente.");
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    const validation = validateTenantValues(values);
    if (!Object.keys(validation).length) return;
    event.preventDefault();
    setClientErrors(validation);
    focusFirstError(validation);
  };

  const fieldProps = (name: TenantFieldName) => ({
    name,
    value: values[name],
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    onChange: (event: ChangeEvent<HTMLInputElement>) => update(name, event.target.value),
  });
  const error = (name: TenantFieldName) => errors[name] && <span className="cv-field-error" id={`${name}-error`} role="alert">{errors[name]}</span>;

  return <form action={formAction} className="cv-form" noValidate onSubmit={submit}>
    {state.message && <Alert tone="error">{state.message}</Alert>}
    <div className="cv-form-section"><h3>Cliente</h3><div className="cv-form-grid">
      <label className="cv-field-lg">Nome legal do cliente<input {...fieldProps("client_legal_name")} autoComplete="organization"/>{error("client_legal_name")}</label>
    </div></div>
    <div className="cv-form-section"><h3>Condomínio</h3><div className="cv-form-grid">
      <label className="cv-field-lg">Nome<input {...fieldProps("condominium_name")}/>{error("condominium_name")}</label>
      <label className="cv-field-lg">Razão social<input {...fieldProps("condominium_legal_name")}/>{error("condominium_legal_name")}</label>
      <div className="cv-semantic-row">
        <label className="cv-width-document">CNPJ<input {...fieldProps("document_number")} inputMode="numeric" placeholder="00.000.000/0000-00" onChange={(event) => update("document_number", formatBrazilianCnpj(event.target.value))}/>{error("document_number")}</label>
        <label className="cv-width-medium">Tipo<select name="condominium_type" value={values.condominium_type} onChange={(event) => update("condominium_type", event.target.value)} aria-invalid={Boolean(errors.condominium_type)} aria-describedby={errors.condominium_type ? "condominium_type-error" : undefined}><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option><option value="mixed">Misto</option><option value="other">Outro</option></select>{error("condominium_type")}</label>
        <label className="cv-width-flexible">E-mail institucional<input {...fieldProps("condominium_email")} type="email" autoComplete="email"/>{error("condominium_email")}</label>
        <label className="cv-width-phone">Telefone<input {...fieldProps("condominium_phone")} type="tel" autoComplete="tel" inputMode="tel" placeholder="(00) 00000-0000" onChange={(event) => update("condominium_phone", formatBrazilianPhone(event.target.value))}/>{error("condominium_phone")}</label>
      </div>
      <label className="cv-field-lg">Fuso horário IANA<input {...fieldProps("timezone")}/>{error("timezone")}</label>
    </div></div>
    <div className="cv-form-section"><h3>Endereço (opcional)</h3><div className="cv-address-layout">
      <div className="cv-semantic-row">
        <label className="cv-width-compact">CEP<input {...fieldProps("postal_code")} inputMode="numeric" placeholder="00000-000" onChange={(event) => { const masked = formatBrazilianPostalCode(event.target.value); update("postal_code", masked); void lookupPostalCode(masked); }}/>{error("postal_code")}<span className="cv-field-status" aria-live="polite">{postalStatus}</span></label>
        <label className="cv-width-flexible">Logradouro<input {...fieldProps("street")} autoComplete="street-address"/>{error("street")}</label>
        <label className="cv-width-compact">Número<input {...fieldProps("number")}/>{error("number")}</label>
      </div>
      <div className="cv-semantic-row">
        <label className="cv-width-flexible">Complemento<input {...fieldProps("complement")}/>{error("complement")}</label>
        <label className="cv-width-flexible">Bairro<input {...fieldProps("district")}/>{error("district")}</label>
        <label className="cv-width-flexible">Cidade<input {...fieldProps("city")} autoComplete="address-level2"/>{error("city")}</label>
        <label className="cv-width-compact">Estado<input {...fieldProps("state")} autoComplete="address-level1" maxLength={60}/>{error("state")}</label>
        <label className="cv-width-code">País<input {...fieldProps("country_code")} autoComplete="country" maxLength={2}/>{error("country_code")}</label>
      </div>
    </div><p className="cv-form-hint">Se qualquer endereço for informado, logradouro, cidade e estado serão obrigatórios.</p></div>
    <div className="cv-form-section"><h3>Administrador inicial</h3><div className="cv-semantic-row">
      <label className="cv-width-flexible">Nome completo<input {...fieldProps("admin_name")} autoComplete="name"/>{error("admin_name")}</label>
      <label className="cv-width-flexible">E-mail<input {...fieldProps("admin_email")} type="email" autoComplete="email"/>{error("admin_email")}</label>
      <label className="cv-width-phone">Telefone (opcional)<input {...fieldProps("admin_phone")} type="tel" autoComplete="tel" inputMode="tel" placeholder="(00) 00000-0000" onChange={(event) => update("admin_phone", formatBrazilianPhone(event.target.value))}/>{error("admin_phone")}</label>
    </div><p className="cv-form-hint">O convidado ativará as próprias credenciais e receberá exclusivamente a role condominium.syndic.</p></div>
    <Button type="submit" disabled={pending}>{pending ? "Criando tenant…" : "Criar tenant e enviar convite"}</Button>
  </form>;
}
