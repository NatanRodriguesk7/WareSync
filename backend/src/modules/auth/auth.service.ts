import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { pool } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';

export interface UsuarioAutenticado {
  id: number;
  nome: string;
  email: string;
  cargo: string;
}

export async function autenticar(email: string, senha: string): Promise<UsuarioAutenticado> {
  const { rows } = await pool.query(
    'SELECT id, nome, email, senha_hash, cargo, ativo FROM usuarios WHERE email = $1 LIMIT 1',
    [email]
  );
  const usuario = rows[0];

  if (!usuario || !(await bcrypt.compare(senha, usuario.senha_hash))) {
    throw new AppError('E-mail ou senha inválidos.', 401);
  }

  if (!usuario.ativo) {
    throw new AppError('Este usuário está inativo.', 403);
  }

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    cargo: usuario.cargo,
  };
}

export async function solicitarRedefinicaoSenha(email: string): Promise<void> {
  const { rows } = await pool.query('SELECT id FROM usuarios WHERE email = $1 LIMIT 1', [email]);
  const usuario = rows[0];

  // Não revela se o e-mail existe — resposta sempre genérica no controller.
  if (!usuario) return;

  const token = crypto.randomBytes(32).toString('hex');
  const expiraEm = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  await pool.query(
    'INSERT INTO password_resets (usuario_id, token, expira_em) VALUES ($1, $2, $3)',
    [usuario.id, token, expiraEm]
  );

  // Em produção: disparar e-mail real com o link de redefinição.
  console.log(`[Waresync] Link de redefinição para ${email}: /reset-password.html?token=${token}`);
}
