// backend/src/routes/cbo.ts
import { Router, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { CBOService } from '../services/CBOService';
import { ResultSetHeader } from 'mysql2';

interface CBOBody {
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

const validateCBO = (req: Request, res: Response, next: Function) => {
 const { codigo, descricao } = req.body;
 
 if (!codigo?.trim()) {
   return res.status(400).json({ error: 'Código é obrigatório' });
 }

 if (!descricao?.trim()) {
   return res.status(400).json({ error: 'Descrição é obrigatória' });
 }

 if (codigo.length > 15) {
   return res.status(400).json({ error: 'Código deve ter no máximo 15 caracteres' });
 }

 if (descricao.length > 100) {
   return res.status(400).json({ error: 'Descrição deve ter no máximo 100 caracteres' });
 }
 
 return next();
};

router.get('/paginated', async (req: Request<ParamsDictionary, {}, {}, PaginationQuery>, res: Response) => {
 try {
   const page = Number(req.query.page) || 1;
   const limit = Number(req.query.limit) || 10;
   const search = req.query.search?.toString() || '';

   const result = await CBOService.getAllPaginated(page, limit, search);
   return res.json(result);
 } catch (error) {
   console.error(error);
   return res.status(500).json({ error: 'Erro na paginação de CBOs' });
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
     exists = await CBOService.checkExisting(codigo.trim(), excludeIdNumber);
   } else if (descricao?.trim()) {
     exists = await CBOService.checkExistingDescricao(descricao.trim(), excludeIdNumber);
   }
   
   return res.json({ exists });
 } catch (err) {
   console.error(err);
   return res.status(500).json({ error: 'Erro na verificação de duplicatas' });
 }
});

router.get('/', async (_: Request, res: Response) => {
 try {
   const cbos = await CBOService.getAll();
   return res.json(cbos);
 } catch (err) {
   console.error(err);
   return res.status(500).json({ error: 'Erro ao buscar CBOs' });
 }
});

router.get<ParamsDictionary>('/:id', async (req, res) => {
 try {
   const cboId = Number(req.params.id);
   
   if (isNaN(cboId)) {
     return res.status(400).json({ error: 'ID inválido' });
   }

   const cbo = await CBOService.getById(cboId);
   return cbo 
     ? res.json(cbo)
     : res.status(404).json({ error: 'CBO não encontrado' });
 } catch (err) {
   console.error(err);
   return res.status(500).json({ error: 'Erro ao buscar CBO' });
 }
});

router.post<ParamsDictionary, {}, CBOBody>('/', validateCBO, async (req, res) => {
 try {
   const { codigo, descricao } = req.body;

   const result: ResultSetHeader = await CBOService.create(
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
     return res.status(409).json({ error: 'CBO já existe' });
   }

   if (err.message === 'DUPLICATE_DESCRIPTION') {
     return res.status(409).json({ error: 'Já existe um CBO com essa descrição' });
   }

   if (err.message.includes('não pode ter mais que')) {
     return res.status(400).json({ error: err.message });
   }
   
   return res.status(500).json({ error: 'Erro ao criar CBO' });
 }
});

router.put<ParamsDictionary, {}, CBOBody>('/:id', validateCBO, async (req, res) => {
 try {
   const cboId = Number(req.params.id);
   const { codigo, descricao } = req.body;

   if (isNaN(cboId)) {
     return res.status(400).json({ error: 'ID inválido' });
   }

   await CBOService.update(
     cboId,
     codigo,
     descricao
   );

   return res.json({ 
     success: true,
     id: cboId,
     codigo: codigo.trim(),
     descricao: descricao.trim()
   });
 } catch (err: any) {
   console.error(err);
   
   if (err.message === 'DUPLICATE_ENTRY') {
     return res.status(409).json({ error: 'CBO já existe' });
   }

   if (err.message === 'DUPLICATE_DESCRIPTION') {
     return res.status(409).json({ error: 'Já existe um CBO com essa descrição' });
   }

   if (err.message.includes('não pode ter mais que')) {
     return res.status(400).json({ error: err.message });
   }
   
   return res.status(500).json({ error: 'Erro ao atualizar CBO' });
 }
});

router.delete<ParamsDictionary>('/:id', async (req, res) => {
 try {
   const cboId = Number(req.params.id);
   
   if (isNaN(cboId)) {
     return res.status(400).json({ error: 'ID inválido' });
   }

   await CBOService.delete(cboId);
   return res.json({ success: true });
 } catch (err: any) {
   console.error(err);
   return res.status(500).json({ error: 'Erro ao excluir CBO' });
 }
});

export default router;