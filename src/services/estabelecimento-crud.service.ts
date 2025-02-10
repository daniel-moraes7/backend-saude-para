// src/services/estabelecimento-crud.service.ts

import pool from '../database/config';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessError';
  }
}

export const EstabelecimentoCrudService = {
  // --------------------------------------------------
  // MÉTODOS AUXILIARES
  // --------------------------------------------------
  
  /**
   * Remove espaços em branco de todos os campos do objeto recebido.
   */
  trimFields: (data: any) => {
    const trimmed: any = {};
    for (const [key, value] of Object.entries(data)) {
      trimmed[key] = typeof value === 'string' ? value.trim() : value;
    }
    return trimmed;
  },

  /**
   * Verifica duplicidade de código, CNES e CNPJ.
   * Se algum dos campos existir (após trim) e já estiver cadastrado (exceto o ID atual, se informado),
   * retorna true.
   */
  checkDuplicates: async (codigo: string, cnes: string, cnpj: string, excludeId?: number) => {
    console.log('Verificando duplicatas com parâmetros:', {
      codigo,
      cnes,
      cnpj,
      excludeId
    });

    if (!codigo && !cnes && !cnpj) {
      return false;
    }

    try {
      // Verifica CNPJ
      if (cnpj?.trim()) {
        const [cnpjRows] = await pool.query<RowDataPacket[]>(
          'SELECT idestabelecimento FROM estabelecimento WHERE cnpj = ? AND idestabelecimento != ?',
          [cnpj.trim(), excludeId || 0]
        );
        
        console.log('Resultado busca CNPJ:', {
          cnpj: cnpj.trim(),
          excludeId: excludeId || 0,
          found: cnpjRows.length > 0,
          rows: cnpjRows
        });

        if (cnpjRows.length > 0) {
          throw new BusinessError('CNPJ já cadastrado(s) em outro estabelecimento');
        }
      }

      // Verifica CNES
      if (cnes?.trim()) {
        const [cnesRows] = await pool.query<RowDataPacket[]>(
          'SELECT idestabelecimento FROM estabelecimento WHERE cnes = ? AND idestabelecimento != ?',
          [cnes.trim(), excludeId || 0]
        );

        console.log('Resultado busca CNES:', {
          cnes: cnes.trim(),
          excludeId: excludeId || 0,
          found: cnesRows.length > 0,
          rows: cnesRows
        });

        if (cnesRows.length > 0) {
          throw new BusinessError('CNES já cadastrado(s) em outro estabelecimento');
        }
      }

      // Verifica código
      if (codigo?.trim()) {
        const [codigoRows] = await pool.query<RowDataPacket[]>(
          'SELECT idestabelecimento FROM estabelecimento WHERE codigo_unidade = ? AND idestabelecimento != ?',
          [codigo.trim(), excludeId || 0]
        );

        console.log('Resultado busca código:', {
          codigo: codigo.trim(),
          excludeId: excludeId || 0,
          found: codigoRows.length > 0,
          rows: codigoRows
        });

        if (codigoRows.length > 0) {
          throw new BusinessError('Código já cadastrado(s) em outro estabelecimento');
        }
      }

      return false;
    } catch (error) {
      console.error('Erro na verificação de duplicatas:', error);
      throw error;
    }
},

  /**
   * Valida as chaves estrangeiras para tipo_estabelecimento, tipo_natureza e, se informado, tipo_turno.
   */
  validateForeignKeys: async (tipoEstId: number, tipoNatId: number, tipoTurnoId: number) => {
    if (!tipoEstId || isNaN(tipoEstId)) {
      throw new BusinessError('ID do tipo de estabelecimento inválido');
    }

    if (!tipoNatId || isNaN(tipoNatId)) {
      throw new BusinessError('ID do tipo de natureza inválido');
    }

    if (tipoTurnoId) {
      const [turno] = await pool.query<RowDataPacket[]>(
        'SELECT 1 FROM tipo_turno WHERE idtipo_turno = ?',
        [tipoTurnoId]
      );
      if (!turno.length) {
        throw new BusinessError('Tipo de turno não encontrado');
      }
    }

    const [est] = await pool.query<RowDataPacket[]>(
      'SELECT 1 FROM tipo_estabelecimento WHERE idtipo_estabelecimento = ?',
      [tipoEstId]
    );
    if (!est.length) {
      throw new BusinessError('Tipo de estabelecimento não encontrado');
    }

    const [nat] = await pool.query<RowDataPacket[]>(
      'SELECT 1 FROM tipo_natureza WHERE idtipo_natureza = ?',
      [tipoNatId]
    );
    if (!nat.length) {
      throw new BusinessError('Tipo de natureza não encontrado');
    }
  },

  // --------------------------------------------------
  // MÉTODOS PARA TABELAS DE REFERÊNCIA
  // --------------------------------------------------
  getTiposEstabelecimento: async () => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT idtipo_estabelecimento AS id, descricao FROM tipo_estabelecimento ORDER BY idtipo_estabelecimento'
      );
      return rows;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao carregar tipos de estabelecimento: ${errorMessage}`);
    }
  },

  getNaturezas: async () => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT idtipo_natureza AS id, descricao FROM tipo_natureza ORDER BY idtipo_natureza'
      );
      return rows;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao carregar naturezas: ${errorMessage}`);
    }
  },

  getTurnos: async () => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT idtipo_turno AS id, descricao FROM tipo_turno ORDER BY idtipo_turno'
      );
      return rows;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao carregar turnos: ${errorMessage}`);
    }
  },

  getHabilitacoes: async () => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT idtipo_habilitacao AS id, descricao FROM tipo_habilitacao ORDER BY idtipo_habilitacao'
      );
      return rows;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao carregar habilitações: ${errorMessage}`);
    }
  },

  getQualificacoes: async () => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT idtipo_qualificacao AS id, descricao FROM tipo_qualificacao ORDER BY idtipo_qualificacao'
      );
      return rows;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao carregar qualificações: ${errorMessage}`);
    }
  },

  // --------------------------------------------------
  // CRUD DE ESTABELECIMENTO
  // --------------------------------------------------
  
  getById: async (id: number) => {
    try {
      const [estabelecimentoRows] = await pool.query<RowDataPacket[]>(`
        SELECT 
          e.*,
          e.tipo_estabelecimento_idtipo_estabelecimento AS tipoEstabelecimentoId,
          e.tipo_natureza_idtipo_natureza AS tipoNaturezaId,
          e.tipo_turno_idtipo_turno AS tipoTurnoId,
          te.descricao AS tipo_estabelecimento_descricao,
          tn.descricao AS tipo_natureza_descricao,
          tt.descricao AS tipo_turno_descricao
        FROM estabelecimento e
        LEFT JOIN tipo_estabelecimento te ON e.tipo_estabelecimento_idtipo_estabelecimento = te.idtipo_estabelecimento
        LEFT JOIN tipo_natureza tn ON e.tipo_natureza_idtipo_natureza = tn.idtipo_natureza
        LEFT JOIN tipo_turno tt ON e.tipo_turno_idtipo_turno = tt.idtipo_turno
        WHERE e.idestabelecimento = ?
      `, [id]);
      
      if (!estabelecimentoRows.length) {
        console.warn(`Estabelecimento not found for id: ${id}`);
        return null;
      }
      
      const estabelecimento = estabelecimentoRows[0];

      // Busca as habilitações com informações completas
      const [habilitacoesRows] = await pool.query<RowDataPacket[]>(`
        SELECT 
          h.tipo_habilitacao_idtipo_habilitacao,
          th.descricao
        FROM estabelecimento_has_tipo_habilitacao h
        JOIN tipo_habilitacao th ON h.tipo_habilitacao_idtipo_habilitacao = th.idtipo_habilitacao
        WHERE h.estabelecimento_idestabelecimento = ?
        ORDER BY th.descricao
      `, [id]);

      const [qualificacoesRows] = await pool.query<RowDataPacket[]>(`
        SELECT q.tipo_qualificacao_idtipo_qualificacao as id 
        FROM estabelecimento_has_tipo_qualificacao q
        WHERE q.estabelecimento_idestabelecimento = ?
      `, [id]);

      estabelecimento.habilitacoes = habilitacoesRows.map(row => ({
        tipo_habilitacao_idtipo_habilitacao: Number(row.tipo_habilitacao_idtipo_habilitacao),
        descricao: row.descricao
      }));
      estabelecimento.qualificacoes = qualificacoesRows.map(row => row.id);

      console.log('Dados retornados:', estabelecimento);
      return estabelecimento;
    } catch (error) {
      console.error('Erro ao buscar estabelecimento:', error);
      throw error;
    }
  },

  create: async (data: any) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      console.log('Dados recebidos no service:', data);
      const cleanedData = EstabelecimentoCrudService.trimFields(data);
      console.log('Dados após limpeza:', cleanedData);

      // Validação obrigatória do nome
      if (!cleanedData.nome?.trim()) {
        throw new BusinessError('O campo Nome é obrigatório');
      }

      // Validação de ativação: se ativo for "S", latitude e longitude devem estar preenchidos
      if (cleanedData.ativo === 'S' && (!cleanedData.latitude || !cleanedData.longitude)) {
        throw new BusinessError('Latitude e Longitude são obrigatórias para ativação');
      }

      // Verifica duplicidade em código, CNES ou CNPJ
      const hasDuplicate = await EstabelecimentoCrudService.checkDuplicates(
        cleanedData.codigo_unidade || '',
        cleanedData.cnes || '',
        cleanedData.cnpj || ''
      );
      if (hasDuplicate) {
        throw new BusinessError('Código, CNES ou CNPJ já cadastrados');
      }

      // Validação das chaves estrangeiras
      await EstabelecimentoCrudService.validateForeignKeys(
        cleanedData.tipo_estabelecimento_idtipo_estabelecimento,
        cleanedData.tipo_natureza_idtipo_natureza,
        cleanedData.tipo_turno_idtipo_turno || null
      );

      // Prepara os parâmetros para a inserção
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
        cleanedData.ativo || 'N'
      ];

      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO estabelecimento (
          codigo_unidade, nome, cnes, cnpj, cidade, logradouro, bairro, numero,
          latitude, longitude,
          tipo_estabelecimento_idtipo_estabelecimento,
          tipo_natureza_idtipo_natureza,
          tipo_turno_idtipo_turno,
          ativo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        insertParams
      );

      const estabelecimentoId = result.insertId;

      // Insere as qualificações, se houver
      if (Array.isArray(cleanedData.qualificacoes) && cleanedData.qualificacoes.length > 0) {
        for (const qualId of cleanedData.qualificacoes) {
          await connection.query(
            'INSERT INTO estabelecimento_has_tipo_qualificacao VALUES (?, ?)',
            [estabelecimentoId, qualId]
          );
        }
      }

      // Insere as habilitações, se houver
      if (Array.isArray(cleanedData.habilitacoes) && cleanedData.habilitacoes.length > 0) {
        for (const habId of cleanedData.habilitacoes) {
          await connection.query(
            'INSERT INTO estabelecimento_has_tipo_habilitacao (estabelecimento_idestabelecimento, tipo_habilitacao_idtipo_habilitacao) VALUES (?, ?)',
            [estabelecimentoId, habId]
          );
        }
      }

      await connection.commit();

      return EstabelecimentoCrudService.getById(estabelecimentoId);
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao criar estabelecimento:', error);
      
      if (error instanceof BusinessError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new BusinessError(error.message);
      }
      throw new BusinessError('Erro desconhecido ao criar estabelecimento');
    } finally {
      connection.release();
    }
  },

  update: async (id: number, data: any) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Primeiro, vamos verificar se o estabelecimento existe
      const [currentEstab] = await connection.query<RowDataPacket[]>(
        'SELECT cnpj, cnes, codigo_unidade FROM estabelecimento WHERE idestabelecimento = ?',
        [id]
      );

      console.log('Estabelecimento atual:', {
        id,
        current: currentEstab[0],
        newData: {
          cnpj: data.cnpj?.trim(),
          cnes: data.cnes?.trim(),
          codigo_unidade: data.codigo_unidade?.trim()
        }
      });

      // Se o CNPJ foi alterado, verifica duplicidade
      if (data.cnpj && data.cnpj !== currentEstab[0]?.cnpj) {
        const [duplicateCnpj] = await connection.query<RowDataPacket[]>(
          'SELECT idestabelecimento FROM estabelecimento WHERE cnpj = ? AND idestabelecimento != ?',
          [data.cnpj.trim(), id]
        );

        console.log('Verificação CNPJ:', {
          novoCnpj: data.cnpj.trim(),
          cnpjAtual: currentEstab[0]?.cnpj,
          duplicatasEncontradas: duplicateCnpj.length,
          resultadoBusca: duplicateCnpj
        });

        if (duplicateCnpj.length > 0) {
          throw new BusinessError('CNPJ já cadastrado em outro estabelecimento');
        }
      }

      // Se o CNES foi alterado, verifica duplicidade
      if (data.cnes && data.cnes !== currentEstab[0]?.cnes) {
        const [duplicateCnes] = await connection.query<RowDataPacket[]>(
          'SELECT idestabelecimento FROM estabelecimento WHERE cnes = ? AND idestabelecimento != ?',
          [data.cnes.trim(), id]
        );

        if (duplicateCnes.length > 0) {
          throw new BusinessError('CNES já cadastrado em outro estabelecimento');
        }
      }

      // Se o código foi alterado, verifica duplicidade
      if (data.codigo_unidade && data.codigo_unidade !== currentEstab[0]?.codigo_unidade) {
        const [duplicateCodigo] = await connection.query<RowDataPacket[]>(
          'SELECT idestabelecimento FROM estabelecimento WHERE codigo_unidade = ? AND idestabelecimento != ?',
          [data.codigo_unidade.trim(), id]
        );

        if (duplicateCodigo.length > 0) {
          throw new BusinessError('Código já cadastrado em outro estabelecimento');
        }
      }

      const updateQuery = `
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
      `;

      const updateParams = [
        data.codigo_unidade?.trim() || null,
        data.nome?.trim(),
        data.cnes?.trim() || null,
        data.cnpj?.trim() || null,
        data.cidade?.trim() || null,
        data.logradouro?.trim() || null,
        data.bairro?.trim() || null,
        data.numero?.trim() || null,
        data.latitude || null,
        data.longitude || null,
        data.tipo_estabelecimento_idtipo_estabelecimento,
        data.tipo_natureza_idtipo_natureza,
        data.tipo_turno_idtipo_turno || null,
        data.ativo || 'N',
        id
      ];

      await connection.query(updateQuery, updateParams);

      // 1. Buscar qualificações já existentes para este estabelecimento
      const [existingQualificacoesRows] = await connection.query<RowDataPacket[]>(
        'SELECT tipo_qualificacao_idtipo_qualificacao FROM estabelecimento_has_tipo_qualificacao WHERE estabelecimento_idestabelecimento = ?',
        [id]
      );
      const existingQualificacoesIds = existingQualificacoesRows.map(row => row.tipo_qualificacao_idtipo_qualificacao);

      // 2. Identificar as novas qualificações (para adicionar)
      const novasQualificacoesIds = (Array.isArray(data.qualificacoes) ? data.qualificacoes : [])
        .filter((qualId: number) => !existingQualificacoesIds.includes(qualId));

      // 3. Inserir apenas as novas qualificações
      if (novasQualificacoesIds.length > 0) {
        for (const qualId of novasQualificacoesIds) {
          await connection.query(
            'INSERT INTO estabelecimento_has_tipo_qualificacao VALUES (?, ?)',
            [id, qualId]
          );
        }
      }

      // 4. Identificar qualificações a serem removidas (que existem, mas não estão na lista atual)
      const qualificacoesRemoverIds = existingQualificacoesIds
        .filter(existingQualId => !(Array.isArray(data.qualificacoes) ? data.qualificacoes : []).includes(existingQualId));

      // 5. Remover as qualificações desmarcadas
      if (qualificacoesRemoverIds.length > 0) {
        for (const qualIdToRemove of qualificacoesRemoverIds) {
          await connection.query(
            'DELETE FROM estabelecimento_has_tipo_qualificacao WHERE estabelecimento_idestabelecimento = ? AND tipo_qualificacao_idtipo_qualificacao = ?',
            [id, qualIdToRemove]
          );
        }
      }

      // --------------------------------------------------
      // Lógica Modificada para Habilitações (IMPLEMENTANDO "SOMA")
      // --------------------------------------------------

      // 1. Buscar habilitações já existentes para este estabelecimento
      const [existingHabilitacoesRows] = await connection.query<RowDataPacket[]>(
        'SELECT tipo_habilitacao_idtipo_habilitacao FROM estabelecimento_has_tipo_habilitacao WHERE estabelecimento_idestabelecimento = ?',
        [id]
      );
      const existingHabilitacoesIds = existingHabilitacoesRows.map(row => row.tipo_habilitacao_idtipo_habilitacao);

      // 2. Identificar as novas habilitações (para adicionar)
      const novasHabilitacoesIds = (Array.isArray(data.habilitacoes) ? data.habilitacoes : [])
        .filter((habId: number) => !existingHabilitacoesIds.includes(habId));

      // 3. Inserir apenas as novas habilitações
      if (novasHabilitacoesIds.length > 0) {
        for (const habId of novasHabilitacoesIds) {
          await connection.query(
            'INSERT INTO estabelecimento_has_tipo_habilitacao VALUES (?, ?)',
            [id, habId]
          );
        }
      }

      // 4. Identificar habilitações a serem removidas (que existem, mas não estão na lista atual)
      const habilitacoesRemoverIds = existingHabilitacoesIds
        .filter(existingHabId => !(Array.isArray(data.habilitacoes) ? data.habilitacoes : []).includes(existingHabId));


      // 5. Remover as habilitações desmarcadas
      if (habilitacoesRemoverIds.length > 0) {
        for (const habIdToRemove of habilitacoesRemoverIds) {
          await connection.query(
            'DELETE FROM estabelecimento_has_tipo_habilitacao WHERE estabelecimento_idestabelecimento = ? AND tipo_habilitacao_idtipo_habilitacao = ?',
            [id, habIdToRemove]
          );
        }
      }


      await connection.commit();
      return await EstabelecimentoCrudService.getById(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
},

delete: async (id: number) => {
const connection = await pool.getConnection();
try {
await connection.beginTransaction();

// Exclui os registros das tabelas de relacionamento primeiro
await connection.query(
  'DELETE FROM estabelecimento_has_tipo_qualificacao WHERE estabelecimento_idestabelecimento = ?',
  [id]
);
await connection.query(
  'DELETE FROM estabelecimento_has_tipo_habilitacao WHERE estabelecimento_idestabelecimento = ?',
  [id]
);
// Em seguida, exclui o registro principal
await connection.query(
  'DELETE FROM estabelecimento WHERE idestabelecimento = ?',
  [id]
);

await connection.commit();
} catch (error) {
await connection.rollback();
console.error('Erro ao excluir estabelecimento:', error);
throw new BusinessError(error instanceof Error ? error.message : 'Erro desconhecido ao excluir estabelecimento');
} finally {
connection.release();
}
}
};
