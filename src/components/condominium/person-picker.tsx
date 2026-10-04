"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PersonRelationshipKind } from "@/lib/condominium/person-return";

type PersonOption = { id: string; full_name: string };

export function PersonPicker({
  people,
  kind,
  returnTo,
  selectedPersonId,
}: {
  people: PersonOption[];
  kind: PersonRelationshipKind;
  returnTo: string;
  selectedPersonId?: string;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(selectedPersonId || "");
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("pt-BR");
    const matches = people.filter((person) => !needle || person.full_name.toLocaleLowerCase("pt-BR").includes(needle));
    if (selected && !matches.some((person) => person.id === selected)) {
      const active = people.find((person) => person.id === selected);
      return active ? [active, ...matches] : matches;
    }
    return matches;
  }, [people, search, selected]);
  const newPersonHref = `/app/condominium/people/new?returnTo=${encodeURIComponent(returnTo)}&relationship=${kind}`;

  return <div className="cv-person-picker">
    <label className="cv-field-lg">Buscar pessoa neste condomínio
      <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Digite o nome" autoComplete="off" aria-label="Buscar pessoa vinculada ao condomínio" />
    </label>
    <label className="cv-field-lg">Pessoa
      <select name="person_id" required value={selected} onChange={(event) => setSelected(event.target.value)}>
        <option value="" disabled>{filtered.length ? "Selecione uma pessoa" : "Nenhuma pessoa encontrada"}</option>
        {filtered.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
      </select>
    </label>
    <Link className="button button-outline" href={newPersonHref}>Cadastrar nova pessoa</Link>
  </div>;
}
