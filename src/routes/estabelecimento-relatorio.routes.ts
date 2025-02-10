import { Router, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { EstabelecimentoRelatorioService } from '../services/estabelecimento-relatorio.service';

interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
  sortKey?: string;
  sortOrder?: string;
}

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const search = req.query.search?.toString() || '';
    const estabelecimentos = await EstabelecimentoRelatorioService.getAll(search);
    
    if (!estabelecimentos.length) {
      return res.json([]);
    }
    
    return res.json(estabelecimentos);
  } catch (error) {
    console.error('Erro na rota GET / (listar todos):', error);
    return res.status(500).json({ error: 'Erro ao buscar estabelecimentos' });
  }
});

router.get(
  '/paginated',
  async (req: Request<ParamsDictionary, {}, {}, PaginationQuery>, res: Response) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const searchTerm = req.query.search?.toString() || '';
      const sortKey = req.query.sortKey?.toString() || 'idestabelecimento';
      const sortOrder = (req.query.sortOrder?.toString() || 'asc') as 'asc' | 'desc';

      if (page < 1 || limit < 1) {
        return res.status(400).json({ error: 'Parâmetros de paginação inválidos' });
      }

      const result = await EstabelecimentoRelatorioService.getAllPaginated(
        page,
        limit,
        searchTerm,
        sortKey,
        sortOrder
      );
      
      return res.json(result);
    } catch (error) {
      console.error('Erro na rota GET /paginated:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Erro na paginação de estabelecimentos',
      });
    }
  }
);

router.get('/export', async (req: Request, res: Response) => {
  try {
    const search = req.query.search?.toString() || '';
    const data = await EstabelecimentoRelatorioService.getAllForExport(search);
    
    if (!data.length) {
      return res.json([]);
    }

    return res.json(data);
  } catch (error) {
    console.error('Erro na rota GET /export:', error);
    return res.status(500).json({ error: 'Erro ao exportar dados' });
  }
});

export default router;