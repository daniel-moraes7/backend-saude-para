"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const components_1 = __importDefault(require("./routes/components"));
const app = (0, express_1.default)();
// Middleware para habilitar CORS — permita seu frontend acessar a API
app.use((0, cors_1.default)());
// Middleware para interpretar JSON no body das requisições
app.use(express_1.default.json());
// Rotas
app.use('/api/componentes', components_1.default);
// Rota simples de teste
app.get('/', (req, res) => {
    res.send('API de componentes funcionando!');
});
exports.default = app;
