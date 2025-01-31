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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentsService = void 0;
const config_1 = __importDefault(require("../database/config"));
exports.ComponentsService = {
    getAll: () => __awaiter(void 0, void 0, void 0, function* () {
        const [rows] = yield config_1.default.query('SELECT * FROM componente ORDER BY idcomponente');
        return rows;
    }),
    getById: (id) => __awaiter(void 0, void 0, void 0, function* () {
        const [rows] = yield config_1.default.query('SELECT * FROM componente WHERE idcomponente = ?', [id]);
        return rows[0];
    }),
    create: (descricao) => __awaiter(void 0, void 0, void 0, function* () {
        const [result] = yield config_1.default.query('INSERT INTO componente (descricao) VALUES (?)', [descricao]);
        return result; // se quiser pegar o insertId e etc.
    }),
    update: (id, descricao) => __awaiter(void 0, void 0, void 0, function* () {
        yield config_1.default.query('UPDATE componente SET descricao = ? WHERE idcomponente = ?', [descricao, id]);
    }),
    delete: (id) => __awaiter(void 0, void 0, void 0, function* () {
        yield config_1.default.query('DELETE FROM componente WHERE idcomponente = ?', [id]);
    })
};
