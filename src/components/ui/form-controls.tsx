"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { CalendarDays } from "lucide-react";
import { formatBrazilianCnpj, formatBrazilianCpf, formatBrazilianPhone } from "@/lib/condominium/format";
import { civilDateToIso, formatCivilDateInput, isoToCivilDate } from "@/lib/condominium/formats";

/** Sizes the box to its longest option, including placeholder, font, arrow and padding. */
export function ContentSelect({ children, className = "", style, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const ref = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const css = getComputedStyle(element);
      const canvas = document.createElement("canvas").getContext("2d");
      if (!canvas) return;
      canvas.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
      const width = Math.max(canvas.measureText(element.name === "equipment_id" ? "Selecione o equipamento" : "").width, ...Array.from(element.options, option => canvas.measureText(option.text).width), 0);
      element.style.width = `${Math.ceil(width + parseFloat(css.paddingLeft) + parseFloat(css.paddingRight) + 28)}px`;
    };
    measure();
    void document.fonts.ready.then(measure);
    const observer = new MutationObserver(measure);
    observer.observe(element, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [children]);
  return <select {...props} ref={ref} className={`cv-content-select ${className}`} style={{ ...style, maxWidth: "100%" }}>{children}</select>;
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "type"> & { defaultValue?: string; format: "cnpj" | "cpf" | "phone" | "email" | "text" };
export function FormattedInput({ format, defaultValue = "", onChange, onBlur, ...props }: InputProps) {
  const mask = (value: string) => format === "cnpj" ? formatBrazilianCnpj(value) : format === "cpf" ? formatBrazilianCpf(value) : format === "phone" ? formatBrazilianPhone(value) : value;
  const [value, setValue] = useState(() => mask(defaultValue));
  return <input placeholder={format === "cnpj" ? "00.000.000/0000-00" : format === "cpf" ? "000.000.000-00" : format === "phone" ? "(11) 99999-9999" : format === "email" ? "nome@dominio.com.br" : undefined}
    autoCapitalize="none" autoCorrect="off" {...props} type={format === "email" ? "email" : format === "phone" ? "tel" : "text"}
    inputMode={format === "phone" || format === "cpf" ? "numeric" : format === "email" ? "email" : "text"}
    maxLength={format === "phone" ? 15 : format === "cpf" ? 14 : format === "cnpj" ? 18 : props.maxLength}
    pattern={format === "phone" ? "\\([0-9]{2}\\) [0-9]{4,5}-[0-9]{4}" : undefined}
    title={format === "phone" ? "Informe DDD e telefone: (11) 99999-9999" : undefined}
    value={value} onChange={event => { event.target.value = mask(event.target.value); setValue(event.target.value); onChange?.(event); }}
    onBlur={event => { if (format === "email") { event.target.value = event.target.value.trim().toLowerCase(); setValue(event.target.value); } onBlur?.(event); }} />;
}

export function DateInput({ name, defaultValue = "", required, disabled, className = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange"> & { defaultValue?: string }) {
  const [display, setDisplay] = useState(() => isoToCivilDate(defaultValue));
  const text = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const iso = civilDateToIso(display);
  useEffect(() => { text.current?.setCustomValidity(display && !iso ? "Informe uma data válida no formato dd/mm/aaaa." : ""); }, [display, iso]);
  return <span className="cv-date-control">
    <input {...props} ref={text} className={className} type="text" inputMode="numeric" placeholder="dd/mm/aaaa" maxLength={10} required={required} disabled={disabled} value={display} onChange={event => setDisplay(formatCivilDateInput(event.target.value))} />
    <input type="hidden" name={name} value={iso} disabled={disabled} />
    <button type="button" className="cv-date-picker-button" aria-label="Abrir calendário" disabled={disabled} onClick={() => { if (picker.current?.showPicker) picker.current.showPicker(); else picker.current?.focus(); }}><CalendarDays size={17} /></button>
    <input ref={picker} className="cv-date-native" type="date" lang="pt-BR" aria-label="Selecionar data no calendário" tabIndex={-1} value={iso} disabled={disabled} min={props.min} max={props.max} onChange={event => setDisplay(isoToCivilDate(event.target.value))} />
  </span>;
}
