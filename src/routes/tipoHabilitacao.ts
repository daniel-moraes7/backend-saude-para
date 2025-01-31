import { Router, Request, Response } from 'express';
import { HabilitacaoService } from '../services/HabilitacaoService';

interface HabilitacaoBody {
  codigo: string;
  descricao: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
}

const router = Router();

/**
 * Middleware para validar campos obrigatórios (codigo e descricao).
 */
const validateHabilitacao = (req: Request, res: Response, next: Function) => {
  const { codigo, descricao } = req.body;
  
  if (!codigo?.trim()) {
    return res.status(400).json({ error: 'Código é obrigatório' });
  }
  if (!descricao?.trim()) {
    return res.status(400).json({ error: 'Descrição é obrigatória' });
  }
  
  return next();
};

/**
 * 1) Verifica duplicidade de CÓDIGO:
 *    GET /check-existing-codigo?codigo=ABC&excludeId=10
 */
router.get('/check-existing-codigo', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { codigo, excludeId } = req.query as { codigo?: string; excludeId?: string };

    if (!codigo?.trim()) {
      return res.status(400).json({ error: 'O parâmetro "codigo" é obrigatório' });
    }

    const excludeIdNum = excludeId ? Number(excludeId) : undefined;
    const exists = await HabilitacaoService.checkExistingCodigo(codigo, excludeIdNum);
    return res.json({ exists });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao verificar código duplicado' });
  }
});

/**
 * 2) Verifica duplicidade de DESCRIÇÃO:
 *    GET /check-existing-descricao?descricao=Alguma&excludeId=10
 */
router.get('/check-existing-descricao', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { descricao, excludeId } = req.query as { descricao?: string; excludeId?: string };

    if (!descricao?.trim()) {
      return res.status(400).json({ error: 'O parâmetro "descricao" é obrigatório' });
    }

    const excludeIdNum = excludeId ? Number(excludeId) : undefined;
    const exists = await HabilitacaoService.checkExistingDescricao(descricao, excludeIdNum);
    return res.json({ exists });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao verificar descrição duplicada' });
  }
});

/**
 * 3) Lista todas as habilitações:
 *    GET /tipo-habilitacao
 */
router.get('/', async (_: Request, res: Response): Promise<Response> => {
  try {
    const habilitacoes = await HabilitacaoService.getAll();
    return res.json(habilitacoes);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar habilitações' });
  }
});

/**
 * 4) Lista habilitações paginadas e com busca:
 *    GET /tipo-habilitacao/paginated?page=1&limit=10&search=texto
 */
router.get('/paginated', async (req: Request<{}, {}, {}, PaginationQuery>, res: Response): Promise<Response> => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const searchTerm = (req.query.search || '').trim();

    if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
      return res.status(400).json({ error: 'Parâmetros de paginação inválidos' });
    }

    const result = await HabilitacaoService.getAllPaginated(page, limit, searchTerm);
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar habilitações paginadas' });
  }
});

/**
 * 5) Busca única habilitação pelo ID:
 *    GET /tipo-habilitacao/:id
 */
router.get('/:id', async (req: Request, res: Response): Promise<Response> => {
  try {
    const habId = Number(req.params.id);
    if (isNaN(habId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const habilitacao = await HabilitacaoService.getById(habId);
    if (!habilitacao) {
      return res.status(404).json({ error: 'Habilitação não encontrada' });
    }

    return res.json(habilitacao);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar habilitação' });
  }
});

/**
 * 6) Cria nova habilitação:
 *    POST /tipo-habilitacao
 */
router.post('/', validateHabilitacao, async (req: Request<{}, any, HabilitacaoBody>, res: Response): Promise<Response> => {
  try {
    const { codigo, descricao } = req.body;

    // Se desejar, pode verificar duplicidade também no back:
    // if (await HabilitacaoService.checkExistingCodigo(codigo)) {
    //   return res.status(409).json({ error: 'Já existe habilitação com este código' });
    // }
    // if (await HabilitacaoService.checkExistingDescricao(descricao)) {
    //   return res.status(409).json({ error: 'Já existe habilitação com esta descrição' });
    // }

    const result = await HabilitacaoService.create({ codigo, descricao });
    return res.status(201).json({ success: true, result });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao criar habilitação' });
  }
});

/**
 * 7) Atualiza uma habilitação existente:
 *    PUT /tipo-habilitacao/:id
 */
router.put('/:id', validateHabilitacao, async (req: Request, res: Response): Promise<Response> => {
  try {
    const habId = Number(req.params.id);
    if (isNaN(habId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { codigo, descricao } = req.body;

    // (Opcional) Verificar duplicidade no back para robustez:
    // if (await HabilitacaoService.checkExistingCodigo(codigo, habId)) {
    //   return res.status(409).json({ error: 'Já existe habilitação com este código' });
    // }
    // if (await HabilitacaoService.checkExistingDescricao(descricao, habId)) {
    //   return res.status(409).json({ error: 'Já existe habilitação com esta descrição' });
    // }

    await HabilitacaoService.update(habId, { codigo, descricao });
    return res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    if (err.message === 'DUPLICATE_CODE') {
      return res.status(409).json({ error: 'Já existe habilitação com este código' });
    }
    if (err.message === 'DUPLICATE_ENTRY') {
      return res.status(409).json({ error: 'Já existe habilitação com esta descrição' });
    }
    return res.status(500).json({ error: 'Erro ao atualizar habilitação' });
  }
});

/**
 * 8) Exclui uma habilitação:
 *    DELETE /tipo-habilitacao/:id
 */
router.delete('/:id', async (req: Request, res: Response): Promise<Response> => {
  try {
    const habId = Number(req.params.id);
    if (isNaN(habId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await HabilitacaoService.delete(habId);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao excluir habilitação' });
  }
});

export default router;
