import { pool } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { Cliente, ClienteInput } from './clientes.types';

export async function listarClientes(busca?: string): Promise<Cliente[]> {
  if (busca) {
    const { rows } = await pool.query(
      `SELECT * FROM clientes
       WHERE ativo = TRUE AND (nome ILIKE $1 OR documento ILIKE $1 OR email ILIKE $1)
       ORDER BY nome ASC`,
      [`%${busca}%`]
    );
    return rows;
  }

  const { rows } = await pool.query(
    'SELECT * FROM clientes WHERE ativo = TRUE ORDER BY nome ASC'
  );
  return rows;
}

export async function buscarClientePorId(id: number): Promise<Cliente> {
  const { rows } = await pool.query('SELECT * FROM clientes WHERE id = $1', [id]);
  if (!rows[0]) {
    throw new AppError('Cliente não encontrado.', 404);
  }
  return rows[0];
}

export async function criarCliente(dados: ClienteInput): Promise<Cliente> {
  if (!dados.nome || dados.nome.trim() === '') {
    throw new AppError('O nome do cliente é obrigatório.', 422);
  }

  const { rows } = await pool.query(
    `INSERT INTO clientes (nome, documento, email, telefone, endereco, limite_credito)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      dados.nome.trim(),
      dados.documento || null,
      dados.email || null,
      dados.telefone || null,
      dados.endereco || null,
      dados.limite_credito ?? 0,
    ]
  );

  return rows[0];
}

export async function atualizarCliente(id: number, dados: ClienteInput): Promise<Cliente> {
  await buscarClientePorId(id); // garante que existe (lança 404 se não)

  if (!dados.nome || dados.nome.trim() === '') {
    throw new AppError('O nome do cliente é obrigatório.', 422);
  }

  const { rows } = await pool.query(
    `UPDATE clientes
     SET nome = $1, documento = $2, email = $3, telefone = $4, endereco = $5, limite_credito = $6
     WHERE id = $7
     RETURNING *`,
    [
      dados.nome.trim(),
      dados.documento || null,
      dados.email || null,
      dados.telefone || null,
      dados.endereco || null,
      dados.limite_credito ?? 0,
      id,
    ]
  );

  return rows[0];
}

export async function inativarCliente(id: number): Promise<void> {
  await buscarClientePorId(id);
  await pool.query('UPDATE clientes SET ativo = FALSE WHERE id = $1', [id]);
}
