import { pool } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { MovimentacaoEstoque, MovimentacaoInput, Produto, ProdutoInput } from './produtos.types';

export async function listarProdutos(busca?: string, categoriaId?: number): Promise<Produto[]> {
  const condicoes = ['p.ativo = TRUE'];
  const params: unknown[] = [];

  if (busca) {
    params.push(`%${busca}%`);
    condicoes.push(`(p.nome ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
  }

  if (categoriaId) {
    params.push(categoriaId);
    condicoes.push(`p.categoria_id = $${params.length}`);
  }

  const { rows } = await pool.query(
    `SELECT p.*, c.nome AS categoria_nome
     FROM produtos p
     LEFT JOIN categorias c ON c.id = p.categoria_id
     WHERE ${condicoes.join(' AND ')}
     ORDER BY p.nome ASC`,
    params
  );

  return rows;
}

export async function buscarProdutoPorId(id: number): Promise<Produto> {
  const { rows } = await pool.query(
    `SELECT p.*, c.nome AS categoria_nome
     FROM produtos p
     LEFT JOIN categorias c ON c.id = p.categoria_id
     WHERE p.id = $1`,
    [id]
  );

  if (!rows[0]) {
    throw new AppError('Produto não encontrado.', 404);
  }

  return rows[0];
}

export async function criarProduto(dados: ProdutoInput): Promise<Produto> {
  if (!dados.nome || dados.nome.trim() === '') {
    throw new AppError('O nome do produto é obrigatório.', 422);
  }

  if (dados.sku) {
    const existente = await pool.query('SELECT id FROM produtos WHERE sku = $1', [dados.sku]);
    if (existente.rows[0]) {
      throw new AppError('Já existe um produto com esse SKU.', 422);
    }
  }

  const { rows } = await pool.query(
    `INSERT INTO produtos (nome, sku, categoria_id, preco_venda, preco_custo, estoque_minimo, estoque_atual, ncm, cfop, cest, origem_fiscal)
     VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, $10)
     RETURNING *`,
    [
      dados.nome.trim(),
      dados.sku || null,
      dados.categoria_id || null,
      dados.preco_venda ?? 0,
      dados.preco_custo ?? 0,
      dados.estoque_minimo ?? 0,
      dados.ncm || null,
      dados.cfop || null,
      dados.cest || null,
      dados.origem_fiscal || '0',
    ]
  );

  return rows[0];
}

export async function atualizarProduto(id: number, dados: ProdutoInput): Promise<Produto> {
  await buscarProdutoPorId(id);

  if (!dados.nome || dados.nome.trim() === '') {
    throw new AppError('O nome do produto é obrigatório.', 422);
  }

  const { rows } = await pool.query(
    `UPDATE produtos
     SET nome = $1, sku = $2, categoria_id = $3, preco_venda = $4, preco_custo = $5, estoque_minimo = $6,
         ncm = $7, cfop = $8, cest = $9, origem_fiscal = $10
     WHERE id = $11
     RETURNING *`,
    [
      dados.nome.trim(),
      dados.sku || null,
      dados.categoria_id || null,
      dados.preco_venda ?? 0,
      dados.preco_custo ?? 0,
      dados.estoque_minimo ?? 0,
      dados.ncm || null,
      dados.cfop || null,
      dados.cest || null,
      dados.origem_fiscal || '0',
      id,
    ]
  );

  return rows[0];
}

export async function inativarProduto(id: number): Promise<void> {
  await buscarProdutoPorId(id);
  await pool.query('UPDATE produtos SET ativo = FALSE WHERE id = $1', [id]);
}

/**
 * Registra uma movimentação de estoque e atualiza o saldo do produto
 * dentro de uma única transação — evita saldo inconsistente se algo falhar no meio.
 */
export async function registrarMovimentacao(
  produtoId: number,
  usuarioId: number,
  dados: MovimentacaoInput
): Promise<{ produto: Produto; movimentacao: MovimentacaoEstoque }> {
  if (!dados.quantidade || dados.quantidade <= 0) {
    throw new AppError('Informe uma quantidade maior que zero.', 422);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: produtoRows } = await client.query(
      'SELECT * FROM produtos WHERE id = $1 FOR UPDATE',
      [produtoId]
    );
    const produto = produtoRows[0];

    if (!produto) {
      throw new AppError('Produto não encontrado.', 404);
    }

    let novoEstoque: number;

    switch (dados.tipo) {
      case 'entrada':
        novoEstoque = Number(produto.estoque_atual) + dados.quantidade;
        break;
      case 'saida':
        novoEstoque = Number(produto.estoque_atual) - dados.quantidade;
        if (novoEstoque < 0) {
          throw new AppError('Estoque insuficiente para essa saída.', 422);
        }
        break;
      case 'ajuste':
        novoEstoque = dados.quantidade; // ajuste define o valor absoluto
        break;
      default:
        throw new AppError('Tipo de movimentação inválido.', 422);
    }

    const { rows: movRows } = await client.query(
      `INSERT INTO movimentacoes_estoque (produto_id, usuario_id, tipo, quantidade, estoque_resultante, motivo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [produtoId, usuarioId, dados.tipo, dados.quantidade, novoEstoque, dados.motivo || null]
    );

    const { rows: produtoAtualizado } = await client.query(
      'UPDATE produtos SET estoque_atual = $1 WHERE id = $2 RETURNING *',
      [novoEstoque, produtoId]
    );

    await client.query('COMMIT');

    return { produto: produtoAtualizado[0], movimentacao: movRows[0] };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listarMovimentacoes(produtoId: number): Promise<MovimentacaoEstoque[]> {
  const { rows } = await pool.query(
    `SELECT m.*, u.nome AS usuario_nome
     FROM movimentacoes_estoque m
     JOIN usuarios u ON u.id = m.usuario_id
     WHERE m.produto_id = $1
     ORDER BY m.criado_em DESC
     LIMIT 50`,
    [produtoId]
  );
  return rows;
}
