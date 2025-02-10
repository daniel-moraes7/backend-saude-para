import { Router, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { TipoQualificacaoService } from '../services/TipoQualificacaoService';

interface TipoQualificacaoBody {
  descricao: string;
  idcomponente: number;
}

interface CheckExistingQuery {
  descricao: string;
  idcomponente: string;
  excludeId?: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
}

const router = Router();

const validateQualificacao = (req: Request, res: Response, next: Function) => {
  const { descricao, idcomponente } = req.body;
  
  const errors = [];
  
  if (!descricao?.trim()) {
    errors.push('Descrição é obrigatória');
  }
  
  if (!idcomponente || isNaN(Number(idcomponente))) {
    errors.push('Componente inválido ou não informado');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  // Adicionar dados tratados ao request
  req.body.descricao = descricao.trim();
  req.body.idcomponente = Number(idcomponente);
  
  return next();
};

// Endpoint de paginação
router.get('/paginated', async (req: Request<ParamsDictionary, {}, {}, PaginationQuery>, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search?.toString() || '';

    const result = await TipoQualificacaoService.getAllPaginated(page, limit, search);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro na paginação de qualificações' });
  }
});

router.get('/check-existing', async (req: Request<ParamsDictionary, {}, {}, CheckExistingQuery>, res: Response) => {
  try {
    const { descricao, idcomponente, excludeId } = req.query;
    
    if (!descricao || !idcomponente) {
      return res.status(400).json({ error: 'Descrição e componente são obrigatórios' });
    }

    const exists = await TipoQualificacaoService.checkExisting(
      descricao.trim(),
      Number(idcomponente),
      excludeId ? Number(excludeId) : undefined
    );
    
    return res.json({ exists });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro na verificação de duplicatas' });
  }
});

router.get('/', async (req: Request<ParamsDictionary, {}, {}, { search?: string }>, res: Response) => {
  try {
    const searchTerm = req.query.search?.toString() || '';
    const qualificacoes = await TipoQualificacaoService.getAll(searchTerm);
    return res.json(qualificacoes);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar qualificações' });
  }
});

router.get<ParamsDictionary>('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const qualificacao = await TipoQualificacaoService.getById(id);
    return qualificacao 
      ? res.json(qualificacao)
      : res.status(404).json({ error: 'Qualificação não encontrada' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar qualificação' });
  }
});

router.post<ParamsDictionary, {}, TipoQualificacaoBody>('/', validateQualificacao, async (req, res) => {
  try {
    const { descricao, idcomponente } = req.body;

    const exists = await TipoQualificacaoService.checkExisting(descricao, idcomponente);
    if (exists) {
      return res.status(409).json({ error: 'Qualificação já existe para este componente' });
    }

    const result = await TipoQualificacaoService.create({ descricao, idcomponente });
    return res.status(201).json({
      id: result.insertId,
      descricao,
      idcomponente
    });
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'DUPLICATE_ENTRY') {
      return res.status(409).json({ error: 'Qualificação já existe para este componente' });
    }
    
    return res.status(500).json({ error: 'Erro ao criar qualificação' });
  }
});

router.put<ParamsDictionary, {}, Partial<TipoQualificacaoBody>>('/:id', validateQualificacao, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { descricao, idcomponente } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const exists = await TipoQualificacaoService.checkExisting(
      descricao!,
      idcomponente!,
      id
    );
    
    if (exists) {
      return res.status(409).json({ error: 'Qualificação já existe para este componente' });
    }

    await TipoQualificacaoService.update(id, { descricao, idcomponente });
    return res.json({ 
      success: true,
      id,
      descricao,
      idcomponente
    });
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'DUPLICATE_ENTRY') {
      return res.status(409).json({ error: 'Qualificação já existe para este componente' });
    }
    
    if (err.message.includes('não encontrada')) {
      return res.status(404).json({ error: err.message });
    }
    
    return res.status(500).json({ error: 'Erro ao atualizar qualificação' });
  }
});

router.delete<ParamsDictionary>('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await TipoQualificacaoService.delete(id);
    return res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'DEPENDENCY_ERROR') {
      return res.status(409).json({ 
        error: 'Não é possível excluir, existem dependências relacionadas' 
      });
    }
    
    if (err.message.includes('não encontrada')) {
      return res.status(404).json({ error: err.message });
    }
    
    return res.status(500).json({ error: 'Erro ao excluir qualificação' });
  }
});

export default router;