import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidos no .env');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type UserRole = 'caixa' | 'admin';

export interface Category {
  key: string;
  label: string;
  emoji: string;
  created_at: string;
}

export interface Profile {
  id: string;
  nome: string | null;
  email: string | null;
  role: UserRole;
}

export interface Client {
  id: string;
  codigo: number;
  nome: string;
  saldo: number;
  ativo: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
  categoria: string; // FK → categories.key
  imagem_url: string | null;
  imagem_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  cliente_id: string;
  tipo: 'RECARGA' | 'DEBITO';
  valor: number;
  descricao: string | null;
  operador_id: string | null;
  created_at: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string | null;
  produto_nome: string;
  preco_unitario: number;
  quantidade: number;
  subtotal: number;
  created_at: string;
}
