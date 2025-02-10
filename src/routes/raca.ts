//backend/src/routes/raca.ts
import { Router, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { RacaService } from '../services/RacaService';
import { ResultSetHeader } from 'mysql2';

interface RacaBody {
  descricao: string;
}

interface CheckExistingQuery {
  descricao?: string;
  excludeId?: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
}

const router = Router();

const validateRaca = (req: Request, res: Response, next: Function) => {
  const { descricao } = req.body;
  
  if (!descricao?.trim()) {
    return res.status(400).json({ error: 'Descrição é obrigatória' });
  }
  
  if (descricao.length > 15) {
    return res.status(400).json({ error: 'Descrição deve ter no máximo 15 caracteres' });
  }
  
  return next();
};

router.get('/paginated', async (req: Request<ParamsDictionary, {}, {}, PaginationQuery>, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search?.toString() || '';

    const result = await RacaService.getAllPaginated(page, limit, search);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro na paginação de raças' });
  }
});

router.get('/check-existing', async (req: Request<ParamsDictionary, {}, {}, CheckExistingQuery>, res: Response) => {
  try {
    const { descricao, excludeId } = req.query;
    const excludeIdNumber = excludeId ? parseInt(excludeId) : undefined;
    
    if (!descricao?.trim()) {
      return res.status(400).json({ error: 'Descrição é obrigatória' });
    }

    const exists = await RacaService.checkExisting(descricao.trim(), excludeIdNumber);
    return res.json({ exists });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro na verificação de duplicatas' });
  }
});

router.get('/', async (_: Request, res: Response) => {
  try {
    const racas = await RacaService.getAll();
    return res.json(racas);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar raças' });
  }
});

router.get<ParamsDictionary>('/:id', async (req, res) => {
  try {
    const racaId = Number(req.params.id);
    
    if (isNaN(racaId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const raca = await RacaService.getById(racaId);
    return raca 
      ? res.json(raca)
      : res.status(404).json({ error: 'Raça não encontrada' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar raça' });
  }
});

router.post<ParamsDictionary, {}, RacaBody>('/', validateRaca, async (req, res) => {
  try {
    const { descricao } = req.body;
    const descricaoTratada = descricao.trim();

    const exists = await RacaService.checkExisting(descricaoTratada);
    if (exists) {
      return res.status(409).json({ error: 'Raça já existe' });
    }

    const result: ResultSetHeader = await RacaService.create(descricaoTratada);
    
    return res.status(201).json({ 
      id: result.insertId,
      descricao: descricaoTratada
    });
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'DUPLICATE_ENTRY') {
      return res.status(409).json({ error: 'Raça já existe' });
    }
    
    return res.status(500).json({ error: 'Erro ao criar raça' });
  }
});

router.put<ParamsDictionary, {}, RacaBody>('/:id', validateRaca, async (req, res) => {
  try {
    const racaId = Number(req.params.id);
    const { descricao } = req.body;
    const descricaoTratada = descricao.trim();

    if (isNaN(racaId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const exists = await RacaService.checkExisting(descricaoTratada, racaId);
    if (exists) {
      return res.status(409).json({ error: 'Raça já existe' });
    }

    await RacaService.update(racaId, descricaoTratada);
    
    return res.json({ 
      success: true,
      id: racaId,
      descricao: descricaoTratada
    });
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'DUPLICATE_ENTRY') {
      return res.status(409).json({ error: 'Raça já existe' });
    }
    
    return res.status(500).json({ error: 'Erro ao atualizar raça' });
  }
});

router.delete<ParamsDictionary>('/:id', async (req, res) => {
  try {
    const racaId = Number(req.params.id);
    
    if (isNaN(racaId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await RacaService.delete(racaId);
    return res.json({ success: true });
  } catch (err: any) {
    console.error(err);

    if (err.message === 'FOREIGN_KEY_VIOLATION') {
      return res.status(400).json({ error: 'Não é possível excluir a raça pois ela está sendo utilizada' });
    }

    return res.status(500).json({ error: 'Erro ao excluir raça' });
  }
});

export default router;