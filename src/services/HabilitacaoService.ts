import pool from '../database/config';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

/**
 * Tipos e Interfaces
 */
interface IHabilitacaoService {
  getAll(): Promise<TipoHabilitacao[]>;
  getAllPaginated(page: number, limit: number, searchTerm?: string): Promise<PaginationData>;
  getById(id: number): Promise<TipoHabilitacao | null>;
  create(data: Omit<TipoHabilitacao, 'idtipo_habilitacao'>): Promise<ResultSetHeader>;
  update(id: number, data: Omit<TipoHabilitacao, 'idtipo_habilitacao'>): Promise<void>;
  delete(id: number): Promise<void>;

  // Novos métodos para checar duplicidade
  checkExistingCodigo(codigo: string, excludeId?: number): Promise<boolean>;
  checkExistingDescricao(descricao: string, excludeId?: number): Promise<boolean>;
}

interface TipoHabilitacao {
  idtipo_habilitacao: number;
  codigo: string;
  descricao: string;
}

interface PaginationData {
  data: TipoHabilitacao[];
  meta: {
    total: number;
    page: number;
    totalPages: number;
  };
}

/**
 * Implementação do serviço
 */
export const HabilitacaoService: IHabilitacaoService = {
  /**
   * Lista todos os registros, ordenados por código.
   */
  async getAll() {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tipo_habilitacao ORDER BY codigo'
    );
    return rows as TipoHabilitacao[];
  },

  /**
   * Lista paginada de habilitações, com busca opcional em codigo ou descricao.
   */
  async getAllPaginated(page: number, limit: number, searchTerm: string = '') {
    const offset = (page - 1) * limit;

    let dataQuery = 'SELECT * FROM tipo_habilitacao';
    let countQuery = 'SELECT COUNT(*) AS total FROM tipo_habilitacao';
    const dataParams: any[] = [];
    const countParams: any[] = [];

    if (searchTerm) {
      dataQuery += ' WHERE (codigo LIKE CONCAT(\'%\', ?, \'%\') OR descricao LIKE CONCAT(\'%\', ?, \'%\'))';
      countQuery += ' WHERE (codigo LIKE CONCAT(\'%\', ?, \'%\') OR descricao LIKE CONCAT(\'%\', ?, \'%\'))';
      dataParams.push(searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm);
    }

    dataQuery += ' ORDER BY codigo LIMIT ? OFFSET ?';
    dataParams.push(limit, offset);

    const [data] = await pool.query<RowDataPacket[]>(dataQuery, dataParams);
    const [[{ total }]] = await pool.query<RowDataPacket[]>(countQuery, countParams);

    return {
      data: data as TipoHabilitacao[],
      meta: {
        total: total as number,
        page,
        totalPages: Math.ceil((total as number) / limit),
      },
    };
  },

  /**
   * Busca uma habilitação específica pelo ID.
   */
  async getById(id: number) {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tipo_habilitacao WHERE idtipo_habilitacao = ?',
      [id]
    );
    if (rows.length === 0) {
      return null;
    }
    return rows[0] as TipoHabilitacao;
  },

  /**
   * Cria uma nova habilitação.
   * - Usa trim() em codigo e descricao.
   * - Ignora idtipo_habilitacao do payload, pois geralmente é autoincrement no BD.
   */
async create({ codigo, descricao }: Omit<TipoHabilitacao, 'idtipo_habilitacao'>) {
  const codigoRegex = /^[A-Z0-9\-]+$/;
  const codigoTratado = codigo.trim().toUpperCase();
  if (!codigoRegex.test(codigoTratado)) {
    throw new Error('Formato de código inválido');
  }
    const descricaoTratada = descricao.trim();

    if (!codigoTratado) {
      throw new Error('Código não pode ser vazio');
    }
    if (!descricaoTratada) {
      throw new Error('Descrição não pode ser vazia');
    }

    // (Opcional) Verificar duplicidade aqui também, se quiser
    // Já que no front estamos checando antes, mas se quiser robustez no back:
    if (await this.checkExistingCodigo(codigoTratado)) {
    throw new Error('DUPLICATE_CODE');
    }
    if (await this.checkExistingDescricao(descricaoTratada)) {
    throw new Error('DUPLICATE_ENTRY');
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO tipo_habilitacao (codigo, descricao) VALUES (?, ?)',
      [codigoTratado, descricaoTratada]
    );
    return result;
  },

  /**
   * Atualiza uma habilitação já existente.
   */
  async update(id: number, { codigo, descricao }: Omit<TipoHabilitacao, 'idtipo_habilitacao'>) {
    const codigoTratado = codigo.trim().toUpperCase();
    const descricaoTratada = descricao.trim();

    if (!codigoTratado) {
      throw new Error('Código não pode ser vazio');
    }
    if (!descricaoTratada) {
      throw new Error('Descrição não pode ser vazia');
    }

    // (Opcional) Verificar duplicidade aqui, também, por segurança.
    // if (await this.checkExistingCodigo(codigoTratado, id)) {
    //   throw new Error('DUPLICATE_CODE');
    // }
    // if (await this.checkExistingDescricao(descricaoTratada, id)) {
    //   throw new Error('DUPLICATE_ENTRY');
    // }

    await pool.query(
      'UPDATE tipo_habilitacao SET codigo = ?, descricao = ? WHERE idtipo_habilitacao = ?',
      [codigoTratado, descricaoTratada, id]
    );
  },

  /**
   * Exclui uma habilitação.
   */
  async delete(id: number) {
    await pool.query('DELETE FROM tipo_habilitacao WHERE idtipo_habilitacao = ?', [id]);
  },

  /**
   * Verifica duplicidade de código.
   * - `excludeId` serve para ignorar esse ID (caso esteja atualizando).
   */
  async checkExistingCodigo(codigo: string, excludeId?: number): Promise<boolean> {
    const codigoTratado = codigo.trim().toUpperCase();
    let query = 'SELECT idtipo_habilitacao FROM tipo_habilitacao WHERE UPPER(codigo) = ?';
    const params: any[] = [codigoTratado];

    if (excludeId) {
      query += ' AND idtipo_habilitacao != ?';
      params.push(excludeId);
    }

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows.length > 0;
  },

  /**
   * Verifica duplicidade de descrição.
   * - `excludeId` para ignorar esse ID (caso esteja atualizando).
   */
  async checkExistingDescricao(descricao: string, excludeId?: number): Promise<boolean> {
    const descricaoTratada = descricao.trim();
    let query = 'SELECT idtipo_habilitacao FROM tipo_habilitacao WHERE descricao = ?';
    const params: any[] = [descricaoTratada];

    if (excludeId) {
      query += ' AND idtipo_habilitacao != ?';
      params.push(excludeId);
    }

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows.length > 0;
  },
};
