export interface Cliente {
  id: number;
  nome: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  limite_credito: number;
  ativo: boolean;
  criado_em: string;
}

export interface ClienteInput {
  nome: string;
  documento?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  limite_credito?: number;
}
