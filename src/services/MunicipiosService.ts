import pool from '../database/config';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export const MunicipiosService = {
  getAll: async () => {
    try {
      const [rows] = await pool.query(`
        SELECT m.*, e.descricao as estado_descricao 
        FROM tipo_municipio m 
        LEFT JOIN tipo_estado e ON m.tipo_estado_idtipo_estado = e.idtipo_estado 
        ORDER BY m.idtipo_municipio
      `);
      return rows as RowDataPacket[];
    } catch (error) {
      console.error('Erro ao buscar municípios:', error);
      throw new Error('Falha ao carregar lista de municípios');
    }
  },

  getAllPaginated: async (page: number, limit: number, searchTerm: string = '', estadoId?: number) => {
    try {
      const offset = (page - 1) * limit;
      let dataQuery = `
        SELECT m.*, e.descricao as estado_descricao 
        FROM tipo_municipio m 
        LEFT JOIN tipo_estado e ON m.tipo_estado_idtipo_estado = e.idtipo_estado
      `;
      let countQuery = 'SELECT COUNT(*) as total FROM tipo_municipio m';
      const params: any[] = [];
      const searchParams: any[] = [];
  
      const whereConditions: string[] = [];
      
      if (searchTerm) {
        whereConditions.push('(m.codigo LIKE ? OR m.descricao LIKE ?)');
        searchParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
      }

      if (estadoId) {
        whereConditions.push('m.tipo_estado_idtipo_estado = ?');
        searchParams.push(estadoId);
      }

      if (whereConditions.length > 0) {
        const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
        dataQuery += whereClause;
        countQuery += whereClause;
      }
  
      dataQuery += ' ORDER BY m.idtipo_municipio LIMIT ? OFFSET ?';
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
      console.error('Erro na paginação de municípios:', error);
      throw new Error('Falha na paginação de municípios');
    }
  },

  getById: async (id: number) => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT m.*, e.descricao as estado_descricao 
         FROM tipo_municipio m 
         LEFT JOIN tipo_estado e ON m.tipo_estado_idtipo_estado = e.idtipo_estado 
         WHERE m.idtipo_municipio = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error(`Erro ao buscar município ${id}:`, error);
      throw new Error(`Falha ao carregar município ${id}`);
    }
  },

  create: async (codigo: string, descricao: string, estadoId: number) => {
    const codigoTratado = codigo.trim();
    const descricaoTratada = descricao.trim();
    
    if (codigoTratado.length > 10) {
      throw new Error('O código não pode ter mais que 10 caracteres');
    }
    if (descricaoTratada.length > 60) {
      throw new Error('A descrição não pode ter mais que 60 caracteres');
    }

    try {
      const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO tipo_municipio (codigo, descricao, tipo_estado_idtipo_estado) VALUES (?, ?, ?)',
        [codigoTratado, descricaoTratada, estadoId]
      );
      return result;
    } catch (error: any) {
      console.error('Erro ao criar município:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        throw new Error('ESTADO_NAO_ENCONTRADO');
      }
      
      throw new Error('Falha ao criar novo município');
    }
  },

  update: async (id: number, codigo: string, descricao: string, estadoId: number) => {
    const codigoTratado = codigo.trim();
    const descricaoTratada = descricao.trim();
    
    if (codigoTratado.length > 10) {
      throw new Error('O código não pode ter mais que 10 caracteres');
    }
    if (descricaoTratada.length > 60) {
      throw new Error('A descrição não pode ter mais que 60 caracteres');
    }

    try {
      await pool.query(
        'UPDATE tipo_municipio SET codigo = ?, descricao = ?, tipo_estado_idtipo_estado = ? WHERE idtipo_municipio = ?',
        [codigoTratado, descricaoTratada, estadoId, id]
      );
    } catch (error: any) {
      console.error(`Erro ao atualizar município ${id}:`, error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        throw new Error('ESTADO_NAO_ENCONTRADO');
      }
      
      throw new Error(`Falha ao atualizar município ${id}`);
    }
  },

  delete: async (id: number) => {
    try {
      await pool.query('DELETE FROM tipo_municipio WHERE idtipo_municipio = ?', [id]);
    } catch (error) {
      console.error(`Erro ao excluir município ${id}:`, error);
      throw new Error(`Falha ao excluir município ${id}`);
    }
  },

  getByEstado: async (estadoId: number) => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT m.*, e.descricao as estado_descricao 
         FROM tipo_municipio m 
         LEFT JOIN tipo_estado e ON m.tipo_estado_idtipo_estado = e.idtipo_estado 
         WHERE m.tipo_estado_idtipo_estado = ?
         ORDER BY m.descricao`,
        [estadoId]
      );
      return rows;
    } catch (error) {
      console.error(`Erro ao buscar municípios do estado ${estadoId}:`, error);
      throw new Error(`Falha ao carregar municípios do estado ${estadoId}`);
    }
  },

  checkExisting: async (codigo: string, excludeId?: number) => {
    const codigoTratado = codigo.trim();
    try {
      let query = 'SELECT idtipo_municipio FROM tipo_municipio WHERE codigo = ?';
      const params: any[] = [codigoTratado];

      if (excludeId) {
        query += ' AND idtipo_municipio != ?';
        params.push(excludeId);
      }

      const [rows] = await pool.query<RowDataPacket[]>(query, params);
      return rows.length > 0;
    } catch (error) {
      console.error('Erro ao verificar município existente:', error);
      throw new Error('Falha na verificação de duplicados');
    }
  },

  checkExistingDescricao: async (descricao: string, estadoId: number, excludeId?: number) => {
    const descricaoTratada = descricao.trim();
    try {
      let query = 'SELECT idtipo_municipio FROM tipo_municipio WHERE descricao = ? AND tipo_estado_idtipo_estado = ?';
      const params: any[] = [descricaoTratada, estadoId];

      if (excludeId) {
        query += ' AND idtipo_municipio != ?';
        params.push(excludeId);
      }

      const [rows] = await pool.query<RowDataPacket[]>(query, params);
      return rows.length > 0;
    } catch (error) {
      console.error('Erro ao verificar descrição de município existente:', error);
      throw new Error('Falha na verificação de duplicados');
    }
  }
};