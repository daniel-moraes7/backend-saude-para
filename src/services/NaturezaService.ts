import pool from '../database/config';
import { RowDataPacket } from 'mysql2';

interface INaturezaService {
  getAllPaginated: (page: number, limit: number, search?: string) => Promise<PaginationData>;
  getById: (id: number) => Promise<Natureza>;
  create: (data: Natureza) => Promise<any>;
  update: (id: number, data: Partial<Natureza>) => Promise<void>;
  delete: (id: number) => Promise<void>;
  checkExisting: (descricao: string, excludeId?: number) => Promise<boolean>;
}

interface Natureza {
  idtipo_natureza?: number;
  descricao: string;
}

interface PaginationData {
  data: Natureza[];
  meta: {
    total: number;
    page: number;
    totalPages: number;
  };
}

export const NaturezaService: INaturezaService = {
  getAllPaginated: async (page: number, limit: number, search?: string): Promise<PaginationData> => {
    const offset = (page - 1) * limit;
    const queryParams: any[] = [];
    
    let dataQuery = 'SELECT idtipo_natureza, descricao FROM tipo_natureza';
    let countQuery = 'SELECT COUNT(*) AS total FROM tipo_natureza';

    const searchTermTratado = search?.trim();

    if (searchTermTratado) {
      const searchFilter = ' WHERE descricao LIKE ?';
      dataQuery += searchFilter;
      countQuery += searchFilter;
      queryParams.push(`%${searchTermTratado}%`);
    }

    dataQuery += ' ORDER BY descricao LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, queryParams),
      pool.query(countQuery, searchTermTratado ? [`%${searchTermTratado}%`] : [])
    ]);
    
    const [rows] = countResult;
    const total = (rows as RowDataPacket[])[0].total;

    return {
      data: dataResult[0] as Natureza[],
      meta: {
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  getById: async (id: number) => {
    const [rows] = await pool.query(
      'SELECT idtipo_natureza, descricao FROM tipo_natureza WHERE idtipo_natureza = ?',
      [id]
    ) as any[];
    return rows[0] as Natureza;
  },

  create: async ({ descricao }: Natureza) => {
    const descricaoTratada = descricao.trim();
    
    if (!descricaoTratada) {
      throw new Error('Descrição não pode ser vazia');
    }

    const [existing] = await pool.query(
      'SELECT idtipo_natureza FROM tipo_natureza WHERE descricao = ?',
      [descricaoTratada]
    );

    if ((existing as any[]).length > 0) {
      throw new Error('DUPLICATE_ENTRY');
    }

    try {
      const [result] = await pool.query(
        'INSERT INTO tipo_natureza (descricao) VALUES (?)',
        [descricaoTratada]
      );
      return result;
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      throw new Error('Falha ao criar nova natureza');
    }
  },

  update: async (id: number, { descricao }: Partial<Natureza>) => {
    if (!descricao) {
      throw new Error('Descrição é obrigatória para atualização');
    }

    const descricaoTratada = descricao.trim();
    
    if (!descricaoTratada) {
      throw new Error('Descrição não pode ser vazia');
    }

    const [existing] = await pool.query(
      'SELECT idtipo_natureza FROM tipo_natureza WHERE descricao = ? AND idtipo_natureza != ?',
      [descricaoTratada, id]
    );

    if ((existing as any[]).length > 0) {
      throw new Error('DUPLICATE_ENTRY');
    }

    try {
      await pool.query(
        'UPDATE tipo_natureza SET descricao = ? WHERE idtipo_natureza = ?',
        [descricaoTratada, id]
      );
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      throw new Error(`Falha ao atualizar natureza ${id}`);
    }
  },

  delete: async (id: number) => {
    try {
      await pool.query('DELETE FROM tipo_natureza WHERE idtipo_natureza = ?', [id]);
    } catch (error) {
      throw new Error(`Falha ao excluir natureza ${id}`);
    }
  },

  checkExisting: async (descricao: string, excludeId?: number) => {
    const descricaoTratada = descricao.trim();
    let query = 'SELECT idtipo_natureza FROM tipo_natureza WHERE descricao = ?';
    const params: any[] = [descricaoTratada];

    if (excludeId) {
      query += ' AND idtipo_natureza != ?';
      params.push(excludeId);
    }

    const [rows] = await pool.query(query, params);
    return (rows as any[]).length > 0;
  }
};