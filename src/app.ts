import express from 'express';
import cors from 'cors';
import estabelecimentoCrudRouter from './routes/estabelecimento-crud.routes';
import estabelecimentoRelatorioRouter from './routes/estabelecimento-relatorio.routes';
import componentsRouter from './routes/components';
import tipoQualificacaoRouter from './routes/tipoQualificacao';
import tipoHabilitacaoRouter from './routes/tipoHabilitacao';
import tipoEstabelecimentoRouter from './routes/tipoEstabelecimento';
import turnoRouter from './routes/turnoRouter';
import naturezaRouter from './routes/natureza';
import CBORouter from './routes/cbo';
import MunicipiosRouter from './routes/municipios';
import EstadosRouter from './routes/estados';
import EscolaridadeRouter from './routes/escolaridade';
import RacaRouter from './routes/raca';
import PaisesRouter from './routes/paises';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://saude-para-teste.web.app',
  'https://saude-para-teste.firebaseapp.com'
];

// Configuração do CORS
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true
}));

// Middleware para parsing de JSON
app.use(express.json());

// Logger de requisições
app.use((_req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${_req.method} ${_req.path}`);
  next();
});

// Configuração de timeout
app.use((_req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(408).send('Request timeout');
  });
  next();
});

// Montagem das rotas:

// 1. Rotas de listagem (relatório) – mais específicas
app.use('/api/estabelecimentos/relatorio', estabelecimentoRelatorioRouter);

// 2. Rotas de CRUD – mais genéricas
app.use('/api/estabelecimentos', estabelecimentoCrudRouter);

// Demais rotas da API
app.use('/api/componentes', componentsRouter);
app.use('/api/tipo-qualificacao', tipoQualificacaoRouter);
app.use('/api/tipo-habilitacao', tipoHabilitacaoRouter);
app.use('/api/tipo-estabelecimento', tipoEstabelecimentoRouter);
app.use('/api/turnos', turnoRouter);
app.use('/api/natureza', naturezaRouter);
app.use('/api/cbo', CBORouter);
app.use('/api/municipio', MunicipiosRouter);
app.use('/api/estado', EstadosRouter);
app.use('/api/escolaridade', EscolaridadeRouter);
app.use('/api/raca', RacaRouter);
app.use('/api/paises', PaisesRouter);

// Endpoints básicos
app.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/', (_req, res) => {
  res.send(`
    <h1>API Saúde Para Todos</h1>
    <p>Versão: 1.0.0</p>
    <p>Documentação disponível em <a href="/api-docs">/api-docs</a></p>
  `);
});

// Manipuladores de erro
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor' 
      : err.message
  });
});

// Rota não encontrada
app.use((_req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    documentation: '/api-docs'
  });
});

export default app;
