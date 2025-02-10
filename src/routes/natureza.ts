// routes/naturezaRouter.ts
import { Router } from 'express';
import { NaturezaService } from '../services/NaturezaService';

const router = Router();

// Rota paginada (mantida no topo)
router.get('/paginated', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search?.toString().trim();

    const result = await NaturezaService.getAllPaginated(page, limit, search);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar naturezas' });
  }
});

// Nova posição da rota check-existing (ANTES de /:id)
router.get('/check-existing', async (req, res) => {
  try {
    const exists = await NaturezaService.checkExisting(
      req.query.descricao as string,
      req.query.excludeId ? parseInt(req.query.excludeId as string) : undefined
    );
    res.json({ exists });
  } catch (err) {
    res.status(500).json({ error: 'Erro na verificação' });
  }
});

// Demais rotas (mantidas abaixo)
router.get('/:id', async (req, res) => {
  try {
    const natureza = await NaturezaService.getById(parseInt(req.params.id));
    res.json(natureza);
  } catch (err) {
    res.status(404).json({ error: 'Natureza não encontrada' });
  }
});

router.post('/', async (req, res) => {
  try {
    const result = await NaturezaService.create(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    const status = err.message === 'DUPLICATE_ENTRY' ? 409 : 500;
    res.status(status).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    await NaturezaService.update(parseInt(req.params.id), req.body);
    res.sendStatus(204);
  } catch (err: any) {
    const status = err.message === 'DUPLICATE_ENTRY' ? 409 : 500;
    res.status(status).json({ error: err.message });
  }
});

// Rota de exclusão com tratamento de erro aprimorado
router.delete('/:id', async (req, res) => {
  try {
    await NaturezaService.delete(parseInt(req.params.id));
    res.sendStatus(204);
  } catch (err: any) {
    res.status(500).json({ 
      error: process.env.NODE_ENV === 'production' 
        ? 'Erro ao excluir natureza' 
        : err.message 
    });
  }
});

export default router;