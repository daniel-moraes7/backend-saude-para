import { Router, Request, Response, NextFunction } from "express";
import { EstabelecimentoService } from "../services/QualificarEstabelecimento.service";

const router = Router();

// Middleware para validar IDs nas rotas
const validateID = (req: Request, res: Response, next: NextFunction): void | Response => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "ID inválido" });
  }
  next();
};

// Middleware para trim em campos string
const trimBodyStrings = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = Object.keys(req.body).reduce((acc: any, key) => {
      acc[key] = typeof req.body[key] === "string" ? req.body[key].trim() : req.body[key];
      return acc;
    }, {});
  }
  next();
};

// Middleware para validação básica do estabelecimento
const validateEstabelecimento = (req: Request, res: Response, next: NextFunction): Response | void => {
  const { nome } = req.body;
  const errors: string[] = [];
  if (!nome?.trim()) {
    errors.push("Nome do estabelecimento é obrigatório");
  }
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  next();
};

/**
 * GET /api/estabelecimentos
 * Lista simples (sem paginação)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const searchTerm = req.query.search?.toString() || "";
    const estabelecimentos = await EstabelecimentoService.getAllPaginated(1, -1, searchTerm);
    return res.json(estabelecimentos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar estabelecimentos" });
  }
});

/**
 * GET /api/estabelecimentos/paginated
 * Lista paginada com busca e ordenação
 */
router.get("/paginated", async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const searchTerm = req.query.search?.toString() || "";
    const sortKey = req.query.sortKey?.toString() || "idestabelecimento";
    const sortOrder = (req.query.sortOrder?.toString() || "asc") as "asc" | "desc";

    const result = await EstabelecimentoService.getAllPaginated(page, limit, searchTerm, sortKey, sortOrder);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro na paginação de estabelecimentos" });
  }
});

/**
 * GET /api/estabelecimentos/:id
 * Retorna estabelecimento específico
 */
router.get("/:id", validateID, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const estabelecimento = await EstabelecimentoService.getById(id);
    return res.json(estabelecimento);
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message.includes("não encontrado")) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: "Erro ao buscar estabelecimento" });
  }
});

/**
 * POST /api/estabelecimentos
 * Cria novo estabelecimento
 */
router.post("/", trimBodyStrings, validateEstabelecimento, async (req: Request, res: Response) => {
  try {
    const dados = req.body;
    const novoEstabelecimento = await EstabelecimentoService.create(dados);
    return res.status(201).json(novoEstabelecimento);
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Erro ao criar estabelecimento" });
  }
});

/**
 * PUT /api/estabelecimentos/:id
 * Atualiza estabelecimento
 */
router.put("/:id", validateID, trimBodyStrings, validateEstabelecimento, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const dados = req.body;
    const atualizado = await EstabelecimentoService.update(id, dados);
    return res.json(atualizado);
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      if (error.message.includes("não encontrado")) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Erro ao atualizar estabelecimento" });
  }
});

/**
 * DELETE /api/estabelecimentos/:id
 * Remove estabelecimento
 */
router.delete("/:id", validateID, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await EstabelecimentoService.delete(id);
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      if (error.message === "DEPENDENCY_ERROR") {
        return res.status(409).json({ error: "Não é possível excluir, existem dependências relacionadas" });
      }
      if (error.message.includes("não encontrado")) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "Erro ao excluir estabelecimento" });
  }
});

/**
 * Rotas para entidades relacionadas
 */
router.get("/tipo-estabelecimento", async (_req: Request, res: Response) => {
  try {
    const result = await EstabelecimentoService.getTiposEstabelecimento();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar tipos de estabelecimento" });
  }
});

router.get("/natureza", async (_req: Request, res: Response) => {
  try {
    const result = await EstabelecimentoService.getNaturezas();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar naturezas" });
  }
});

router.get("/turnos", async (_req: Request, res: Response) => {
  try {
    const result = await EstabelecimentoService.getTurnos();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar turnos" });
  }
});

router.get("/tipo-habilitacao", async (_req: Request, res: Response) => {
  try {
    const result = await EstabelecimentoService.getHabilitacoes();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar habilitações" });
  }
});

router.get("/tipo-qualificacao", async (_req: Request, res: Response) => {
  try {
    const result = await EstabelecimentoService.getQualificacoes();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar qualificações" });
  }
});

export default router;