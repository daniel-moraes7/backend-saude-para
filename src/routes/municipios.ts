// backend/src/routes/municipios.ts
import { Router, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { MunicipiosService } from '../services/MunicipiosService';
import { ResultSetHeader } from 'mysql2';

interface Municipio {
  codigo: string;
  descricao: string;
  tipo_estado_idtipo_estado: number;
}

interface CheckExistingQuery {
  codigo?: string;
  descricao?: string;
  estadoId?: string;
  excludeId?: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
  tipo_estado?: string;
}

const router = Router();

const validateMunicipio = (req: Request, res: Response, next: Function) => {
  const { codigo, descricao, tipo_estado_idtipo_estado } = req.body;
  
  if (!codigo?.trim()) {
    return res.status(400).json({ error: 'Código é obrigatório' });
  }

  if (!descricao?.trim()) {
    return res.status(400).json({ error: 'Descrição é obrigatória' });
  }

  if (!tipo_estado_idtipo_estado) {
    return res.status(400).json({ error: 'Estado é obrigatório' });
  }

  if (codigo.length > 10) {
    return res.status(400).json({ error: 'Código deve ter no máximo 10 caracteres' });
  }

  if (descricao.length > 60) {
    return res.status(400).json({ error: 'Descrição deve ter no máximo 60 caracteres' });
  }
  
  return next();
};

router.get('/paginated', async (req: Request<ParamsDictionary, {}, {}, PaginationQuery>, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search?.toString() || '';
    const tipoEstado = req.query.tipo_estado ? Number(req.query.tipo_estado) : undefined;

    const result = await MunicipiosService.getAllPaginated(page, limit, search, tipoEstado);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro na paginação de municípios' });
  }
});

router.get('/check-existing', async (req: Request<ParamsDictionary, {}, {}, CheckExistingQuery>, res: Response) => {
  try {
    const { codigo, descricao, estadoId, excludeId } = req.query;
    const excludeIdNumber = excludeId ? parseInt(excludeId) : undefined;
    const estadoIdNumber = estadoId ? parseInt(estadoId) : undefined;
    
    if (!codigo?.trim() && (!descricao?.trim() || !estadoId)) {
      return res.status(400).json({ error: 'Código ou (Descrição e Estado) são obrigatórios' });
    }

    let exists = false;
    if (codigo?.trim()) {
      exists = await MunicipiosService.checkExisting(codigo.trim(), excludeIdNumber);
    } else if (descricao?.trim() && estadoIdNumber) {
      exists = await MunicipiosService.checkExistingDescricao(descricao.trim(), estadoIdNumber, excludeIdNumber);
    }
    
    return res.json({ exists });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro na verificação de duplicatas' });
  }
});

router.get('/by-estado/:estadoId', async (req: Request, res: Response) => {
  try {
    const estadoId = Number(req.params.estadoId);
    
    if (isNaN(estadoId)) {
      return res.status(400).json({ error: 'ID do estado inválido' });
    }

    const municipios = await MunicipiosService.getByEstado(estadoId);
    return res.json(municipios);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar municípios do estado' });
  }
});

router.get('/', async (_: Request, res: Response) => {
  try {
    const municipios = await MunicipiosService.getAll();
    return res.json(municipios);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar municípios' });
  }
});

router.get<ParamsDictionary>('/:id', async (req, res) => {
  try {
    const municipioId = Number(req.params.id);
    
    if (isNaN(municipioId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const municipio = await MunicipiosService.getById(municipioId);
    return municipio 
      ? res.json(municipio)
      : res.status(404).json({ error: 'Município não encontrado' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar município' });
  }
});

router.post<ParamsDictionary, {}, Municipio>('/', validateMunicipio, async (req, res) => {
  try {
    const { codigo, descricao, tipo_estado_idtipo_estado } = req.body;

    const result: ResultSetHeader = await MunicipiosService.create(
      codigo,
      descricao,
      tipo_estado_idtipo_estado
    );

    return res.status(201).json({ 
      id: result.insertId,
      codigo: codigo.trim(),
      descricao: descricao.trim(),
      tipo_estado_idtipo_estado
    });
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'DUPLICATE_ENTRY') {
      return res.status(409).json({ error: 'Município já existe' });
    }
    
    if (err.message === 'ESTADO_NAO_ENCONTRADO') {
      return res.status(400).json({ error: 'Estado não encontrado' });
    }
    
    return res.status(500).json({ error: 'Erro ao criar município' });
  }
});

router.put<ParamsDictionary, {}, Municipio>('/:id', validateMunicipio, async (req, res) => {
  try {
    const municipioId = Number(req.params.id);
    const { codigo, descricao, tipo_estado_idtipo_estado } = req.body;

    if (isNaN(municipioId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await MunicipiosService.update(
      municipioId,
      codigo,
      descricao,
      tipo_estado_idtipo_estado
    );

    return res.json({ 
      success: true,
      id: municipioId,
      codigo: codigo.trim(),
      descricao: descricao.trim(),
      tipo_estado_idtipo_estado
    });
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'DUPLICATE_ENTRY') {
      return res.status(409).json({ error: 'Município já existe' });
    }

    if (err.message === 'ESTADO_NAO_ENCONTRADO') {
      return res.status(400).json({ error: 'Estado não encontrado' });
    }
    
    return res.status(500).json({ error: 'Erro ao atualizar município' });
  }
});

router.delete<ParamsDictionary>('/:id', async (req, res) => {
  try {
    const municipioId = Number(req.params.id);
    
    if (isNaN(municipioId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await MunicipiosService.delete(municipioId);
    return res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao excluir município' });
  }
});

export default router;