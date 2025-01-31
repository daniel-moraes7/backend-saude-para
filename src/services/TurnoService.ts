import pool from '../database/config';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

interface ITurnoService {
  getAllPaginated: (page: number, limit: number, search?: string) => Promise<PaginationData>;
  getById: (id: number) => Promise<Turno>;
  create: (data: Turno) => Promise<ResultSetHeader>;
  update: (id: number, data: Partial<Turno>) => Promise<void>;
  delete: (id: number) => Promise<void>;
  checkExisting: (descricao: string, excludeId?: number) => Promise<boolean>;
}

interface Turno {
  id_turno?: number;
  descricao: string;
}

interface PaginationData {
  data: Turno[];
  meta: {
    total: number;
    page: number;
    totalPages: number;
  };
}

export const TurnoService: ITurnoService = {
  getAllPaginated: async (page: number, limit: number, search: string = ''): Promise<PaginationData> => {
    const offset = (page - 1) * limit;
    const queryParams: any[] = [];
    const searchTerm = search.trim();

    let dataQuery = 'SELECT idtipo_turno AS id_turno, descricao FROM tipo_turno';
    let countQuery = 'SELECT COUNT(*) AS total FROM tipo_turno';

    if (searchTerm) {
      const searchFilter = ' WHERE descricao LIKE ?';
      dataQuery += searchFilter;
      countQuery += searchFilter;
      queryParams.push(`%${searchTerm}%`);
    }

    dataQuery += ' ORDER BY descricao LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      pool.query<RowDataPacket[]>(dataQuery, queryParams),
      pool.query<RowDataPacket[]>(countQuery, searchTerm ? [`%${searchTerm}%`] : [])
    ]);

    const total = countResult[0][0].total;

    return {
      data: dataResult[0] as Turno[],
      meta: {
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  getById: async (id: number) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT idtipo_turno AS id_turno, descricao FROM tipo_turno WHERE idtipo_turno = ?',
      [id]
    );
    
    if (!rows.length) {
      throw new Error('Turno não encontrado');
    }
    
    return rows[0] as Turno;
  },

  create: async ({ descricao }: Turno) => {
    const descricaoTratada = descricao.trim();
    
    try {
      const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO tipo_turno (descricao) VALUES (?)',
        [descricaoTratada]
      );
      return result;
    } catch (error: any) {
      console.error('Erro ao criar turno:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      
      throw new Error('Falha ao criar novo turno');
    }
  },

  update: async (id: number, { descricao }: Partial<Turno>) => {
    if (!descricao) {
      throw new Error('Descrição é obrigatória para atualização');
    }
    
    const descricaoTratada = descricao.trim();
    
    try {
      await pool.query<ResultSetHeader>(
        'UPDATE tipo_turno SET descricao = ? WHERE idtipo_turno = ?',
        [descricaoTratada, id]
      );
    } catch (error: any) {
      console.error(`Erro ao atualizar turno ${id}:`, error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      
      throw new Error(`Falha ao atualizar turno ${id}`);
    }
  },

  delete: async (id: number) => {
    try {
      await pool.query('DELETE FROM tipo_turno WHERE idtipo_turno = ?', [id]);
    } catch (error) {
      console.error(`Erro ao excluir turno ${id}:`, error);
      throw new Error(`Falha ao excluir turno ${id}`);
    }
  },

  checkExisting: async (descricao: string, excludeId?: number) => {
    const descricaoTratada = descricao.trim();
    try {
      let query = 'SELECT idtipo_turno FROM tipo_turno WHERE descricao = ?';
      const params: any[] = [descricaoTratada];

      if (excludeId) {
        query += ' AND idtipo_turno != ?';
        params.push(excludeId);
      }

      const [rows] = await pool.query<RowDataPacket[]>(query, params);
      return rows.length > 0;
    } catch (error) {
      console.error('Erro ao verificar turno existente:', error);
      throw new Error('Falha na verificação de duplicatas');
    }
  }
};