import { Router, Request, Response } from 'express';
import { EstabelecimentoService } from '../services/EstabelecimentoService';
import { ParamsDictionary } from 'express-serve-static-core';
import { ResultSetHeader } from 'mysql2';

interface IdParam extends ParamsDictionary {
  id: string;
}

interface EstabelecimentoBody {
  descricao: string;
}

interface CheckExistingQuery {
  descricao: string;
  excludeId?: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
}

const router = Router();

const validateEstabelecimento = (req: Request, res: Response, next: Function) => {
  const { descricao } = req.body;
  
  if (!descricao?.trim()) {
    return res.status(400).json({ error: 'Descrição é obrigatória' });
  }
  
  return next();
};

router.get('/check-existing', async (req: Request<ParamsDictionary, {}, {}, CheckExistingQuery>, res: Response) => {
  try {
    const { descricao, excludeId } = req.query;
    const excludeIdNumber = excludeId ? parseInt(excludeId) : undefined;
    
    if (!descricao?.trim()) {
      return res.status(400).json({ error: 'Descrição é obrigatória' });
    }

    const exists = await EstabelecimentoService.checkExisting(
      descricao.trim(),
      excludeIdNumber
    );
    
    return res.json({ exists });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro na verificação de duplicados' });
  }
});

router.get('/', async (_: Request, res: Response) => {
  try {
    const estabelecimentos = await EstabelecimentoService.getAll();
    return res.json(estabelecimentos);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar tipos de estabelecimento' });
  }
});

router.get('/paginated', async (req: Request<{}, {}, {}, PaginationQuery>, res: Response) => {
  try {
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const search = req.query.search?.trim();

    if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
      return res.status(400).json({ error: 'Parâmetros de paginação inválidos' });
    }

    const result = await EstabelecimentoService.getAllPaginated(page, limit, search);
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar estabelecimentos paginados' });
  }
});

router.get<IdParam>('/:id', async (req, res) => {
  try {
    const estabelecimentoId = Number(req.params.id);
    
    if (isNaN(estabelecimentoId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const estabelecimento = await EstabelecimentoService.getById(estabelecimentoId);
    return estabelecimento 
      ? res.json(estabelecimento)
      : res.status(404).json({ error: 'Tipo de estabelecimento não encontrado' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar estabelecimento' });
  }
});

router.post<ParamsDictionary, any, EstabelecimentoBody>('/', validateEstabelecimento, async (req, res) => {
  try {
    const { descricao } = req.body;
    const descricaoTratada = descricao.trim();

    const exists = await EstabelecimentoService.checkExisting(descricaoTratada);
    if (exists) {
      return res.status(409).json({ error: 'Tipo de estabelecimento já existe' });
    }

    const result = await EstabelecimentoService.create({ descricao: descricaoTratada });
    return res.status(201).json({ 
      id: (result as ResultSetHeader).insertId,
      descricao: descricaoTratada
    });
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'DUPLICATE_ENTRY') {
      return res.status(409).json({ error: 'Tipo de estabelecimento já existe' });
    }
    
    return res.status(500).json({ error: 'Erro ao criar estabelecimento' });
  }
});

router.put<IdParam, any, EstabelecimentoBody>('/:id', validateEstabelecimento, async (req, res) => {
  try {
    const estabelecimentoId = Number(req.params.id);
    const { descricao } = req.body;
    const descricaoTratada = descricao.trim();

    if (isNaN(estabelecimentoId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const exists = await EstabelecimentoService.checkExisting(descricaoTratada, estabelecimentoId);
    if (exists) {
      return res.status(409).json({ error: 'Tipo de estabelecimento já existe' });
    }

    await EstabelecimentoService.update(estabelecimentoId, { descricao: descricaoTratada });
    return res.json({ 
      success: true,
      id: estabelecimentoId,
      descricao: descricaoTratada
    });
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'DUPLICATE_ENTRY') {
      return res.status(409).json({ error: 'Tipo de estabelecimento já existe' });
    }
    
    return res.status(500).json({ error: 'Erro ao atualizar estabelecimento' });
  }
});

router.delete<IdParam>('/:id', async (req, res) => {
  try {
    const estabelecimentoId = Number(req.params.id);
    
    if (isNaN(estabelecimentoId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await EstabelecimentoService.delete(estabelecimentoId);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao excluir estabelecimento' });
  }
});

export default router;