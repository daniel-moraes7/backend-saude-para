// backend/src/routes/escolaridade.ts
import { Router, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { EscolaridadeService } from '../services/EscolaridadeService';
import { ResultSetHeader } from 'mysql2';

interface EscolaridadeBody {
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

const validateEscolaridade = (req: Request, res: Response, next: Function) => {
  const { descricao } = req.body;
  
  if (!descricao?.trim()) {
    return res.status(400).json({ error: 'Descrição é obrigatória' });
  }
  
  return next();
};

// Endpoint de paginação
router.get('/paginated', async (req: Request<ParamsDictionary, {}, {}, PaginationQuery>, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search?.toString() || '';

    const result = await EscolaridadeService.getAllPaginated(page, limit, search);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro na paginação de escolaridades' });
  }
});

router.get('/check-existing', async (req: Request<ParamsDictionary, {}, {}, CheckExistingQuery>, res: Response) => {
  try {
    const { descricao, excludeId } = req.query;
    const excludeIdNumber = excludeId ? parseInt(excludeId) : undefined;
    
    if (!descricao?.trim()) {
      return res.status(400).json({ error: 'Descrição é obrigatória' });
    }

    const exists = await EscolaridadeService.checkExisting(
      descricao.trim(),
      excludeIdNumber
    );
    
    return res.json({ exists });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro na verificação de duplicatas' });
  }
});

router.get('/', async (_: Request, res: Response) => {
  try {
    const escolaridades = await EscolaridadeService.getAll();
    return res.json(escolaridades);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar escolaridades' });
  }
});

router.get<ParamsDictionary>('/:id', async (req, res) => {
  try {
    const escolaridadeId = Number(req.params.id);
    
    if (isNaN(escolaridadeId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const escolaridade = await EscolaridadeService.getById(escolaridadeId);
    return escolaridade 
      ? res.json(escolaridade)
      : res.status(404).json({ error: 'Escolaridade não encontrada' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar escolaridade' });
  }
});

router.post<ParamsDictionary, {}, EscolaridadeBody>('/', validateEscolaridade, async (req, res) => {
  try {
    const { descricao } = req.body;
    const descricaoTratada = descricao.trim();

    const exists = await EscolaridadeService.checkExisting(descricaoTratada);
    if (exists) {
      return res.status(409).json({ error: 'Escolaridade já existe' });
    }

    const result: ResultSetHeader = await EscolaridadeService.create(descricaoTratada);
    return res.status(201).json({ 
      id: result.insertId,
      descricao: descricaoTratada
    });
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'DUPLICATE_ENTRY') {
      return res.status(409).json({ error: 'Escolaridade já existe' });
    }
    
    return res.status(500).json({ error: 'Erro ao criar escolaridade' });
  }
});

router.put<ParamsDictionary, {}, EscolaridadeBody>('/:id', validateEscolaridade, async (req, res) => {
  try {
    const escolaridadeId = Number(req.params.id);
    const { descricao } = req.body;
    const descricaoTratada = descricao.trim();

    if (isNaN(escolaridadeId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const exists = await EscolaridadeService.checkExisting(
      descricaoTratada, 
      escolaridadeId
    );
    
    if (exists) {
      return res.status(409).json({ error: 'Escolaridade já existe' });
    }

    await EscolaridadeService.update(escolaridadeId, descricaoTratada);
    return res.json({ 
      success: true,
      id: escolaridadeId,
      descricao: descricaoTratada
    });
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'DUPLICATE_ENTRY') {
      return res.status(409).json({ error: 'Escolaridade já existe' });
    }
    
    return res.status(500).json({ error: 'Erro ao atualizar escolaridade' });
  }
});

router.delete<ParamsDictionary>('/:id', async (req, res) => {
  try {
    const escolaridadeId = Number(req.params.id);
    
    if (isNaN(escolaridadeId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await EscolaridadeService.delete(escolaridadeId);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao excluir escolaridade' });
  }
});

export default router;