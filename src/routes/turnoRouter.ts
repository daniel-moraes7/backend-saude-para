import { Router, Request, Response } from 'express';
import { TurnoService } from '../services/TurnoService';
import { ParamsDictionary } from 'express-serve-static-core';

// Interfaces de tipos
interface IdParam extends ParamsDictionary {
  id: string;
}

interface TurnoBody {
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

// Middleware de validação
const validateTurno = (req: Request, res: Response, next: Function) => {
  const { descricao } = req.body;
  
  if (!descricao?.trim()) {
    return res.status(400).json({ error: 'Descrição é obrigatória' });
  }
  
  req.body.descricao = descricao.trim();
  return next(); // Corrigido aqui
};

// Endpoint de verificação de duplicatas
router.get('/check-existing', async (req: Request<ParamsDictionary, {}, {}, CheckExistingQuery>, res: Response) => {
  try {
    const { descricao, excludeId } = req.query;
    const excludeIdNumber = excludeId ? parseInt(excludeId) : undefined;
    
    if (!descricao?.trim()) {
      return res.status(400).json({ error: 'Descrição é obrigatória' });
    }

    const exists = await TurnoService.checkExisting(
      descricao.trim(),
      excludeIdNumber
    );
    
    return res.json({ exists });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro na verificação de duplicatas' });
  }
});

// Listagem paginada
router.get('/paginated', async (req: Request<{}, {}, {}, PaginationQuery>, res: Response) => {
  try {
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const search = req.query.search?.trim();

    if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
      return res.status(400).json({ error: 'Parâmetros de paginação inválidos' });
    }

    const result = await TurnoService.getAllPaginated(page, limit, search);
    return res.json(result);
    
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar turnos paginados' });
  }
});

// Obter por ID
router.get('/:id', async (req: Request<IdParam>, res: Response) => {
  try {
    const turnoId = Number(req.params.id);
    
    if (isNaN(turnoId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const turno = await TurnoService.getById(turnoId);
    
    if (!turno) {
      return res.status(404).json({ error: 'Turno não encontrado' });
    }
    return res.json(turno);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar turno' });
  }
});

// Criar novo turno
router.post('/', validateTurno, async (req: Request<{}, any, TurnoBody>, res: Response) => {
  try {
    const { descricao } = req.body;

    const exists = await TurnoService.checkExisting(descricao);
    if (exists) {
      return res.status(409).json({ error: 'Turno já existe' });
    }

    const result = await TurnoService.create({ descricao });
    return res.status(201).json({ 
      id: result.insertId,
      descricao
    });
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'DUPLICATE_ENTRY') {
      return res.status(409).json({ error: 'Turno já existe' });
    }
    
    return res.status(500).json({ error: 'Erro ao criar turno' });
  }
});

// Atualizar turno
router.put<IdParam, any, TurnoBody>('/:id', validateTurno, async (req, res) => {
  try {
    const turnoId = Number(req.params.id);
    const { descricao } = req.body;

    if (isNaN(turnoId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const exists = await TurnoService.checkExisting(descricao, turnoId);
    
    if (exists) {
      return res.status(409).json({ error: 'Turno já existe' });
    }

    await TurnoService.update(turnoId, { descricao });
    return res.json({ 
      success: true,
      id: turnoId,
      descricao
    });
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'DUPLICATE_ENTRY') {
      return res.status(409).json({ error: 'Turno já existe' });
    }
    
    return res.status(500).json({ error: 'Erro ao atualizar turno' });
  }
});

// Excluir turno
router.delete('/:id', async (req: Request<IdParam>, res: Response) => {
  try {
    const turnoId = Number(req.params.id);
    
    if (isNaN(turnoId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await TurnoService.delete(turnoId);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao excluir turno' });
  }
});

export default router;