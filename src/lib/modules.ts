// Chaves de módulo usadas na rota /atleta/:id/modulo/:modulo.
//  - "s:<uuid>"  → módulo curado (studio_sessions)
//  - "~outras"   → aulas do professor fora de qualquer módulo curado
//  - qualquer outro valor → nome da subcategoria (agrupamento antigo)
export const LOOSE_MODULE_KEY = "~outras";
export const SESSION_KEY_PREFIX = "s:";
