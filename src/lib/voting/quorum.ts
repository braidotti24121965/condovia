/**
 * Quórum e aprovação das assembleias da associação, conforme o estatuto social.
 *
 * - Quórum conta associados (pessoas), conforme o artigo 3º.
 * - Cada lote ou unidade vale um voto (artigo 14). A aprovação conta votos.
 *
 * - Alteração do estatuto e destituição de membros (artigo 11, parágrafo quinto):
 *   aprovação por 2/3 dos votos presentes. Primeira convocação exige maioria absoluta dos associados
 *   presentes; segunda convocação exige pelo menos 1/3 dos associados.
 * - Alienação de imóveis e dissolução (artigo 11, parágrafo sexto): aprovação por 2/3 dos votos presentes,
 *   com a presença da totalidade dos associados.
 * - Demais assuntos (artigo 11, parágrafo sétimo): maioria simples dos votos presentes.
 */

export type VotingMatter = "statute_change" | "member_removal" | "property_sale" | "dissolution" | "other";
export type Convocation = "first" | "second";

export type VoteCount = {
  matter: VotingMatter;
  convocation: Convocation;
  /** Associados (pessoas) com direito a voto. */
  totalAssociates: number;
  /** Associados (pessoas) presentes. */
  presentAssociates: number;
  /** Votos presentes: um por lote ou unidade representados. */
  presentVotes: number;
  /** Votos favoráveis. */
  votesInFavor: number;
};

export type VoteResult = {
  quorumMet: boolean;
  approved: boolean;
  reason: string;
};

/** Two thirds of the present votes, without rounding. */
const hasTwoThirds = (inFavor: number, present: number) => inFavor * 3 >= present * 2;

/** Simple majority of the present votes. */
const hasSimpleMajority = (inFavor: number, present: number) => inFavor * 2 > present;

export function evaluateVote(count: VoteCount): VoteResult {
  const { matter, convocation, totalAssociates, presentAssociates, presentVotes, votesInFavor } = count;

  if (
    presentAssociates < 0 ||
    presentAssociates > totalAssociates ||
    presentVotes < 0 ||
    votesInFavor < 0 ||
    votesInFavor > presentVotes
  ) {
    return { quorumMet: false, approved: false, reason: "Contagem inválida." };
  }

  if (matter === "statute_change" || matter === "member_removal") {
    if (convocation === "first" && presentAssociates * 2 <= totalAssociates) {
      return { quorumMet: false, approved: false, reason: "Primeira convocação exige a maioria absoluta dos associados presentes." };
    }
    if (convocation === "second" && presentAssociates * 3 < totalAssociates) {
      return { quorumMet: false, approved: false, reason: "Segunda convocação exige pelo menos 1/3 dos associados." };
    }
    return { quorumMet: true, approved: hasTwoThirds(votesInFavor, presentVotes), reason: "Aprovação exige 2/3 dos votos presentes." };
  }

  if (matter === "property_sale" || matter === "dissolution") {
    if (presentAssociates !== totalAssociates) {
      return { quorumMet: false, approved: false, reason: "Esta matéria exige a presença da totalidade dos associados." };
    }
    return { quorumMet: true, approved: hasTwoThirds(votesInFavor, presentVotes), reason: "Aprovação exige 2/3 dos votos presentes." };
  }

  return { quorumMet: true, approved: hasSimpleMajority(votesInFavor, presentVotes), reason: "Aprovação por maioria simples dos votos presentes." };
}
