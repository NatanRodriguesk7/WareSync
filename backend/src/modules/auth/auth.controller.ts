import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middlewares/error.middleware';
import { autenticar, solicitarRedefinicaoSenha } from './auth.service';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      throw new AppError('Informe e-mail e senha.', 422);
    }

    const usuario = await autenticar(email, senha);

    req.session.usuarioId = usuario.id;
    req.session.cargo = usuario.cargo;

    res.json({ success: true, message: 'Login realizado com sucesso.', user: usuario });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Informe um e-mail.', 422);
    }

    await solicitarRedefinicaoSenha(email);

    res.json({
      success: true,
      message: 'Se o e-mail existir na nossa base, você vai receber um link em instantes.',
    });
  } catch (err) {
    next(err);
  }
}
