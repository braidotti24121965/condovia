/**
 * Quem vota e com quantos votos, conforme o estatuto da associação:
 * - Cada lote ou unidade vale um voto (artigo 14).
 * - Em lote com mais de um titular, os coproprietários indicam um representante, que vota pelo lote.
 * - Um procurador pode representar um associado por assembleia, mas nunca mais de um (artigo 13, parágrafo segundo).
 */

export type Ownership = {
  personId: string;
  unitId: string;
  percentage: number;
};

export type Voter = {
  personId: string;
  votes: number;
  unitIds: string[];
};

/**
 * Chooses, for each unit, the single titular who votes for it: the one with the largest share.
 * Ties are left out, because the statute requires a written choice of representative in that case.
 */
export function votingUnitsByPerson(ownerships: Ownership[]): Voter[] {
  const byUnit = new Map<string, Ownership[]>();
  for (const row of ownerships) byUnit.set(row.unitId, [...(byUnit.get(row.unitId) ?? []), row]);

  const voters = new Map<string, Voter>();
  for (const [unitId, rows] of byUnit) {
    const top = Math.max(...rows.map((row) => row.percentage));
    const leaders = rows.filter((row) => row.percentage === top);
    if (leaders.length !== 1) continue;
    const personId = leaders[0].personId;
    const current = voters.get(personId) ?? { personId, votes: 0, unitIds: [] };
    voters.set(personId, { personId, votes: current.votes + 1, unitIds: [...current.unitIds, unitId] });
  }
  return [...voters.values()];
}

export type Proxy = {
  associateId: string;
  proxyId: string;
};

/** Applies proxies: the proxy receives the associate's votes. A proxy may not represent more than one associate. */
export function applyProxies(voters: Voter[], proxies: Proxy[]): Voter[] {
  const proxyCount = new Map<string, number>();
  for (const proxy of proxies) proxyCount.set(proxy.proxyId, (proxyCount.get(proxy.proxyId) ?? 0) + 1);
  const valid = proxies.filter((proxy) => proxyCount.get(proxy.proxyId) === 1);

  const result = new Map<string, Voter>();
  for (const voter of voters) {
    const proxy = valid.find((item) => item.associateId === voter.personId);
    const holder = proxy ? proxy.proxyId : voter.personId;
    const current = result.get(holder) ?? { personId: holder, votes: 0, unitIds: [] };
    result.set(holder, { personId: holder, votes: current.votes + voter.votes, unitIds: [...current.unitIds, ...voter.unitIds] });
  }
  return [...result.values()];
}
