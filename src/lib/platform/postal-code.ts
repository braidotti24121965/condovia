import { normalizePostalCode } from "@/lib/condominium/format";

export type BrazilianAddress = { street: string; district: string; city: string; state: string };
type ViaCepResponse = { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };

const cache = new Map<string, BrazilianAddress | null>();

export function parseViaCepResponse(data: ViaCepResponse): BrazilianAddress | null {
  if (data.erro) return null;
  return { street: data.logradouro ?? "", district: data.bairro ?? "", city: data.localidade ?? "", state: data.uf ?? "" };
}

export async function lookupBrazilianPostalCode(value: string): Promise<BrazilianAddress | null> {
  const cep = normalizePostalCode(value);
  if (cep.length !== 8) return null;
  if (cache.has(cep)) return cache.get(cep) ?? null;
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("postal-code-service-unavailable");
  const address = parseViaCepResponse(await response.json() as ViaCepResponse);
  cache.set(cep, address);
  return address;
}
