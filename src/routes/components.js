"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/components.ts
const express_1 = require("express");
const ComponentsService_1 = require("../services/ComponentsService");
const router = (0, express_1.Router)();
/**
 * GET /api/componentes
 * Lista todos os componentes (id: number, descricao: string)
 */
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const componentes = yield ComponentsService_1.ComponentsService.getAll();
        // cada componente provavelmente tem { idcomponente: number, descricao: string } no DB
        return res.json(componentes);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro ao buscar componentes' });
    }
}));
/**
 * GET /api/componentes/:id
 * Retorna um componente específico pelo ID (numérico no DB)
 */
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Convertendo a string da rota para número
        const componenteId = Number(req.params.id);
        const componente = yield ComponentsService_1.ComponentsService.getById(componenteId);
        if (!componente) {
            return res.status(404).json({ error: 'Componente não encontrado' });
        }
        return res.json(componente);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro ao buscar componente' });
    }
}));
/**
 * POST /api/componentes
 * Cria um novo componente (descricao: string)
 */
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { descricao } = req.body;
        if (!descricao) {
            return res.status(400).json({ error: 'Descrição é obrigatória' });
        }
        // ID é gerado no DB, mas 'descricao' é string
        const result = yield ComponentsService_1.ComponentsService.create(descricao);
        return res.status(201).json({ success: true, result });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro ao criar componente' });
    }
}));
/**
 * PUT /api/componentes/:id
 * Atualiza a descrição de um componente existente
 * Body: { descricao: string }
 */
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const componenteId = Number(req.params.id);
        const { descricao } = req.body;
        if (!descricao) {
            return res.status(400).json({ error: 'Descrição é obrigatória' });
        }
        yield ComponentsService_1.ComponentsService.update(componenteId, descricao);
        return res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro ao atualizar componente' });
    }
}));
/**
 * DELETE /api/componentes/:id
 * Exclui um componente pelo ID (numérico)
 */
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const componenteId = Number(req.params.id);
        yield ComponentsService_1.ComponentsService.delete(componenteId);
        return res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro ao excluir componente' });
    }
}));
exports.default = router;
