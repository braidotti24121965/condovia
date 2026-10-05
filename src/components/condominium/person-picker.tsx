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

  const selectedPerson = people.find((person) => person.id === selected);
  return <div className="cv-person-picker">
    <label className="cv-field-lg">Pessoa
      <input type="search" value={selectedPerson && !search ? selectedPerson.full_name : search} onChange={(event) => { const match = people.find((person) => person.full_name === event.target.value); setSelected(match?.id || ""); setSearch(match ? "" : event.target.value); }} placeholder="Digite o nome para buscar" autoComplete="off" list="person-options" role="combobox" aria-autocomplete="list" aria-controls="person-options" aria-expanded="false" aria-label="Buscar pessoa vinculada ao condomínio" required />
      <datalist id="person-options">{filtered.map((person) => <option key={person.id} value={person.full_name} />)}</datalist>
      <input type="hidden" name="person_id" value={selected} />
    </label>
    {selectedPerson && <p className="cv-form-hint" role="status">Selecionado: {selectedPerson.full_name}</p>}
    <Link className="button button-outline" href={newPersonHref}>Cadastrar nova pessoa</Link>
  </div>;
}
