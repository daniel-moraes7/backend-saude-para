import pool from '../database/config';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface IEstabelecimentoService {
  getAll: () => Promise<TipoEstabelecimento[]>;
  getAllPaginated: (page: number, limit: number, search?: string) => Promise<PaginationData>;
  getById: (id: number) => Promise<TipoEstabelecimento>;
  create: (data: Omit<TipoEstabelecimento, 'idtipo_estabelecimento'>) => Promise<any>;
  update: (id: number, data: Partial<TipoEstabelecimento>) => Promise<void>;
  delete: (id: number) => Promise<void>;
  checkExisting: (descricao: string, excludeId?: number) => Promise<boolean>;
}

interface TipoEstabelecimento {
  idtipo_estabelecimento: number;
  descricao: string;
}

interface PaginationData {
  data: TipoEstabelecimento[];
  meta: {
    total: number;
    page: number;
    totalPages: number;
  };
}

export const EstabelecimentoService: IEstabelecimentoService = {
  getAll: async () => {
    const [rows] = await pool.query('SELECT * FROM tipo_estabelecimento ORDER BY descricao');
    return rows as TipoEstabelecimento[];
  },

  getAllPaginated: async (page: number, limit: number, search?: string): Promise<PaginationData> => {
    const offset = (page - 1) * limit;
    const queryParams: any[] = [];
    
    let dataQuery = 'SELECT * FROM tipo_estabelecimento';
    let countQuery = 'SELECT COUNT(*) AS total FROM tipo_estabelecimento';

    if (search) {
      const searchFilter = ' WHERE descricao LIKE ?';
      dataQuery += searchFilter;
      countQuery += searchFilter;
      queryParams.push(`%${search}%`);
    }

    dataQuery += ' ORDER BY descricao LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, queryParams),
      pool.query(countQuery, search ? [`%${search}%`] : [])
    ]);
    const [rows] = countResult;
    const total = (rows as RowDataPacket[])[0].total;

    return {
      data: dataResult[0] as TipoEstabelecimento[],
      meta: {
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  getById: async (id: number) => {
    const [rows] = await pool.query(
      'SELECT * FROM tipo_estabelecimento WHERE idtipo_estabelecimento = ?',
      [id]
    ) as any[];
    return rows[0] as TipoEstabelecimento;
  },

  create: async ({ descricao }: Omit<TipoEstabelecimento, 'idtipo_estabelecimento'>) => {
    const descricaoTratada = descricao.trim();
    
    if (descricaoTratada === '') {
      throw new Error('Descrição não pode ser vazia');
    }

    if (await EstabelecimentoService.checkExisting(descricaoTratada)) {
      throw new Error('DUPLICATE_ENTRY');
    }

    try {
      const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO tipo_estabelecimento (descricao) VALUES (?)',
        [descricaoTratada]
      );
      return result;
    } catch (error: any) {
      console.error('Erro ao criar estabelecimento:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      
      throw new Error('Falha ao criar novo estabelecimento');
    }
  },

  update: async (id: number, { descricao }: Partial<TipoEstabelecimento>) => {
    if (!descricao) {
      throw new Error('Descrição é obrigatória para atualização');
    }

    const descricaoTratada = descricao.trim();
    
    if (descricaoTratada === '') {
      throw new Error('Descrição não pode ser vazia');
    }

    if (await EstabelecimentoService.checkExisting(descricaoTratada, id)) {
      throw new Error('DUPLICATE_ENTRY');
    }

    try {
      await pool.query(
        'UPDATE tipo_estabelecimento SET descricao = ? WHERE idtipo_estabelecimento = ?',
        [descricaoTratada, id]
      );
    } catch (error: any) {
      console.error(`Erro ao atualizar estabelecimento ${id}:`, error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      
      throw new Error(`Falha ao atualizar estabelecimento ${id}`);
    }
  },

  delete: async (id: number) => {
    try {
      await pool.query('DELETE FROM tipo_estabelecimento WHERE idtipo_estabelecimento = ?', [id]);
    } catch (error) {
      console.error(`Erro ao excluir estabelecimento ${id}:`, error);
      throw new Error(`Falha ao excluir estabelecimento ${id}`);
    }
  },

  checkExisting: async (descricao: string, excludeId?: number) => {
    const descricaoTratada = descricao.trim();
    try {
      let query = 'SELECT idtipo_estabelecimento FROM tipo_estabelecimento WHERE descricao = ?';
      const params: any[] = [descricaoTratada];

      if (excludeId) {
        query += ' AND idtipo_estabelecimento != ?';
        params.push(excludeId);
      }

      const [rows] = await pool.query<RowDataPacket[]>(query, params);
      return rows.length > 0;
    } catch (error) {
      console.error('Erro ao verificar estabelecimento existente:', error);
      throw new Error('Falha na verificação de duplicados');
    }
  }
};