"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ContentSelect, FormattedInput } from "@/components/ui/form-controls";
export type Provider = { id: string; full_name: string; company_name: string | null; document_type: string | null; document_number: string | null; phone: string | null; email: string | null; address: string | null; service_type: string | null; status: string };
export function ProviderFields({ item }: { item?: Provider }) {
  const [documentType, setDocumentType] = useState(item?.document_type ?? "cnpj");
  return <>{item && <input type="hidden" name="id" value={item.id} />}
    <label className="cv-field-md">Nome do profissional ou fornecedor<input name="full_name" defaultValue={item?.full_name} required minLength={2} maxLength={180} /></label>
    <label className="cv-field-md">Empresa / razão social<input name="company_name" defaultValue={item?.company_name ?? ""} /></label>
    <label className="cv-field-sm">Documento<ContentSelect name="document_type" value={documentType} onChange={event => setDocumentType(event.target.value)}><option value="cnpj">CNPJ</option><option value="cpf">CPF</option><option value="rg">RG</option><option value="cnh">CNH</option><option value="other">Outro</option></ContentSelect></label>
    <label className="cv-field-document" style={{ "--cv-document-width": documentType === "cpf" ? "18ch" : documentType === "cnpj" ? "26ch" : "34ch" } as React.CSSProperties}>Número do documento<FormattedInput key={documentType} name="document_number" format={documentType === "cnpj" || documentType === "cpf" ? documentType : "text"} defaultValue={documentType === (item?.document_type ?? "cnpj") ? item?.document_number ?? "" : ""} maxLength={30} /></label>
    <label className="cv-field-phone">Telefone<FormattedInput name="phone" format="phone" defaultValue={item?.phone ?? ""} autoComplete="tel-national" /></label>
    <label className="cv-field-md">E-mail<FormattedInput name="email" format="email" defaultValue={item?.email ?? ""} autoComplete="email" /></label>
    <label className="cv-form-wide">Endereço<input name="address" defaultValue={item?.address ?? ""} /></label>
    <label className="cv-field-md">Especialidade<input name="service_type" defaultValue={item?.service_type ?? ""} /></label>
    <label className="cv-field-sm">Situação<ContentSelect name="status" defaultValue={item?.status ?? "active"}><option value="active">Ativo</option><option value="inactive">Inativo</option></ContentSelect></label>
    <div className="cv-form-actions"><Button type="submit">{item ? "Salvar fornecedor" : "Cadastrar fornecedor"}</Button></div>
  </>;
}
