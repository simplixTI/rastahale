/**
 * Quem pode assistir às aulas: equipe sempre; aluno só com a conta "ativo",
 * status que o webhook do Stripe mantém (active/trialing → ativo; o resto → inativo)
 * e que o admin também pode definir em Usuários.
 *
 * Sem plano, o aluno ainda assiste às aulas dos módulos que comprou avulsos
 * (migration 022) — ver canWatchLesson abaixo.
 *
 * Isto só decide o que mostrar na tela. Para vídeos do Bunny, a mesma regra é
 * aplicada no servidor pela Edge Function "bunny-stream" (função SQL owns_lesson).
 */
export function canWatchLessons(role: string | undefined, status: string | undefined): boolean {
  return role === "admin" || role === "instructor" || status === "ativo";
}

/** Uma aula específica: plano/equipe, ou a aula está num módulo comprado. */
export function canWatchLesson(
  role: string | undefined,
  status: string | undefined,
  lessonId: string,
  ownedLessonIds: Set<string>,
): boolean {
  return canWatchLessons(role, status) || ownedLessonIds.has(lessonId);
}
