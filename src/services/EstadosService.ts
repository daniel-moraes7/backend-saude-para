import pool from '../database/config';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export const EstadosService = {
  getAll: async () => {
    try {
      const [rows] = await pool.query('SELECT * FROM tipo_estado ORDER BY idtipo_estado');
      return rows as RowDataPacket[];
    } catch (error) {
      console.error('Erro ao buscar estados:', error);
      throw new Error('Falha ao carregar lista de estados');
    }
  },

  getAllPaginated: async (page: number, limit: number, searchTerm: string = '') => {
    try {
      const offset = (page - 1) * limit;
      let dataQuery = 'SELECT * FROM tipo_estado';
      let countQuery = 'SELECT COUNT(*) as total FROM tipo_estado';
      const params: any[] = [];
      const searchParams: any[] = [];
  
      if (searchTerm) {
        const searchFilter = ` WHERE codigo LIKE ? OR descricao LIKE ?`;
        dataQuery += searchFilter;
        countQuery += searchFilter;
        searchParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
      }
  
      dataQuery += ' ORDER BY idtipo_estado LIMIT ? OFFSET ?';
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
      console.error('Erro na paginação de estados:', error);
      throw new Error('Falha na paginação de estados');
    }
  },

  getById: async (id: number) => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM tipo_estado WHERE idtipo_estado = ?',
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error(`Erro ao buscar estado ${id}:`, error);
      throw new Error(`Falha ao carregar estado ${id}`);
    }
  },

  create: async (codigo: string, descricao: string) => {
    const codigoTratado = codigo.trim();
    const descricaoTratada = descricao.trim();
    
    if (codigoTratado.length > 5) {
      throw new Error('O código não pode ter mais que 5 caracteres');
    }
    if (descricaoTratada.length > 45) {
      throw new Error('A descrição não pode ter mais que 45 caracteres');
    }

    try {
      const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO tipo_estado (codigo, descricao) VALUES (?, ?)',
        [codigoTratado, descricaoTratada]
      );
      return result;
    } catch (error: any) {
      console.error('Erro ao criar estado:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      
      throw new Error('Falha ao criar novo estado');
    }
  },

  update: async (id: number, codigo: string, descricao: string) => {
    const codigoTratado = codigo.trim();
    const descricaoTratada = descricao.trim();
    
    if (codigoTratado.length > 5) {
      throw new Error('O código não pode ter mais que 5 caracteres');
    }
    if (descricaoTratada.length > 45) {
      throw new Error('A descrição não pode ter mais que 45 caracteres');
    }

    try {
      await pool.query(
        'UPDATE tipo_estado SET codigo = ?, descricao = ? WHERE idtipo_estado = ?',
        [codigoTratado, descricaoTratada, id]
      );
    } catch (error: any) {
      console.error(`Erro ao atualizar estado ${id}:`, error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      
      throw new Error(`Falha ao atualizar estado ${id}`);
    }
  },

  delete: async (id: number) => {
    try {
      await pool.query('DELETE FROM tipo_estado WHERE idtipo_estado = ?', [id]);
    } catch (error) {
      console.error(`Erro ao excluir estado ${id}:`, error);
      throw new Error(`Falha ao excluir estado ${id}`);
    }
  },

  checkExisting: async (codigo: string, excludeId?: number) => {
    const codigoTratado = codigo.trim();
    try {
      let query = 'SELECT idtipo_estado FROM tipo_estado WHERE codigo = ?';
      const params: any[] = [codigoTratado];

      if (excludeId) {
        query += ' AND idtipo_estado != ?';
        params.push(excludeId);
      }

      const [rows] = await pool.query<RowDataPacket[]>(query, params);
      return rows.length > 0;
    } catch (error) {
      console.error('Erro ao verificar estado existente:', error);
      throw new Error('Falha na verificação de duplicados');
    }
  },

  checkExistingDescricao: async (descricao: string, excludeId?: number) => {
    const descricaoTratada = descricao.trim();
    try {
      let query = 'SELECT idtipo_estado FROM tipo_estado WHERE descricao = ?';
      const params: any[] = [descricaoTratada];

      if (excludeId) {
        query += ' AND idtipo_estado != ?';
        params.push(excludeId);
      }

      const [rows] = await pool.query<RowDataPacket[]>(query, params);
      return rows.length > 0;
    } catch (error) {
      console.error('Erro ao verificar descrição de estado existente:', error);
      throw new Error('Falha na verificação de duplicados');
    }
  }
};