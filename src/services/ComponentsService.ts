import pool from '../database/config';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export const ComponentsService = {
  getAll: async () => {
    try {
      const [rows] = await pool.query('SELECT * FROM componente ORDER BY idcomponente');
      return rows as RowDataPacket[];
    } catch (error) {
      console.error('Erro ao buscar componentes:', error);
      throw new Error('Falha ao carregar lista de componentes');
    }
  },

  getAllPaginated: async (page: number, limit: number, searchTerm: string = '') => {
    try {
      const offset = (page - 1) * limit;
      let dataQuery = 'SELECT * FROM componente';
      let countQuery = 'SELECT COUNT(*) as total FROM componente';
      const params: any[] = [];
      const searchParams: any[] = [];
  
      if (searchTerm) {
        const searchFilter = ` WHERE descricao LIKE ?`;
        dataQuery += searchFilter;
        countQuery += searchFilter;
        searchParams.push(`%${searchTerm}%`);
      }
  
      dataQuery += ' ORDER BY idcomponente LIMIT ? OFFSET ?';
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
      console.error('Erro na paginação de componentes:', error);
      throw new Error('Falha na paginação de componentes');
    }
  },

  getById: async (id: number) => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM componente WHERE idcomponente = ?',
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error(`Erro ao buscar componente ${id}:`, error);
      throw new Error(`Falha ao carregar componente ${id}`);
    }
  },

  create: async (descricao: string) => {
    const descricaoTratada = descricao.trim();
    try {
      const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO componente (descricao) VALUES (?)',
        [descricaoTratada]
      );
      return result;
    } catch (error: any) {
      console.error('Erro ao criar componente:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      
      throw new Error('Falha ao criar novo componente');
    }
  },

  update: async (id: number, descricao: string) => {
    const descricaoTratada = descricao.trim();
    try {
      await pool.query(
        'UPDATE componente SET descricao = ? WHERE idcomponente = ?',
        [descricaoTratada, id]
      );
    } catch (error: any) {
      console.error(`Erro ao atualizar componente ${id}:`, error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      
      throw new Error(`Falha ao atualizar componente ${id}`);
    }
  },

  delete: async (id: number) => {
    try {
      await pool.query('DELETE FROM componente WHERE idcomponente = ?', [id]);
    } catch (error) {
      console.error(`Erro ao excluir componente ${id}:`, error);
      throw new Error(`Falha ao excluir componente ${id}`);
    }
  },

  checkExisting: async (descricao: string, excludeId?: number) => {
    const descricaoTratada = descricao.trim();
    try {
      let query = 'SELECT idcomponente FROM componente WHERE descricao = ?';
      const params: any[] = [descricaoTratada];

      if (excludeId) {
        query += ' AND idcomponente != ?';
        params.push(excludeId);
      }

      const [rows] = await pool.query<RowDataPacket[]>(query, params);
      return rows.length > 0;
    } catch (error) {
      console.error('Erro ao verificar componente existente:', error);
      throw new Error('Falha na verificação de duplicados');
    }
  }
};