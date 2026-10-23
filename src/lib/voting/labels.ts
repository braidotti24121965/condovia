import type { Convocation, VotingMatter } from "@/lib/voting/quorum";

export const assemblyMatterLabels: Record<VotingMatter, string> = {
  statute_change: "Alteração do estatuto",
  member_removal: "Destituição de membro",
  property_sale: "Alienação de imóvel",
  dissolution: "Dissolução",
  other: "Demais assuntos",
};

export const assemblyConvocationLabels: Record<Convocation, string> = {
  first: "Primeira convocação",
  second: "Segunda convocação",
};
