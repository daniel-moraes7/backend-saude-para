import pool from '../database/config';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface TipoQualificacao {
  idtipo_qualificacao: number;
  descricao: string;
  idcomponente: number;
}

interface PaginatedResponse {
  data: TipoQualificacao[];
  meta: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
}

export const TipoQualificacaoService = {
  getAll: async (searchTerm: string = ''): Promise<TipoQualificacao[]> => {
    try {
      let query = `
        SELECT 
          tq.idtipo_qualificacao,
          tq.descricao,
          tq.componente_idcomponente as idcomponente
        FROM tipo_qualificacao tq
        INNER JOIN componente c ON tq.componente_idcomponente = c.idcomponente
      `;
      
      const params: string[] = [];
  
      if (searchTerm) {
        query += ' WHERE tq.descricao LIKE ? OR c.descricao LIKE ?';
        params.push(`%${searchTerm}%`, `%${searchTerm}%`);
      }
  
      query += ' ORDER BY tq.idtipo_qualificacao';
  
      const [rows] = await pool.execute<RowDataPacket[]>(query, params);
      return rows as TipoQualificacao[];
    } catch (error: any) {
      console.error('Erro ao buscar qualificações:', error);
      throw new Error('Falha ao carregar lista de qualificações');
    }
  },

  getAllPaginated: async (
    page: number,
    limit: number,
    searchTerm: string = ''
  ): Promise<PaginatedResponse> => {
    try {
      const offset = (page - 1) * limit;
      let dataQuery = `
        SELECT 
          tq.idtipo_qualificacao,
          tq.descricao,
          tq.componente_idcomponente as idcomponente
        FROM tipo_qualificacao tq
        INNER JOIN componente c ON tq.componente_idcomponente = c.idcomponente
      `;
      
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM tipo_qualificacao tq
        INNER JOIN componente c ON tq.componente_idcomponente = c.idcomponente
      `;
  
      const params: any[] = [];
      const countParams: any[] = [];
  
      if (searchTerm) {
        const searchFilter = ' WHERE tq.descricao LIKE ? OR c.descricao LIKE ?';
        dataQuery += searchFilter;
        countQuery += searchFilter;
        params.push(`%${searchTerm}%`, `%${searchTerm}%`);
        countParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
      }
  
      // Adicionar parâmetros numéricos corretamente
      dataQuery += ' ORDER BY tq.idtipo_qualificacao LIMIT ? OFFSET ?';
      params.push(limit, offset);
  
      // Executar queries
      const [dataRows] = await pool.query<RowDataPacket[]>(dataQuery, params);
      const [countResult] = await pool.query<RowDataPacket[]>(countQuery, countParams);
  
      // Converter resultados para números
      const total = Number(countResult[0]?.total) || 0;
      const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  
      return {
        data: dataRows as TipoQualificacao[],
        meta: {
          total,
          totalPages,
          page,
          limit
        }
      };
    } catch (error: any) {
      console.error('Erro na paginação de qualificações:', error);
      throw new Error('Falha na paginação de qualificações');
    }
  },

  getById: async (id: number): Promise<TipoQualificacao> => {
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
          idtipo_qualificacao,
          descricao,
          componente_idcomponente as idcomponente
         FROM tipo_qualificacao 
         WHERE idtipo_qualificacao = ?`,
        [id]
      );
      
      if (!rows[0]) throw new Error('Qualificação não encontrada');
      return rows[0] as TipoQualificacao;
    } catch (error: any) {
      console.error(`Erro ao buscar qualificação ${id}:`, error);
      throw new Error(`Falha ao carregar qualificação ${id}`);
    }
  },

  create: async (qualificacao: Omit<TipoQualificacao, 'idtipo_qualificacao'>): Promise<ResultSetHeader> => {
    const descricaoTratada = qualificacao.descricao.trim();
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        'INSERT INTO tipo_qualificacao (descricao, componente_idcomponente) VALUES (?, ?)',
        [descricaoTratada, qualificacao.idcomponente]
      );
      return result;
    } catch (error: any) {
      console.error('Erro ao criar qualificação:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      
      throw new Error('Falha ao criar nova qualificação');
    }
  },

  update: async (id: number, qualificacao: Partial<TipoQualificacao>): Promise<ResultSetHeader> => {
    const descricaoTratada = qualificacao.descricao?.trim();
    try {
      const updates: string[] = [];
      const params: (string | number)[] = [];

      if (descricaoTratada) {
        updates.push('descricao = ?');
        params.push(descricaoTratada);
      }
      
      if (qualificacao.idcomponente) {
        updates.push('componente_idcomponente = ?');
        params.push(qualificacao.idcomponente);
      }

      if (updates.length === 0) {
        throw new Error('Nenhum campo válido para atualização');
      }

      params.push(id);

      const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE tipo_qualificacao 
         SET ${updates.join(', ')} 
         WHERE idtipo_qualificacao = ?`,
        params
      );

      if (result.affectedRows === 0) {
        throw new Error('Qualificação não encontrada');
      }
      return result;
    } catch (error: any) {
      console.error(`Erro ao atualizar qualificação ${id}:`, error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      
      throw new Error(`Falha ao atualizar qualificação ${id}`);
    }
  },

  delete: async (id: number): Promise<ResultSetHeader> => {
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        'DELETE FROM tipo_qualificacao WHERE idtipo_qualificacao = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        throw new Error('Qualificação não encontrada');
      }
      return result;
    } catch (error: any) {
      console.error(`Erro ao excluir qualificação ${id}:`, error);
      
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        throw new Error('DEPENDENCY_ERROR');
      }
      
      throw new Error(`Falha ao excluir qualificação ${id}`);
    }
  },

  checkExisting: async (
    descricao: string,
    idcomponente: number,
    excludeId?: number
  ): Promise<boolean> => {
    const descricaoTratada = descricao.trim();
    try {
      let query = `
        SELECT idtipo_qualificacao 
        FROM tipo_qualificacao 
        WHERE descricao = ? 
          AND componente_idcomponente = ?
      `;
      
      const params: (string | number)[] = [descricaoTratada, idcomponente];

      if (excludeId) {
        query += ' AND idtipo_qualificacao != ?';
        params.push(excludeId);
      }

      const [rows] = await pool.execute<RowDataPacket[]>(query, params);
      return rows.length > 0;
    } catch (error: any) {
      console.error('Erro ao verificar qualificação existente:', error);
      throw new Error('Falha na verificação de duplicados');
    }
  }
};