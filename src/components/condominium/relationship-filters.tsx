"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { q:string; structureId:string; unitId:string; occupancyType:string; mode:string; structures:{id:string;name:string}[]; units:{id:string;code:string;display_name:string|null}[]; occupancy:boolean };

export function RelationshipFilters({q,structureId,unitId,occupancyType,mode,structures,units,occupancy}:Props) {
  const router=useRouter(); const pathname=usePathname(); const [value,setValue]=useState(q);
  const quadras=[...new Set(units.map((unit)=>((unit.display_name||unit.code).match(/\bquadra\s+([a-z]+)/i)?.[1]||"").toUpperCase()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
  useEffect(()=>setValue(q),[q]);
  useEffect(()=>{
    const trimmed=value.trim();
    if(trimmed.length!==0&&trimmed.length<2)return;
    if(trimmed===q)return;
    const timer=window.setTimeout(()=>{const params=new URLSearchParams();if(trimmed)params.set("q",trimmed);if(structureId)params.set("structure",structureId);if(unitId)params.set("unit",unitId);if(occupancyType)params.set("type",occupancyType);if(mode)params.set("mode",mode);router.replace(`${pathname}?${params.toString()}`);},350);
    return ()=>window.clearTimeout(timer);
  },[value,q,structureId,unitId,occupancyType,mode,pathname,router]);
  return <form className="cv-filters v2-resident-filters" method="get"><label className="cv-search"><Search size={17}/><input name="q" value={value} onChange={(event)=>setValue(event.target.value)} placeholder="Buscar por nome, unidade ou estrutura" aria-label="Buscar por nome, unidade ou estrutura"/><span className="sr-only" aria-live="polite">{value.trim().length===1?"Digite mais um caractere para pesquisar.":""}</span></label><label>Estrutura<select name="structure" defaultValue={structureId}><option value="">Todas</option>{structures.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Quadra<select name="unit" defaultValue={unitId}><option value="">Todas</option>{quadras.map((quadra)=><option key={quadra} value={quadra}>{quadra}</option>)}</select></label>{occupancy&&<label>Tipo<select name="type" defaultValue={occupancyType}><option value="">Todos</option><option value="owner">Proprietário</option><option value="tenant">Inquilino</option><option value="family_member">Familiar</option><option value="dependent">Dependente</option><option value="other">Outro</option></select></label>}<label>Situação<select name="mode" defaultValue={mode}><option value="current">Vigente hoje</option><option value="future">Futuro</option><option value="ended">Encerrado</option><option value="all">Todos</option></select></label><Button variant="secondary" type="submit">Filtrar</Button></form>;
}
