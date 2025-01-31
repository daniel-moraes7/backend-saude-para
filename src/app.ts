import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import routes from "./routes/index";
import pino from "pino";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { BusinessError } from "./services/QualificarEstabelecimento.service";

const app = express();
const logger = pino({ level: process.env.NODE_ENV === "production" ? "info" : "debug" });

// Validação de ambiente
if (!process.env.PORT) {
  logger.error("A variável de ambiente PORT não está configurada.");
  process.exit(1);
}

// Configuração do CORS
const allowedOrigins = [
  "http://localhost:5173",
  "https://saude-para-teste.web.app",
  "https://saude-para-teste.firebaseapp.com",
];
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  })
);

// Middleware de parsing JSON e compressão
app.use(express.json());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Muitas requisições feitas a partir deste IP. Tente novamente mais tarde.",
});
app.use(limiter);

// Logger de requisições
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info({ method: req.method, path: req.path }, "Requisição recebida");
  next();
});

// Timeout configurável
const TIMEOUT = Number(process.env.REQUEST_TIMEOUT || 30000);
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setTimeout(TIMEOUT, () => {
    res.status(408).send("Request timeout");
  });
  next();
});

// Rotas da API
app.use("/api", routes);

// Endpoints básicos
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

app.get("/", (_req: Request, res: Response) => {
  res.send(`
    <h1>API Saúde Para Todos</h1>
    <p>Versão: 1.0.0</p>
    <p>Endpoints disponíveis:</p>
    <ul>
      <li><a href="/health">/health</a> - Verificar saúde da API</li>
      <li><a href="/api-docs">/api-docs</a> - Documentação da API</li>
    </ul>
  `);
});

// Manipuladores de erro
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err.stack);
  const statusCode = err instanceof BusinessError ? 400 : 500;
  const message = process.env.NODE_ENV === "production" ? "Erro interno do servidor" : err.message;

  res.status(statusCode).json({
    error: {
      code: statusCode,
      message,
    },
  });
});

// Rota não encontrada
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: "Rota não encontrada",
    documentation: "/api-docs",
  });
});

export default app;