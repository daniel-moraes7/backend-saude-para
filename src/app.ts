import express from 'express';
import cors from 'cors';
import estabelecimento from './routes/estabelecimento.routes';
import componentsRouter from './routes/components';
import tipoQualificacaoRouter from './routes/tipoQualificacao';
import tipoHabilitacaoRouter from './routes/tipoHabilitacao';
import tipoEstabelecimentoRouter from './routes/tipoEstabelecimento';
import turnoRouter from './routes/turnoRouter';
import naturezaRouter from './routes/natureza';

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

// Rotas principais de estabelecimento
app.use('/api/estabelecimentos', estabelecimento);

// Demais rotas da API
app.use('/api/componentes', componentsRouter);
app.use('/api/tipo-qualificacao', tipoQualificacaoRouter);
app.use('/api/tipo-habilitacao', tipoHabilitacaoRouter);
app.use('/api/tipo-estabelecimento', tipoEstabelecimentoRouter);
app.use('/api/turnos', turnoRouter);
app.use('/api/natureza', naturezaRouter);

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