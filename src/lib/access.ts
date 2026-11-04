/**
 * Quem pode assistir às aulas: equipe sempre; aluno só com a conta "ativo",
 * status que o webhook do Stripe mantém (active/trialing → ativo; o resto → inativo)
 * e que o admin também pode definir em Usuários.
 *
 * Isto só decide o que mostrar na tela. Para vídeos do Bunny, a mesma regra é
 * aplicada no servidor pela Edge Function "bunny-stream".
 */
export function canWatchLessons(role: string | undefined, status: string | undefined): boolean {
  return role === "admin" || role === "instructor" || status === "ativo";
}
