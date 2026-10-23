/**
 * Quórum e aprovação das assembleias da associação, conforme o artigo 11 do estatuto social.
 *
 * - Alteração do estatuto e destituição de membros: 2/3 dos presentes. Primeira convocação
 *   exige maioria absoluta dos associados; segunda convocação exige pelo menos 1/3 dos associados.
 * - Alienação de imóveis e dissolução: 2/3 dos presentes, com a presença da totalidade dos associados.
 * - Demais assuntos: maioria simples dos presentes.
 */

export type VotingMatter = "statute_change" | "member_removal" | "property_sale" | "dissolution" | "other";
export type Convocation = "first" | "second";

export type VoteCount = {
  matter: VotingMatter;
  convocation: Convocation;
  totalAssociates: number;
  present: number;
  inFavor: number;
};

export type VoteResult = {
  quorumMet: boolean;
  approved: boolean;
  reason: string;
};

/** Two thirds of the present voters: inFavor / present >= 2/3, without rounding. */
const hasTwoThirds = (inFavor: number, present: number) => inFavor * 3 >= present * 2;

/** Simple majority of the present voters: inFavor is more than half. */
const hasSimpleMajority = (inFavor: number, present: number) => inFavor * 2 > present;

export function evaluateVote(count: VoteCount): VoteResult {
  const { matter, convocation, totalAssociates, present, inFavor } = count;

  if (present < 0 || inFavor < 0 || inFavor > present || present > totalAssociates) {
    return { quorumMet: false, approved: false, reason: "Contagem de votos inválida." };
  }

  if (matter === "statute_change" || matter === "member_removal") {
    if (convocation === "first" && present * 2 <= totalAssociates) {
      return { quorumMet: false, approved: false, reason: "Primeira convocação exige a maioria absoluta dos associados presentes." };
    }
    if (convocation === "second" && present * 3 < totalAssociates) {
      return { quorumMet: false, approved: false, reason: "Segunda convocação exige pelo menos 1/3 dos associados." };
    }
    return {
      quorumMet: true,
      approved: hasTwoThirds(inFavor, present),
      reason: "Aprovação exige 2/3 dos presentes.",
    };
  }

  if (matter === "property_sale" || matter === "dissolution") {
    if (present !== totalAssociates) {
      return { quorumMet: false, approved: false, reason: "Esta matéria exige a presença da totalidade dos associados." };
    }
    return {
      quorumMet: true,
      approved: hasTwoThirds(inFavor, present),
      reason: "Aprovação exige 2/3 dos presentes.",
    };
  }

  return {
    quorumMet: true,
    approved: hasSimpleMajority(inFavor, present),
    reason: "Aprovação por maioria simples dos presentes.",
  };
}
