/**
 * Traduz erros técnicos do Supabase/Postgres para linguagem natural em PT-BR.
 *
 * Cobre:
 * - Exceptions custom das RPCs (NAO_AUTENTICADO, ESTOQUE_INSUFICIENTE, etc)
 * - Mensagens de auth do Supabase (Invalid login credentials, etc)
 * - Códigos Postgres comuns (23505 unique, 23503 fk, 23502 not null, etc)
 */

interface SupabaseLikeError {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

const RPC_MESSAGES: Record<string, string> = {
  NAO_AUTENTICADO:
    'Sua sessão expirou. Faça login novamente para continuar.',
  CLIENTE_NAO_ENCONTRADO:
    'Cliente não encontrado. Verifique o código do crachá.',
  PRODUTO_NAO_ENCONTRADO:
    'Produto não está mais disponível. Atualize a página e tente de novo.',
  QUANTIDADE_INVALIDA:
    'Quantidade inválida. Informe um número maior que zero.',
  VALOR_INVALIDO:
    'Valor inválido. Informe um número maior que zero.',
  USUARIO_NAO_ENCONTRADO:
    'Usuário não encontrado.',
  PERMISSAO_NEGADA:
    'Você não tem permissão para realizar esta ação.',
  NAO_PODE_REMOVER_PROPRIO_ADMIN:
    'Você não pode remover seu próprio acesso de administrador.',
  NAO_PODE_DESATIVAR_PROPRIO_USUARIO:
    'Você não pode desativar seu próprio usuário.',
  // SALDO_INSUFICIENTE foi removido das RPCs (saldo pode ficar negativo),
  // mas mantemos a tradução caso volte em alguma RPC futura.
  SALDO_INSUFICIENTE:
    'Saldo insuficiente no crachá para essa operação.',
};

const AUTH_MESSAGES: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/email not confirmed/i, 'Confirme seu e-mail antes de entrar.'],
  [/user already registered|user already exists/i,
    'Já existe uma conta com este e-mail.'],
  [/password should be at least (\d+)/i,
    'A senha precisa ter pelo menos $1 caracteres.'],
  [/invalid email/i, 'O e-mail informado não é válido.'],
  [/email rate limit exceeded/i,
    'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'],
  [/network|fetch.*failed|failed to fetch/i,
    'Sem conexão com o servidor. Verifique sua internet e tente novamente.'],
  [/jwt|token.*expired/i,
    'Sua sessão expirou. Faça login novamente.'],
  [/row.level.security|new row violates row-level security/i,
    'Você não tem permissão para realizar esta ação.'],
];

const PG_CODE_MESSAGES: Record<string, string> = {
  '23505': 'Esse registro já existe. Verifique se o valor é único (ex: código de crachá ou e-mail).',
  '23503': 'Não foi possível concluir: existe uma referência a este registro em outro lugar.',
  '23502': 'Preencha todos os campos obrigatórios.',
  '23514': 'Valor inválido para esse campo.',
  '22P02': 'Formato inválido. Verifique se o valor foi digitado corretamente.',
  '42501': 'Você não tem permissão para realizar esta ação.',
  'PGRST116': 'Registro não encontrado.',
};

/**
 * Converte qualquer erro (Error, PostgrestError, AuthError, string) em uma
 * mensagem amigável em português.
 */
export function friendlyError(err: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (!err) return fallback;

  // Aceita strings diretas
  if (typeof err === 'string') return translateString(err) ?? err;

  // Objetos com message
  const e = err as SupabaseLikeError;
  const raw = (e.message ?? '').trim();

  // 1. Custom RPC: aceita 'CODE' puro ou 'CODE: detalhe'
  for (const code of Object.keys(RPC_MESSAGES)) {
    if (raw === code || raw.startsWith(`${code}:`) || raw.includes(code)) {
      const detail = raw.includes(':') ? raw.split(':').slice(1).join(':').trim() : '';
      const base = RPC_MESSAGES[code];
      if (code === 'ESTOQUE_INSUFICIENTE' || (detail && !base.includes(detail))) {
        return detail ? `${base} (${detail})` : base;
      }
      return base;
    }
  }

  // Caso especial: ESTOQUE_INSUFICIENTE vem como 'ESTOQUE_INSUFICIENTE: Nome do Produto'
  if (raw.startsWith('ESTOQUE_INSUFICIENTE')) {
    const produto = raw.split(':')[1]?.trim();
    return produto
      ? `Estoque insuficiente: "${produto}" não tem quantidade suficiente no estoque.`
      : 'Estoque insuficiente para um dos produtos do carrinho.';
  }

  // 2. Código Postgres (vem no campo .code dos PostgrestError)
  if (e.code && PG_CODE_MESSAGES[e.code]) {
    return PG_CODE_MESSAGES[e.code];
  }

  // 3. Mensagens de auth do Supabase
  const translated = translateString(raw);
  if (translated) return translated;

  // 4. Fallback — devolve raw se tiver, senão fallback genérico
  return raw || fallback;
}

function translateString(raw: string): string | null {
  if (!raw) return null;
  for (const [pattern, msg] of AUTH_MESSAGES) {
    if (pattern.test(raw)) {
      return raw.replace(pattern, msg);
    }
  }
  return null;
}
