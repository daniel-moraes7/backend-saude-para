import pool from '../database/config';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export const RacaService = {
  getAll: async () => {
    try {
      const [rows] = await pool.query('SELECT * FROM tipo_raca ORDER BY idtipo_raca');
      return rows as RowDataPacket[];
    } catch (error) {
      console.error('Erro ao buscar raças:', error);
      throw new Error('Falha ao carregar lista de raças');
    }
  },

  getAllPaginated: async (page: number, limit: number, searchTerm: string = '') => {
    try {
      const offset = (page - 1) * limit;
      let dataQuery = 'SELECT * FROM tipo_raca';
      let countQuery = 'SELECT COUNT(*) as total FROM tipo_raca';
      const params: any[] = [];
      const searchParams: any[] = [];
  
      if (searchTerm) {
        const searchFilter = ` WHERE descricao LIKE ?`;
        dataQuery += searchFilter;
        countQuery += searchFilter;
        searchParams.push(`%${searchTerm}%`);
      }
  
      dataQuery += ' ORDER BY idtipo_raca LIMIT ? OFFSET ?';
      params.push(...searchParams, limit, offset);
  
      // Executar queries em paralelo
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
      console.error('Erro na paginação de raças:', error);
      throw new Error('Falha na paginação de raças');
    }
  },

  getById: async (id: number) => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM tipo_raca WHERE idtipo_raca = ?',
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error(`Erro ao buscar raça ${id}:`, error);
      throw new Error(`Falha ao carregar raça ${id}`);
    }
  },

  create: async (descricao: string) => {
    const descricaoTratada = descricao.trim();
    if (descricaoTratada.length > 15) {
      throw new Error('A descrição não pode ter mais que 15 caracteres');
    }
    try {
      const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO tipo_raca (descricao) VALUES (?)',
        [descricaoTratada]
      );
      return result;
    } catch (error: any) {
      console.error('Erro ao criar raça:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      
      throw new Error('Falha ao criar nova raça');
    }
  },

  update: async (id: number, descricao: string) => {
    const descricaoTratada = descricao.trim();
    if (descricaoTratada.length > 15) {
      throw new Error('A descrição não pode ter mais que 15 caracteres');
    }
    try {
      await pool.query(
        'UPDATE tipo_raca SET descricao = ? WHERE idtipo_raca = ?',
        [descricaoTratada, id]
      );
    } catch (error: any) {
      console.error(`Erro ao atualizar raça ${id}:`, error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      
      throw new Error(`Falha ao atualizar raça ${id}`);
    }
  },

  delete: async (id: number) => {
    try {
      await pool.query('DELETE FROM tipo_raca WHERE idtipo_raca = ?', [id]);
    } catch (error) {
      console.error(`Erro ao excluir raça ${id}:`, error);
      throw new Error(`Falha ao excluir raça ${id}`);
    }
  },

  checkExisting: async (descricao: string, excludeId?: number) => {
    const descricaoTratada = descricao.trim();
    try {
      let query = 'SELECT idtipo_raca FROM tipo_raca WHERE descricao = ?';
      const params: any[] = [descricaoTratada];

      if (excludeId) {
        query += ' AND idtipo_raca != ?';
        params.push(excludeId);
      }

      const [rows] = await pool.query<RowDataPacket[]>(query, params);
      return rows.length > 0;
    } catch (error) {
      console.error('Erro ao verificar raça existente:', error);
      throw new Error('Falha na verificação de duplicados');
    }
  }
};