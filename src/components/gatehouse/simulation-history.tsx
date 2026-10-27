import { formatEventDateTimeInTimezone } from "@/lib/gatehouse/timezone";
export type SimulationRecord = { id: string; external_event_id: string; event_type: string; occurred_at: string; outcome: string; out_of_order: boolean };
const labels: Record<string, string> = { entry: "Entrada", exit: "Saída", denied: "Negação", record: "Registrado", record_denied: "Negado", record_inconsistent: "Inconsistente" };
export function SimulationHistory({ events, timeZone }: { events: SimulationRecord[]; timeZone: string }) {
  return <>
    <div className="cv-table-wrap cv-table-wrap--has-cards"><table className="cv-table"><thead><tr><th>Horário</th><th>Identificador</th><th>Evento</th><th>Resultado</th></tr></thead><tbody>{events.map(e => <tr key={e.id}><td>{formatEventDateTimeInTimezone(e.occurred_at, timeZone)}</td><td style={{ overflowWrap: "anywhere" }}>{e.external_event_id}</td><td>{labels[e.event_type]}</td><td>{labels[e.outcome]}{e.out_of_order ? " · Fora de ordem" : ""}</td></tr>)}</tbody></table></div>
    <div className="cv-person-cards">{events.map(e => <article className="cv-panel" key={e.id}>
      <h3>{labels[e.event_type]} · {labels[e.outcome]}</h3>
      <p>{formatEventDateTimeInTimezone(e.occurred_at, timeZone)}</p>
      <p style={{ overflowWrap: "anywhere" }}>Identificador: {e.external_event_id}</p>
      {e.out_of_order && <p>Evento fora de ordem</p>}
    </article>)}</div>
  </>;
}
