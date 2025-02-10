import { Router, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ComponentsService } from '../services/ComponentsService';
import { ResultSetHeader } from 'mysql2';

interface ComponenteBody {
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

const validateComponent = (req: Request, res: Response, next: Function) => {
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

    const result = await ComponentsService.getAllPaginated(page, limit, search);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro na paginação de componentes' });
  }
});

router.get('/check-existing', async (req: Request<ParamsDictionary, {}, {}, CheckExistingQuery>, res: Response) => {
  try {
    const { descricao, excludeId } = req.query;
    const excludeIdNumber = excludeId ? parseInt(excludeId) : undefined;
    
    if (!descricao?.trim()) {
      return res.status(400).json({ error: 'Descrição é obrigatória' });
    }

    const exists = await ComponentsService.checkExisting(
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
    const componentes = await ComponentsService.getAll();
    return res.json(componentes);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar componentes' });
  }
});

router.get<ParamsDictionary>('/:id', async (req, res) => {
  try {
    const componenteId = Number(req.params.id);
    
    if (isNaN(componenteId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const componente = await ComponentsService.getById(componenteId);
    return componente 
      ? res.json(componente)
      : res.status(404).json({ error: 'Componente não encontrado' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar componente' });
  }
});

router.post<ParamsDictionary, {}, ComponenteBody>('/', validateComponent, async (req, res) => {
  try {
    const { descricao } = req.body;
    const descricaoTratada = descricao.trim();

    const exists = await ComponentsService.checkExisting(descricaoTratada);
    if (exists) {
      return res.status(409).json({ error: 'Componente já existe' });
    }

    const result: ResultSetHeader = await ComponentsService.create(descricaoTratada);
    return res.status(201).json({ 
      id: result.insertId,
      descricao: descricaoTratada
    });
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'DUPLICATE_ENTRY') {
      return res.status(409).json({ error: 'Componente já existe' });
    }
    
    return res.status(500).json({ error: 'Erro ao criar componente' });
  }
});

router.put<ParamsDictionary, {}, ComponenteBody>('/:id', validateComponent, async (req, res) => {
  try {
    const componenteId = Number(req.params.id);
    const { descricao } = req.body;
    const descricaoTratada = descricao.trim();

    if (isNaN(componenteId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const exists = await ComponentsService.checkExisting(
      descricaoTratada, 
      componenteId
    );
    
    if (exists) {
      return res.status(409).json({ error: 'Componente já existe' });
    }

    await ComponentsService.update(componenteId, descricaoTratada);
    return res.json({ 
      success: true,
      id: componenteId,
      descricao: descricaoTratada
    });
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'DUPLICATE_ENTRY') {
      return res.status(409).json({ error: 'Componente já existe' });
    }
    
    return res.status(500).json({ error: 'Erro ao atualizar componente' });
  }
});

router.delete<ParamsDictionary>('/:id', async (req, res) => {
  try {
    const componenteId = Number(req.params.id);
    
    if (isNaN(componenteId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await ComponentsService.delete(componenteId);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao excluir componente' });
  }
});

export default router;