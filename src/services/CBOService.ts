// backend/src/services/CBOService.ts
import pool from '../database/config';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export const CBOService = {
 getAll: async () => {
   try {
     const [rows] = await pool.query('SELECT * FROM tipo_cbo ORDER BY idtipo_cbo');
     return rows as RowDataPacket[];
   } catch (error) {
     console.error('Erro ao buscar CBOs:', error);
     throw new Error('Falha ao carregar lista de CBOs');
   }
 },

 getAllPaginated: async (page: number, limit: number, searchTerm: string = '') => {
   try {
     const offset = (page - 1) * limit;
     let dataQuery = 'SELECT * FROM tipo_cbo';
     let countQuery = 'SELECT COUNT(*) as total FROM tipo_cbo';
     const params: any[] = [];
     const searchParams: any[] = [];
 
     if (searchTerm) {
       const searchFilter = ` WHERE codigo LIKE ? OR descricao LIKE ?`;
       dataQuery += searchFilter;
       countQuery += searchFilter;
       searchParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
     }
 
     dataQuery += ' ORDER BY idtipo_cbo LIMIT ? OFFSET ?';
     params.push(...searchParams, limit, offset);
 
     const [dataRows] = await pool.query<RowDataPacket[]>(dataQuery, params);
     const [countResult] = await pool.query<RowDataPacket[]>(countQuery, searchParams);
 
     const total = countResult[0]?.total || 0;
     const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
 
     return {
       data: dataRows,
       meta: {
         total,
         totalPages,
         page,
         limit
       }
     };
   } catch (error) {
     console.error('Erro na paginação de CBOs:', error);
     throw new Error('Falha na paginação de CBOs');
   }
 },

 getById: async (id: number) => {
   try {
     const [rows] = await pool.query<RowDataPacket[]>(
       'SELECT * FROM tipo_cbo WHERE idtipo_cbo = ?',
       [id]
     );
     return rows[0];
   } catch (error) {
     console.error(`Erro ao buscar CBO ${id}:`, error);
     throw new Error(`Falha ao carregar CBO ${id}`);
   }
 },

 create: async (codigo: string, descricao: string) => {
   const codigoTratado = codigo.trim();
   const descricaoTratada = descricao.trim();
   
   if (codigoTratado.length > 15) {
     throw new Error('O código não pode ter mais que 15 caracteres');
   }
   if (descricaoTratada.length > 100) {
     throw new Error('A descrição não pode ter mais que 100 caracteres');
   }

   try {
     const [result] = await pool.query<ResultSetHeader>(
       'INSERT INTO tipo_cbo (codigo, descricao) VALUES (?, ?)',
       [codigoTratado, descricaoTratada]
     );
     return result;
   } catch (error: any) {
     console.error('Erro ao criar CBO:', error);
     
     if (error.code === 'ER_DUP_ENTRY') {
       if (error.message.includes('descricao')) {
         throw new Error('DUPLICATE_DESCRIPTION');
       }
       throw new Error('DUPLICATE_ENTRY');
     }
     
     throw new Error('Falha ao criar novo CBO');
   }
 },

 update: async (id: number, codigo: string, descricao: string) => {
   const codigoTratado = codigo.trim();
   const descricaoTratada = descricao.trim();
   
   if (codigoTratado.length > 15) {
     throw new Error('O código não pode ter mais que 15 caracteres');
   }
   if (descricaoTratada.length > 100) {
     throw new Error('A descrição não pode ter mais que 100 caracteres');
   }

   try {
     await pool.query(
       'UPDATE tipo_cbo SET codigo = ?, descricao = ? WHERE idtipo_cbo = ?',
       [codigoTratado, descricaoTratada, id]
     );
   } catch (error: any) {
     console.error(`Erro ao atualizar CBO ${id}:`, error);
     
     if (error.code === 'ER_DUP_ENTRY') {
       if (error.message.includes('descricao')) {
         throw new Error('DUPLICATE_DESCRIPTION');
       }
       throw new Error('DUPLICATE_ENTRY');
     }
     
     throw new Error(`Falha ao atualizar CBO ${id}`);
   }
 },

 delete: async (id: number) => {
   try {
     await pool.query('DELETE FROM tipo_cbo WHERE idtipo_cbo = ?', [id]);
   } catch (error) {
     console.error(`Erro ao excluir CBO ${id}:`, error);
     throw new Error(`Falha ao excluir CBO ${id}`);
   }
 },

 checkExisting: async (codigo: string, excludeId?: number) => {
   const codigoTratado = codigo.trim();
   try {
     let query = 'SELECT idtipo_cbo FROM tipo_cbo WHERE codigo = ?';
     const params: any[] = [codigoTratado];

     if (excludeId) {
       query += ' AND idtipo_cbo != ?';
       params.push(excludeId);
     }

     const [rows] = await pool.query<RowDataPacket[]>(query, params);
     return rows.length > 0;
   } catch (error) {
     console.error('Erro ao verificar CBO existente:', error);
     throw new Error('Falha na verificação de duplicados');
   }
 },

 checkExistingDescricao: async (descricao: string, excludeId?: number) => {
   const descricaoTratada = descricao.trim();
   try {
     let query = 'SELECT idtipo_cbo FROM tipo_cbo WHERE descricao = ?';
     const params: any[] = [descricaoTratada];

     if (excludeId) {
       query += ' AND idtipo_cbo != ?';
       params.push(excludeId);
     }

     const [rows] = await pool.query<RowDataPacket[]>(query, params);
     return rows.length > 0;
   } catch (error) {
     console.error('Erro ao verificar descrição de CBO existente:', error);
     throw new Error('Falha na verificação de duplicados');
   }
 }
};