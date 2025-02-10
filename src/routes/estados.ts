// backend/src/routes/estados.ts
import { Router, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { EstadosService } from '../services/EstadosService';
import { ResultSetHeader } from 'mysql2';

interface EstadoBody {
  codigo: string;
  descricao: string;
}

interface CheckExistingQuery {
  codigo?: string;
  descricao?: string;
  excludeId?: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
}

const router = Router();

const validateEstado = (req: Request, res: Response, next: Function) => {
  const { codigo, descricao } = req.body;
  
  if (!codigo?.trim()) {
    return res.status(400).json({ error: 'Código é obrigatório' });
  }

  if (!descricao?.trim()) {
    return res.status(400).json({ error: 'Descrição é obrigatória' });
  }

  if (codigo.length > 5) {
    return res.status(400).json({ error: 'Código deve ter no máximo 5 caracteres' });
  }

  if (descricao.length > 45) {
    return res.status(400).json({ error: 'Descrição deve ter no máximo 45 caracteres' });
  }
  
  return next();
};

router.get('/paginated', async (req: Request<ParamsDictionary, {}, {}, PaginationQuery>, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search?.toString() || '';

    const result = await EstadosService.getAllPaginated(page, limit, search);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro na paginação de estados' });
  }
});

router.get('/check-existing', async (req: Request<ParamsDictionary, {}, {}, CheckExistingQuery>, res: Response) => {
  try {
    const { codigo, descricao, excludeId } = req.query;
    const excludeIdNumber = excludeId ? parseInt(excludeId) : undefined;
    
    if (!codigo?.trim() && !descricao?.trim()) {
      return res.status(400).json({ error: 'Código ou Descrição é obrigatório' });
    }

    let exists = false;
    
    if (codigo?.trim()) {
      exists = await EstadosService.checkExisting(codigo.trim(), excludeIdNumber);
    } else if (descricao?.trim()) {
      exists = await EstadosService.checkExistingDescricao(descricao.trim(), excludeIdNumber);
    }
    
    return res.json({ exists });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro na verificação de duplicatas' });
  }
});

router.get('/', async (_: Request, res: Response) => {
  try {
    const estados = await EstadosService.getAll();
    return res.json(estados);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar estados' });
  }
});

router.get<ParamsDictionary>('/:id', async (req, res) => {
  try {
    const estadoId = Number(req.params.id);
    
    if (isNaN(estadoId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const estado = await EstadosService.getById(estadoId);
    return estado 
      ? res.json(estado)
      : res.status(404).json({ error: 'Estado não encontrado' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar estado' });
  }
});

router.post<ParamsDictionary, {}, EstadoBody>('/', validateEstado, async (req, res) => {
  try {
    const { codigo, descricao } = req.body;

    const result: ResultSetHeader = await EstadosService.create(
      codigo,
      descricao
    );
    
    return res.status(201).json({ 
      id: result.insertId,
      codigo: codigo.trim(),
      descricao: descricao.trim()
    });
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'DUPLICATE_ENTRY') {
      return res.status(409).json({ error: 'Estado já existe' });
    }

    if (err.message.includes('não pode ter mais que')) {
      return res.status(400).json({ error: err.message });
    }
    
    return res.status(500).json({ error: 'Erro ao criar estado' });
  }
});

router.put<ParamsDictionary, {}, EstadoBody>('/:id', validateEstado, async (req, res) => {
  try {
    const estadoId = Number(req.params.id);
    const { codigo, descricao } = req.body;

    if (isNaN(estadoId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await EstadosService.update(
      estadoId,
      codigo,
      descricao
    );
    
    return res.json({ 
      success: true,
      id: estadoId,
      codigo: codigo.trim(),
      descricao: descricao.trim()
    });
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'DUPLICATE_ENTRY') {
      return res.status(409).json({ error: 'Estado já existe' });
    }

    if (err.message.includes('não pode ter mais que')) {
      return res.status(400).json({ error: err.message });
    }
    
    return res.status(500).json({ error: 'Erro ao atualizar estado' });
  }
});

router.delete<ParamsDictionary>('/:id', async (req, res) => {
  try {
    const estadoId = Number(req.params.id);
    
    if (isNaN(estadoId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await EstadosService.delete(estadoId);
    return res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao excluir estado' });
  }
});

export default router;