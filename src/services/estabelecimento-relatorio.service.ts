import pool from "../database/config";
import { RowDataPacket } from "mysql2";

export interface Estabelecimento {
  idestabelecimento: number;
  codigo_unidade: string;
  nome: string;
  cnes: string;
  cnpj: string;
  cidade: string;
  logradouro: string;
  bairro: string;
  numero: string;
  latitude: string;
  longitude: string;
  ativo: "S" | "N";
  tipo_estabelecimento_idtipo_estabelecimento: number;
  tipo_natureza_idtipo_natureza: number;
  tipo_turno_idtipo_turno?: number;
  tipo_estabelecimento_descricao?: string;
  tipo_natureza_descricao?: string;
  tipo_turno_descricao?: string;
  habilitacoes?: Array<{
    tipo_habilitacao_idtipo_habilitacao: number;
    descricao: string;
  }>;
  qualificacoes?: number[];
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

function buildSearchClause(
  searchTerm: string,
  columns: string[]
): { clause: string; params: any[] } {
  const trimmedTerm = searchTerm.trim();
  if (!trimmedTerm) {
    return { clause: "", params: [] };
  }
  const conditions = columns.map((col) => `${col} LIKE ?`);
  const clause = `WHERE ${conditions.join(" OR ")}`;
  const params = columns.map(() => `%${trimmedTerm}%`);
  return { clause, params };
}

function isValidSortKey(key: string): boolean {
  const validKeys = [
    "idestabelecimento",
    "codigo_unidade",
    "nome",
    "cnes",
    "cnpj",
    "cidade",
    "logradouro",
    "bairro",
    "numero",
    "latitude",
    "longitude",
    "ativo",
    "tipo_estabelecimento_descricao",
    "tipo_natureza_descricao",
    "tipo_turno_descricao"
  ];
  return validKeys.includes(key);
}

export const EstabelecimentoRelatorioService = {
  getAll: async (searchTerm = ""): Promise<Estabelecimento[]> => {
    try {
      let query = `
        SELECT 
          e.*,
          te.descricao AS tipo_estabelecimento_descricao,
          tn.descricao AS tipo_natureza_descricao,
          tt.descricao AS tipo_turno_descricao
        FROM estabelecimento e
        LEFT JOIN tipo_estabelecimento te ON e.tipo_estabelecimento_idtipo_estabelecimento = te.idtipo_estabelecimento
        LEFT JOIN tipo_natureza tn ON e.tipo_natureza_idtipo_natureza = tn.idtipo_natureza
        LEFT JOIN tipo_turno tt ON e.tipo_turno_idtipo_turno = tt.idtipo_turno
      `;
      
      const { clause, params } = buildSearchClause(searchTerm, [
        "e.nome",
        "e.cidade",
        "e.cnes",
        "e.cnpj",
      ]);
      
      query += clause;
      
      const [rows] = await pool.execute<RowDataPacket[]>(query, params);
      const estabelecimentos = await Promise.all(
        rows.map(async (row) => {
          const [habilitacoesRows] = await pool.query<RowDataPacket[]>(`
            SELECT 
              h.tipo_habilitacao_idtipo_habilitacao,
              th.descricao
            FROM estabelecimento_has_tipo_habilitacao h
            JOIN tipo_habilitacao th ON h.tipo_habilitacao_idtipo_habilitacao = th.idtipo_habilitacao
            WHERE h.estabelecimento_idestabelecimento = ?
            ORDER BY th.descricao
          `, [row.idestabelecimento]);

          const [qualificacoesRows] = await pool.query<RowDataPacket[]>(`
            SELECT q.tipo_qualificacao_idtipo_qualificacao as id 
            FROM estabelecimento_has_tipo_qualificacao q
            WHERE q.estabelecimento_idestabelecimento = ?
          `, [row.idestabelecimento]);

          return {
            ...row,
            habilitacoes: habilitacoesRows.map(hab => ({
              tipo_habilitacao_idtipo_habilitacao: Number(hab.tipo_habilitacao_idtipo_habilitacao),
              descricao: hab.descricao
            })),
            qualificacoes: qualificacoesRows.map(qual => qual.id)
          };
        })
      );
      
      return estabelecimentos as Estabelecimento[];
    } catch (error) {
      console.error("Erro ao buscar estabelecimentos:", error);
      throw new Error("Falha ao carregar lista de estabelecimentos");
    }
  },

  getAllPaginated: async (
    page: number,
    limit: number,
    searchTerm = "",
    sortKey = "idestabelecimento",
    sortOrder: "asc" | "desc" = "asc"
  ): Promise<PaginatedResponse<Estabelecimento>> => {
    try {
      const offset = (page - 1) * limit;

      if (!isValidSortKey(sortKey)) {
        sortKey = "idestabelecimento";
      }

      let dataQuery = `
        SELECT 
          e.*,
          te.descricao AS tipo_estabelecimento_descricao,
          tn.descricao AS tipo_natureza_descricao,
          tt.descricao AS tipo_turno_descricao
        FROM estabelecimento e
        LEFT JOIN tipo_estabelecimento te ON e.tipo_estabelecimento_idtipo_estabelecimento = te.idtipo_estabelecimento
        LEFT JOIN tipo_natureza tn ON e.tipo_natureza_idtipo_natureza = tn.idtipo_natureza
        LEFT JOIN tipo_turno tt ON e.tipo_turno_idtipo_turno = tt.idtipo_turno
      `;
      
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM estabelecimento e
      `;

      const { clause, params } = buildSearchClause(searchTerm, [
        "e.nome",
        "e.cidade",
        "e.cnes",
        "e.cnpj",
      ]);

      dataQuery += clause;
      countQuery += clause;

      dataQuery += ` ORDER BY ${sortKey} ${sortOrder.toUpperCase()} LIMIT ? OFFSET ?`;
      const dataParams = [...params, limit, offset];

      const [dataRows] = await pool.query<RowDataPacket[]>(dataQuery, dataParams);
      const [countResult] = await pool.query<RowDataPacket[]>(countQuery, params);

      const total = Number(countResult[0]?.total) || 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));

      const estabelecimentos = await Promise.all(
        dataRows.map(async (row) => {
          const [habilitacoesRows] = await pool.query<RowDataPacket[]>(`
            SELECT 
              h.tipo_habilitacao_idtipo_habilitacao,
              th.descricao
            FROM estabelecimento_has_tipo_habilitacao h
            JOIN tipo_habilitacao th ON h.tipo_habilitacao_idtipo_habilitacao = th.idtipo_habilitacao
            WHERE h.estabelecimento_idestabelecimento = ?
            ORDER BY th.descricao
          `, [row.idestabelecimento]);

          const [qualificacoesRows] = await pool.query<RowDataPacket[]>(`
            SELECT q.tipo_qualificacao_idtipo_qualificacao as id 
            FROM estabelecimento_has_tipo_qualificacao q
            WHERE q.estabelecimento_idestabelecimento = ?
          `, [row.idestabelecimento]);

          return {
            ...row,
            habilitacoes: habilitacoesRows.map(hab => ({
              tipo_habilitacao_idtipo_habilitacao: Number(hab.tipo_habilitacao_idtipo_habilitacao),
              descricao: hab.descricao
            })),
            qualificacoes: qualificacoesRows.map(qual => qual.id)
          };
        })
      );

      return {
        data: estabelecimentos as Estabelecimento[],
        meta: {
          total,
          totalPages,
          page,
          limit,
        },
      };
    } catch (error) {
      console.error("Erro na paginação de estabelecimentos:", error);
      throw new Error("Falha na paginação de estabelecimentos");
    }
  },

  getAllForExport: async (searchTerm = ""): Promise<Estabelecimento[]> => {
    try {
      let query = `
        SELECT 
          e.*,
          te.descricao AS tipo_estabelecimento_descricao,
          tn.descricao AS tipo_natureza_descricao,
          tt.descricao AS tipo_turno_descricao
        FROM estabelecimento e
        LEFT JOIN tipo_estabelecimento te ON e.tipo_estabelecimento_idtipo_estabelecimento = te.idtipo_estabelecimento
        LEFT JOIN tipo_natureza tn ON e.tipo_natureza_idtipo_natureza = tn.idtipo_natureza
        LEFT JOIN tipo_turno tt ON e.tipo_turno_idtipo_turno = tt.idtipo_turno
      `;

      const { clause, params } = buildSearchClause(searchTerm, [
        "e.nome",
        "e.cidade",
        "e.cnes",
        "e.cnpj",
      ]);
      
      query += clause;
      query += ` ORDER BY e.nome ASC`;

      const [rows] = await pool.execute<RowDataPacket[]>(query, params);
      const estabelecimentos = await Promise.all(
        rows.map(async (row) => {
          const [habilitacoesRows] = await pool.query<RowDataPacket[]>(`
            SELECT 
              h.tipo_habilitacao_idtipo_habilitacao,
              th.descricao
            FROM estabelecimento_has_tipo_habilitacao h
            JOIN tipo_habilitacao th ON h.tipo_habilitacao_idtipo_habilitacao = th.idtipo_habilitacao
            WHERE h.estabelecimento_idestabelecimento = ?
            ORDER BY th.descricao
          `, [row.idestabelecimento]);

          const [qualificacoesRows] = await pool.query<RowDataPacket[]>(`
            SELECT q.tipo_qualificacao_idtipo_qualificacao as id 
            FROM estabelecimento_has_tipo_qualificacao q
            WHERE q.estabelecimento_idestabelecimento = ?
          `, [row.idestabelecimento]);

          return {
            ...row,
            habilitacoes: habilitacoesRows.map(hab => ({
              tipo_habilitacao_idtipo_habilitacao: Number(hab.tipo_habilitacao_idtipo_habilitacao),
              descricao: hab.descricao
            })),
            qualificacoes: qualificacoesRows.map(qual => qual.id)
          };
        })
      );
      
      return estabelecimentos as Estabelecimento[];
    } catch (error) {
      console.error("Erro ao exportar estabelecimentos:", error);
      throw new Error("Falha ao exportar lista de estabelecimentos");
    }
  },
};