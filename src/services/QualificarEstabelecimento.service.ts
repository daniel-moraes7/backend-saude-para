import pool from "../database/config";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export interface Estabelecimento {
  idestabelecimento: number;
  codigo_unidade: string | null;
  nome: string;
  cnes: string | null;
  cnpj: string | null;
  cidade: string | null;
  logradouro: string | null;
  bairro: string | null;
  numero: string | null;
  latitude: string | null;
  longitude: string | null;
  tipo_estabelecimento_idtipo_estabelecimento: number;
  tipo_natureza_idtipo_natureza: number;
  tipo_turno_idtipo_turno: number | null;
  ativo: "S" | "N";
  qualificacoes?: number[];
  habilitacoes?: number[];
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
}

export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessError";
  }
}

export const EstabelecimentoService = {
  // Remove espaços em branco antes e depois das strings
  trimFields: (data: any): any => {
    const trimmed: any = {};
    for (const [key, value] of Object.entries(data)) {
      trimmed[key] = typeof value === "string" ? value.trim() : value;
    }
    return trimmed;
  },

  // Verifica duplicatas de Código, CNES e CNPJ
  checkDuplicates: async (
    codigo: string | null,
    cnes: string | null,
    cnpj: string | null,
    excludeId?: number
  ): Promise<boolean> => {
    const conditions: string[] = [];
    const params: any[] = [];

    if (codigo) {
      conditions.push("codigo_unidade = ?");
      params.push(codigo);
    }
    if (cnes) {
      conditions.push("cnes = ?");
      params.push(cnes);
    }
    if (cnpj) {
      conditions.push("cnpj = ?");
      params.push(cnpj);
    }

    if (conditions.length === 0) return false;

    let query = `SELECT idestabelecimento FROM estabelecimento WHERE ${conditions.join(" OR ")}`;
    if (excludeId) {
      query += " AND idestabelecimento != ?";
      params.push(excludeId);
    }

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows.length > 0;
  },

  // Valida chaves estrangeiras
  validateForeignKeys: async (
    tipoEstabelecimentoId: number,
    tipoNaturezaId: number,
    tipoTurnoId: number | null
  ): Promise<void> => {
    const [tipoEstabelecimento] = await pool.query<RowDataPacket[]>(
      "SELECT 1 FROM tipo_estabelecimento WHERE idtipo_estabelecimento = ?",
      [tipoEstabelecimentoId]
    );
    if (!tipoEstabelecimento.length) {
      throw new BusinessError("Tipo de estabelecimento inválido");
    }

    const [tipoNatureza] = await pool.query<RowDataPacket[]>(
      "SELECT 1 FROM tipo_natureza WHERE idtipo_natureza = ?",
      [tipoNaturezaId]
    );
    if (!tipoNatureza.length) {
      throw new BusinessError("Tipo de natureza inválido");
    }

    if (tipoTurnoId) {
      const [tipoTurno] = await pool.query<RowDataPacket[]>(
        "SELECT 1 FROM tipo_turno WHERE idtipo_turno = ?",
        [tipoTurnoId]
      );
      if (!tipoTurno.length) {
        throw new BusinessError("Tipo de turno inválido");
      }
    }
  },

  // Lista paginada com busca
  getAllPaginated: async (
    page: number,
    limit: number,
    searchTerm = "",
    sortKey = "idestabelecimento",
    sortOrder: "asc" | "desc" = "asc"
  ): Promise<PaginatedResponse<Estabelecimento>> => {
    try {
      console.log("Iniciando getAllPaginated no service");
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT 
          idestabelecimento,
          codigo_unidade,
          nome,
          cnes,
          cnpj,
          cidade,
          logradouro,
          bairro,
          numero,
          latitude,
          longitude,
          tipo_estabelecimento_idtipo_estabelecimento,
          tipo_natureza_idtipo_natureza,
          tipo_turno_idtipo_turno,
          ativo
        FROM estabelecimento
      `;
      
      const params: any[] = [];
  
      if (searchTerm) {
        query += `
          WHERE nome LIKE ? OR cnes LIKE ? OR cnpj LIKE ?
        `;
        params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
      }
  
      // Validando a coluna de ordenação
      const validColumns = [
        'idestabelecimento', 'codigo_unidade', 'nome', 'cnes', 
        'cnpj', 'cidade', 'logradouro', 'bairro', 'numero', 
        'ativo'
      ];
      
      const safeSort = validColumns.includes(sortKey) ? sortKey : 'idestabelecimento';
      query += ` ORDER BY ${safeSort} ${sortOrder.toUpperCase()} LIMIT ? OFFSET ?`;
      params.push(limit, offset);
  
      console.log("Query construída:", query);
      console.log("Parâmetros:", params);
  
      // Query para contar o total
      const countQuery = searchTerm
        ? `SELECT COUNT(*) AS total FROM estabelecimento WHERE nome LIKE ? OR cnes LIKE ? OR cnpj LIKE ?`
        : `SELECT COUNT(*) AS total FROM estabelecimento`;
  
      const [rows] = await pool.query(query, params);
      const [countResult] = await pool.query<RowDataPacket[]>(
        countQuery, 
        searchTerm ? [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`] : []
      );
  
      const total = Number(countResult[0]?.total) || 0;
      const totalPages = Math.ceil(total / limit);
  
      console.log("Resultado obtido:", {
        registros: (rows as any[]).length,
        total,
        totalPages
      });
  
      return {
        data: rows as Estabelecimento[],
        meta: {
          total,
          totalPages,
          page,
          limit,
        },
      };
    } catch (error) {
      console.error("Erro detalhado no service:", error);
      throw new Error(
        error instanceof Error 
          ? `Falha ao carregar lista de estabelecimentos: ${error.message}`
          : 'Erro desconhecido ao carregar estabelecimentos'
      );
    }
  },

  // Busca por ID
  getById: async (id: number): Promise<Estabelecimento> => {
    try {
      const query = `
        SELECT 
          e.idestabelecimento,
          e.codigo_unidade,
          e.nome,
          e.cnes,
          e.cnpj,
          e.cidade,
          e.logradouro,
          e.bairro,
          e.numero,
          e.latitude,
          e.longitude,
          e.tipo_estabelecimento_idtipo_estabelecimento,
          e.tipo_natureza_idtipo_natureza,
          e.tipo_turno_idtipo_turno,
          e.ativo,
          GROUP_CONCAT(DISTINCT q.tipo_qualificacao_idtipo_qualificacao) AS qualificacoes,
          GROUP_CONCAT(DISTINCT h.tipo_habilitacao_idtipo_habilitacao) AS habilitacoes
        FROM estabelecimento e
        LEFT JOIN estabelecimento_has_tipo_qualificacao q ON e.idestabelecimento = q.estabelecimento_idestabelecimento
        LEFT JOIN estabelecimento_has_tipo_habilitacao h ON e.idestabelecimento = h.estabelecimento_idestabelecimento
        WHERE e.idestabelecimento = ?
        GROUP BY e.idestabelecimento
      `;
      const [rows] = await pool.query<RowDataPacket[]>(query, [id]);
      const estabelecimento = rows[0] || null;

      if (!estabelecimento) {
        throw new BusinessError("Estabelecimento não encontrado");
      }

      estabelecimento.qualificacoes = estabelecimento.qualificacoes
        ? estabelecimento.qualificacoes.split(",").map(Number)
        : [];
      estabelecimento.habilitacoes = estabelecimento.habilitacoes
        ? estabelecimento.habilitacoes.split(",").map(Number)
        : [];

      return estabelecimento as Estabelecimento;
    } catch (error) {
      console.error("Erro ao buscar estabelecimento:", error);
      throw new BusinessError("Falha ao carregar estabelecimento");
    }
  },

  // Cria um novo estabelecimento
  create: async (data: Partial<Estabelecimento>): Promise<Estabelecimento> => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const cleanedData = EstabelecimentoService.trimFields(data);

      // Validações básicas
      if (!cleanedData.nome?.trim()) {
        throw new BusinessError("O campo Nome é obrigatório");
      }
      if (cleanedData.ativo === "S" && (!cleanedData.latitude || !cleanedData.longitude)) {
        throw new BusinessError("Latitude e Longitude são obrigatórias para ativação");
      }

      // Verifica duplicatas
      const hasDuplicate = await EstabelecimentoService.checkDuplicates(
        cleanedData.codigo_unidade || null,
        cleanedData.cnes || null,
        cleanedData.cnpj || null
      );
      if (hasDuplicate) {
        throw new BusinessError("Código, CNES ou CNPJ já cadastrados");
      }

      // Valida chaves estrangeiras
      await EstabelecimentoService.validateForeignKeys(
        cleanedData.tipo_estabelecimento_idtipo_estabelecimento!,
        cleanedData.tipo_natureza_idtipo_natureza!,
        cleanedData.tipo_turno_idtipo_turno || null
      );

      // Insere o estabelecimento
      const insertParams = [
        cleanedData.codigo_unidade || null,
        cleanedData.nome,
        cleanedData.cnes || null,
        cleanedData.cnpj || null,
        cleanedData.cidade || null,
        cleanedData.logradouro || null,
        cleanedData.bairro || null,
        cleanedData.numero || null,
        cleanedData.latitude || null,
        cleanedData.longitude || null,
        cleanedData.tipo_estabelecimento_idtipo_estabelecimento,
        cleanedData.tipo_natureza_idtipo_natureza,
        cleanedData.tipo_turno_idtipo_turno || null,
        cleanedData.ativo || "N",
      ];

      const [result] = await connection.query<ResultSetHeader>(
        `
          INSERT INTO estabelecimento (
            codigo_unidade, nome, cnes, cnpj, cidade, logradouro, bairro, numero,
            latitude, longitude, tipo_estabelecimento_idtipo_estabelecimento,
            tipo_natureza_idtipo_natureza, tipo_turno_idtipo_turno, ativo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        insertParams
      );

      const estabelecimentoId = result.insertId;

      // Insere qualificações
      if (Array.isArray(cleanedData.qualificacoes) && cleanedData.qualificacoes.length > 0) {
        for (const qualId of cleanedData.qualificacoes) {
          await connection.query(
            "INSERT INTO estabelecimento_has_tipo_qualificacao VALUES (?, ?)",
            [estabelecimentoId, qualId]
          );
        }
      }

      // Insere habilitações
      if (Array.isArray(cleanedData.habilitacoes) && cleanedData.habilitacoes.length > 0) {
        for (const habId of cleanedData.habilitacoes) {
          await connection.query(
            "INSERT INTO estabelecimento_has_tipo_habilitacao VALUES (?, ?)",
            [estabelecimentoId, habId]
          );
        }
      }

      await connection.commit();
      return EstabelecimentoService.getById(estabelecimentoId);
    } catch (error) {
      await connection.rollback();
      console.error("Erro ao criar estabelecimento:", error);
      throw new BusinessError(error instanceof Error ? error.message : "Erro desconhecido");
    } finally {
      connection.release();
    }
  },

  // Atualiza um estabelecimento
  update: async (id: number, data: Partial<Estabelecimento>): Promise<Estabelecimento> => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const cleanedData = EstabelecimentoService.trimFields(data);

      // Validações básicas
      if (!cleanedData.nome?.trim()) {
        throw new BusinessError("O campo Nome é obrigatório");
      }
      if (cleanedData.ativo === "S" && (!cleanedData.latitude || !cleanedData.longitude)) {
        throw new BusinessError("Latitude e Longitude são obrigatórias para ativação");
      }

      // Verifica duplicatas
      const hasDuplicate = await EstabelecimentoService.checkDuplicates(
        cleanedData.codigo_unidade || null,
        cleanedData.cnes || null,
        cleanedData.cnpj || null,
        id
      );
      if (hasDuplicate) {
        throw new BusinessError("Código, CNES ou CNPJ já cadastrados");
      }

      // Valida chaves estrangeiras
      await EstabelecimentoService.validateForeignKeys(
        cleanedData.tipo_estabelecimento_idtipo_estabelecimento!,
        cleanedData.tipo_natureza_idtipo_natureza!,
        cleanedData.tipo_turno_idtipo_turno || null
      );

      // Atualiza o estabelecimento
      const updateParams = [
        cleanedData.codigo_unidade || null,
        cleanedData.nome,
        cleanedData.cnes || null,
        cleanedData.cnpj || null,
        cleanedData.cidade || null,
        cleanedData.logradouro || null,
        cleanedData.bairro || null,
        cleanedData.numero || null,
        cleanedData.latitude || null,
        cleanedData.longitude || null,
        cleanedData.tipo_estabelecimento_idtipo_estabelecimento,
        cleanedData.tipo_natureza_idtipo_natureza,
        cleanedData.tipo_turno_idtipo_turno || null,
        cleanedData.ativo || "N",
        id,
      ];

      await connection.query(
        `
          UPDATE estabelecimento SET
            codigo_unidade = ?,
            nome = ?,
            cnes = ?,
            cnpj = ?,
            cidade = ?,
            logradouro = ?,
            bairro = ?,
            numero = ?,
            latitude = ?,
            longitude = ?,
            tipo_estabelecimento_idtipo_estabelecimento = ?,
            tipo_natureza_idtipo_natureza = ?,
            tipo_turno_idtipo_turno = ?,
            ativo = ?
          WHERE idestabelecimento = ?
        `,
        updateParams
      );

      // Atualiza qualificações
      await connection.query(
        "DELETE FROM estabelecimento_has_tipo_qualificacao WHERE estabelecimento_idestabelecimento = ?",
        [id]
      );
      if (Array.isArray(cleanedData.qualificacoes) && cleanedData.qualificacoes.length > 0) {
        for (const qualId of cleanedData.qualificacoes) {
          await connection.query(
            "INSERT INTO estabelecimento_has_tipo_qualificacao VALUES (?, ?)",
            [id, qualId]
          );
        }
      }

      // Atualiza habilitações
      await connection.query(
        "DELETE FROM estabelecimento_has_tipo_habilitacao WHERE estabelecimento_idestabelecimento = ?",
        [id]
      );
      if (Array.isArray(cleanedData.habilitacoes) && cleanedData.habilitacoes.length > 0) {
        for (const habId of cleanedData.habilitacoes) {
          await connection.query(
            "INSERT INTO estabelecimento_has_tipo_habilitacao VALUES (?, ?)",
            [id, habId]
          );
        }
      }

      await connection.commit();
      return EstabelecimentoService.getById(id);
    } catch (error) {
      await connection.rollback();
      console.error("Erro ao atualizar estabelecimento:", error);
      throw new BusinessError(error instanceof Error ? error.message : "Erro desconhecido");
    } finally {
      connection.release();
    }
  },

  // Exclui um estabelecimento
  delete: async (id: number): Promise<void> => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Remove qualificações
      await connection.query(
        "DELETE FROM estabelecimento_has_tipo_qualificacao WHERE estabelecimento_idestabelecimento = ?",
        [id]
      );

      // Remove habilitações
      await connection.query(
        "DELETE FROM estabelecimento_has_tipo_habilitacao WHERE estabelecimento_idestabelecimento = ?",
        [id]
      );

      // Remove o estabelecimento
      const [result] = await connection.query<ResultSetHeader>("DELETE FROM estabelecimento WHERE idestabelecimento = ?", [id]);

      if (result.affectedRows === 0) {
        throw new BusinessError("Estabelecimento não encontrado");
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error("Erro ao excluir estabelecimento:", error);
      throw new BusinessError(error instanceof Error ? error.message : "Erro desconhecido");
    } finally {
      connection.release();
    }
  },

  // Métodos para tabelas de referência
  getTiposEstabelecimento: async () => {
    try {
      const [rows] = await pool.query(
        'SELECT idtipo_estabelecimento AS id, descricao FROM tipo_estabelecimento ORDER BY idtipo_estabelecimento'
      );
      return rows;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new BusinessError(`Falha ao carregar tipos de estabelecimento: ${errorMessage}`);
    }
  },

  getNaturezas: async () => {
    try {
      const [rows] = await pool.query(
        'SELECT idtipo_natureza AS id, descricao FROM tipo_natureza ORDER BY idtipo_natureza'
      );
      return rows;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new BusinessError(`Falha ao carregar naturezas: ${errorMessage}`);
    }
  },

  getTurnos: async () => {
    try {
      const [rows] = await pool.query(
        'SELECT idtipo_turno AS id, descricao FROM tipo_turno ORDER BY idtipo_turno'
      );
      return rows;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new BusinessError(`Falha ao carregar turnos: ${errorMessage}`);
    }
  },

  getHabilitacoes: async () => {
    try {
      const [rows] = await pool.query(
        'SELECT idtipo_habilitacao AS id, descricao FROM tipo_habilitacao ORDER BY idtipo_habilitacao'
      );
      return rows;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new BusinessError(`Falha ao carregar habilitações: ${errorMessage}`);
    }
  },

  getQualificacoes: async () => {
    try {
      const [rows] = await pool.query(
        'SELECT idtipo_qualificacao AS id, descricao FROM tipo_qualificacao ORDER BY idtipo_qualificacao'
      );
      return rows;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new BusinessError(`Falha ao carregar qualificações: ${errorMessage}`);
    }
  },
};