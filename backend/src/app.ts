import express, { Application } from 'express';
import cors from 'cors';
import session from 'express-session';
import { authRoutes } from './modules/auth/auth.routes';
import { clientesRoutes } from './modules/clientes/clientes.routes';
import { produtosRoutes } from './modules/produtos/produtos.routes';
import { categoriasRoutes } from './modules/categorias/categorias.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { vendasRoutes } from './modules/vendas/vendas.routes';
import { contasPagarRoutes } from './modules/financeiro/contas-pagar.routes';
import { contasReceberRoutes } from './modules/financeiro/contas-receber.routes';
import { caixaRoutes } from './modules/financeiro/caixa.routes';
import { relatoriosRoutes } from './modules/relatorios/relatorios.routes';
import { devolucoesRoutes } from './modules/devolucoes/devolucoes.routes';
import { inventariosRoutes } from './modules/inventarios/inventarios.routes';
import { fornecedoresRoutes } from './modules/fornecedores/fornecedores.routes';
import { transferenciasRoutes } from './modules/transferencias/transferencias.routes';
import { errorMiddleware } from './middlewares/error.middleware';
import './types';

export function createApp(): Application {
  const app = express();

  app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5500', credentials: true }));
  app.use(express.json());
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'troque-este-segredo-em-producao',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 }, // 8h
    })
  );

  app.use('/api/auth', authRoutes);
  app.use('/api/clientes', clientesRoutes);
  app.use('/api/produtos', produtosRoutes);
  app.use('/api/categorias', categoriasRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/vendas', vendasRoutes);
  app.use('/api/financeiro/contas-pagar', contasPagarRoutes);
  app.use('/api/financeiro/contas-receber', contasReceberRoutes);
  app.use('/api/financeiro/caixa', caixaRoutes);
  app.use('/api/relatorios', relatoriosRoutes);
  app.use('/api/devolucoes', devolucoesRoutes);
  app.use('/api/inventarios', inventariosRoutes);
  app.use('/api/fornecedores', fornecedoresRoutes);
  app.use('/api/transferencias', transferenciasRoutes);

  app.use(errorMiddleware);

  return app;
}
