// backend/src/routes/paises.ts
import { Router, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { PaisesService } from '../services/PaisesService';
import { ResultSetHeader } from 'mysql2';

interface PaisBody {
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

const validatePais = (req: Request, res: Response, next: Function) => {
  const { descricao } = req.body;
  
  if (!descricao?.trim()) {
    return res.status(400).json({ error: 'Descrição é obrigatória' });
  }
  
  if (descricao.length > 50) {
    return res.status(400).json({ error: 'Descrição deve ter no máximo 50 caracteres' });
  }
  
  return next();
};

router.get('/paginated', async (req: Request<ParamsDictionary, {}, {}, PaginationQuery>, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search?.toString() || '';

    const result = await PaisesService.getAllPaginated(page, limit, search);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro na paginação de países' });
  }
});

router.get('/check-existing', async (req: Request<ParamsDictionary, {}, {}, CheckExistingQuery>, res: Response) => {
  try {
    const { descricao, excludeId } = req.query;
    const excludeIdNumber = excludeId ? parseInt(excludeId) : undefined;
    
    if (!descricao?.trim()) {
      return res.status(400).json({ error: 'Descrição é obrigatória' });
    }

    const exists = await PaisesService.checkExisting(descricao.trim(), excludeIdNumber);
    return res.json({ exists });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro na verificação de duplicatas' });
  }
});

router.get('/', async (_: Request, res: Response) => {
  try {
    const paises = await PaisesService.getAll();
    return res.json(paises);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar países' });
  }
});

router.get<ParamsDictionary>('/:id', async (req, res) => {
  try {
    const paisId = Number(req.params.id);
    
    if (isNaN(paisId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const pais = await PaisesService.getById(paisId);
    return pais 
      ? res.json(pais)
      : res.status(404).json({ error: 'País não encontrado' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar país' });
  }
});

router.post<ParamsDictionary, {}, PaisBody>('/', validatePais, async (req, res) => {
  try {
    const { descricao } = req.body;

    const result: ResultSetHeader = await PaisesService.create(descricao);
    
    return res.status(201).json({ 
      id: result.insertId,
      descricao: descricao.trim()
    });
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'DUPLICATE_ENTRY') {
      return res.status(409).json({ error: 'País já existe' });
    }

    if (err.message.includes('não pode ter mais que')) {
      return res.status(400).json({ error: err.message });
    }
    
    return res.status(500).json({ error: 'Erro ao criar país' });
  }
});

router.put<ParamsDictionary, {}, PaisBody>('/:id', validatePais, async (req, res) => {
  try {
    const paisId = Number(req.params.id);
    const { descricao } = req.body;

    if (isNaN(paisId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await PaisesService.update(paisId, descricao);
    
    return res.json({ 
      success: true,
      id: paisId,
      descricao: descricao.trim()
    });
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'DUPLICATE_ENTRY') {
      return res.status(409).json({ error: 'País já existe' });
    }

    if (err.message.includes('não pode ter mais que')) {
      return res.status(400).json({ error: err.message });
    }
    
    return res.status(500).json({ error: 'Erro ao atualizar país' });
  }
});

router.delete<ParamsDictionary>('/:id', async (req, res) => {
  try {
    const paisId = Number(req.params.id);
    
    if (isNaN(paisId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await PaisesService.delete(paisId);
    return res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao excluir país' });
  }
});

export default router;