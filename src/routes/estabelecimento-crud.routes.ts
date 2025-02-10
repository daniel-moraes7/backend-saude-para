// src/routes/estabelecimento-crud.routes.ts

import { Router, Request, Response } from 'express';
import { EstabelecimentoCrudService, BusinessError } from '../services/estabelecimento-crud.service';

const router = Router();

/**
 * Rotas para obtenção dos dados das tabelas de referência
 */

// Tipo de Estabelecimento
router.get('/tipo-estabelecimento', async (_req, res) => {
  try {
    const result = await EstabelecimentoCrudService.getTiposEstabelecimento();
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar tipos de estabelecimento:', error);
    res.status(500).json({ error: 'Erro ao buscar tipos de estabelecimento' });
  }
});

// Naturezas
router.get('/natureza', async (_req, res) => {
  try {
    const result = await EstabelecimentoCrudService.getNaturezas();
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar naturezas:', error);
    res.status(500).json({ error: 'Erro ao buscar naturezas' });
  }
});

// Turnos
router.get('/turnos', async (_req, res) => {
  try {
    const result = await EstabelecimentoCrudService.getTurnos();
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar turnos:', error);
    res.status(500).json({ error: 'Erro ao buscar turnos' });
  }
});

// Tipo Habilitação
router.get('/tipo-habilitacao', async (_req, res) => {
  try {
    const result = await EstabelecimentoCrudService.getHabilitacoes();
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar habilitações:', error);
    res.status(500).json({ error: 'Erro ao buscar habilitações' });
  }
});

// Tipo Qualificação
router.get('/tipo-qualificacao', async (_req, res) => {
  try {
    const result = await EstabelecimentoCrudService.getQualificacoes();
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar qualificações:', error);
    res.status(500).json({ error: 'Erro ao buscar qualificações' });
  }
});

/**
 * Rotas de CRUD para Estabelecimento
 */

// Obter um estabelecimento por ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const result = await EstabelecimentoCrudService.getById(id);
    if (!result) {
      return res.status(404).json({ error: 'Estabelecimento não encontrado' });
    }
    return res.json(result);
  } catch (error) {
    console.error('Erro ao buscar estabelecimento:', error);
    return res.status(500).json({ error: 'Erro ao buscar estabelecimento' });
  }
});

// Criar um novo estabelecimento
router.post('/', async (req: Request, res: Response) => {
  try {
    console.log('Dados recebidos para criação:', req.body);

    // Validações simples antes de chamar o serviço
    if (!req.body.nome) {
      return res.status(400).json({ errors: ['O campo Nome é obrigatório'] });
    }
    if (req.body.ativo === 'S' && (!req.body.latitude || !req.body.longitude)) {
      return res.status(400).json({ errors: ['Latitude e Longitude são obrigatórias para ativação'] });
    }

    const novoEstabelecimento = await EstabelecimentoCrudService.create({
      ...req.body,
      cnes: req.body.cnes || null // Garante que o valor de cnes seja null se não informado
    });

    return res.status(201).json(novoEstabelecimento);
  } catch (error: any) {
    console.error('Erro no processamento do POST:', error);

    if (error instanceof BusinessError) {
      return res.status(400).json({ errors: [error.message] });
    }
    if (error.errors && Array.isArray(error.errors)) {
      return res.status(400).json({ errors: error.errors });
    }
    return res.status(500).json({ errors: [error.message || 'Erro interno do servidor'] });
  }
});

// Rota para verificar duplicidade
router.post('/check-duplicate', async (req: Request, res: Response) => {
  try {
    // Extrai os parâmetros do body
    const { field, value, excludeId } = req.body;
    
    if (!field || !value) {
      return res.status(400).json({ error: "Parâmetros 'field' e 'value' são obrigatórios." });
    }
    
    // Dependendo do campo, passamos os valores para a função de verificação
    const isDuplicate = await EstabelecimentoCrudService.checkDuplicates(
      field === 'codigo_unidade' ? value : '',
      field === 'cnes' ? value : '',
      field === 'cnpj' ? value : '',
      excludeId
    );
    
    return res.json({ isDuplicate, field });
  } catch (error) {
    console.error("Erro na rota check-duplicate:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Erro desconhecido" });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    console.log('PUT request para ID:', id);
    console.log('Body recebido:', req.body);

    if (isNaN(id)) {
      throw new BusinessError('ID inválido');
    }

    const atualizado = await EstabelecimentoCrudService.update(id, req.body);
    console.log('Atualização concluída:', atualizado);
    
    return res.json(atualizado);
  } catch (error: any) {
    console.error('Erro detalhado na rota PUT:', error);
    const status = error instanceof BusinessError ? 400 : 500;
    return res.status(status).json({ 
      errors: [error.message || 'Erro interno do servidor'],
      details: error.stack
    });
  }
});

// Excluir um estabelecimento
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await EstabelecimentoCrudService.delete(id);
    return res.json({ success: true });
  } catch (error) {
    console.error('Erro na exclusão do estabelecimento:', error);
    const status = error instanceof BusinessError ? 400 : 500;
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return res.status(status).json({ error: errorMessage });
  }
});

export default router;
