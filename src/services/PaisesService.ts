import pool from '../database/config';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export const PaisesService = {
  getAll: async () => {
    try {
      const [rows] = await pool.query('SELECT * FROM tipo_pais ORDER BY idtipo_pais');
      return rows as RowDataPacket[];
    } catch (error) {
      console.error('Erro ao buscar países:', error);
      throw new Error('Falha ao carregar lista de países');
    }
  },

  getAllPaginated: async (page: number, limit: number, searchTerm: string = '') => {
    try {
      const offset = (page - 1) * limit;
      let dataQuery = 'SELECT * FROM tipo_pais';
      let countQuery = 'SELECT COUNT(*) as total FROM tipo_pais';
      const params: any[] = [];
      const searchParams: any[] = [];
  
      if (searchTerm) {
        const searchFilter = ` WHERE descricao LIKE ?`;
        dataQuery += searchFilter;
        countQuery += searchFilter;
        searchParams.push(`%${searchTerm}%`);
      }
  
      dataQuery += ' ORDER BY idtipo_pais LIMIT ? OFFSET ?';
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
      console.error('Erro na paginação de países:', error);
      throw new Error('Falha na paginação de países');
    }
  },

  getById: async (id: number) => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM tipo_pais WHERE idtipo_pais = ?',
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error(`Erro ao buscar país ${id}:`, error);
      throw new Error(`Falha ao carregar país ${id}`);
    }
  },

  create: async (descricao: string) => {
    const descricaoTratada = descricao.trim();
    
    if (descricaoTratada.length > 50) {
      throw new Error('A descrição não pode ter mais que 50 caracteres');
    }

    try {
      const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO tipo_pais (descricao) VALUES (?)',
        [descricaoTratada]
      );
      return result;
    } catch (error: any) {
      console.error('Erro ao criar país:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      
      throw new Error('Falha ao criar novo país');
    }
  },

  update: async (id: number, descricao: string) => {
    const descricaoTratada = descricao.trim();
    
    if (descricaoTratada.length > 50) {
      throw new Error('A descrição não pode ter mais que 50 caracteres');
    }

    try {
      await pool.query(
        'UPDATE tipo_pais SET descricao = ? WHERE idtipo_pais = ?',
        [descricaoTratada, id]
      );
    } catch (error: any) {
      console.error(`Erro ao atualizar país ${id}:`, error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      
      throw new Error(`Falha ao atualizar país ${id}`);
    }
  },

  delete: async (id: number) => {
    try {
      await pool.query('DELETE FROM tipo_pais WHERE idtipo_pais = ?', [id]);
    } catch (error) {
      console.error(`Erro ao excluir país ${id}:`, error);
      throw new Error(`Falha ao excluir país ${id}`);
    }
  },

  checkExisting: async (descricao: string, excludeId?: number) => {
    const descricaoTratada = descricao.trim();
    try {
      let query = 'SELECT idtipo_pais FROM tipo_pais WHERE descricao = ?';
      const params: any[] = [descricaoTratada];

      if (excludeId) {
        query += ' AND idtipo_pais != ?';
        params.push(excludeId);
      }

      const [rows] = await pool.query<RowDataPacket[]>(query, params);
      return rows.length > 0;
    } catch (error) {
      console.error('Erro ao verificar país existente:', error);
      throw new Error('Falha na verificação de duplicados');
    }
  }
};