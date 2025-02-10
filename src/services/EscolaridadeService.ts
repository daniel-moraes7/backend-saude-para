import pool from '../database/config';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export const EscolaridadeService = {
  getAll: async () => {
    try {
      const [rows] = await pool.query('SELECT * FROM tipo_escolaridade ORDER BY idescolaridade');
      return rows as RowDataPacket[];
    } catch (error) {
      console.error('Erro ao buscar escolaridades:', error);
      throw new Error('Falha ao carregar lista de escolaridades');
    }
  },

  getAllPaginated: async (page: number, limit: number, searchTerm: string = '') => {
    try {
      const offset = (page - 1) * limit;
      let dataQuery = 'SELECT * FROM tipo_escolaridade';
      let countQuery = 'SELECT COUNT(*) as total FROM tipo_escolaridade';
      const params: any[] = [];
      const searchParams: any[] = [];
  
      if (searchTerm) {
        const searchFilter = ` WHERE descricao LIKE ?`;
        dataQuery += searchFilter;
        countQuery += searchFilter;
        searchParams.push(`%${searchTerm}%`);
      }
  
      dataQuery += ' ORDER BY idescolaridade LIMIT ? OFFSET ?';
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
      console.error('Erro na paginação de escolaridades:', error);
      throw new Error('Falha na paginação de escolaridades');
    }
  },

  getById: async (id: number) => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM tipo_escolaridade WHERE idescolaridade = ?',
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error(`Erro ao buscar escolaridade ${id}:`, error);
      throw new Error(`Falha ao carregar escolaridade ${id}`);
    }
  },

  create: async (descricao: string) => {
    const descricaoTratada = descricao.trim();
    try {
      const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO tipo_escolaridade (descricao) VALUES (?)',
        [descricaoTratada]
      );
      return result;
    } catch (error: any) {
      console.error('Erro ao criar escolaridade:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      
      throw new Error('Falha ao criar nova escolaridade');
    }
  },

  update: async (id: number, descricao: string) => {
    const descricaoTratada = descricao.trim();
    try {
      await pool.query(
        'UPDATE tipo_escolaridade SET descricao = ? WHERE idescolaridade = ?',
        [descricaoTratada, id]
      );
    } catch (error: any) {
      console.error(`Erro ao atualizar escolaridade ${id}:`, error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      
      throw new Error(`Falha ao atualizar escolaridade ${id}`);
    }
  },

  delete: async (id: number) => {
    try {
      await pool.query('DELETE FROM tipo_escolaridade WHERE idescolaridade = ?', [id]);
    } catch (error) {
      console.error(`Erro ao excluir escolaridade ${id}:`, error);
      throw new Error(`Falha ao excluir escolaridade ${id}`);
    }
  },

  checkExisting: async (descricao: string, excludeId?: number) => {
    const descricaoTratada = descricao.trim();
    try {
      let query = 'SELECT idescolaridade FROM tipo_escolaridade WHERE descricao = ?';
      const params: any[] = [descricaoTratada];

      if (excludeId) {
        query += ' AND idescolaridade != ?';
        params.push(excludeId);
      }

      const [rows] = await pool.query<RowDataPacket[]>(query, params);
      return rows.length > 0;
    } catch (error) {
      console.error('Erro ao verificar escolaridade existente:', error);
      throw new Error('Falha na verificação de duplicados');
    }
  }
};