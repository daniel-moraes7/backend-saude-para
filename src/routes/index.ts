import { Router } from "express";
import componentsRouter from "./components";
import tipoQualificacaoRouter from "./tipoQualificacao";
import tipoHabilitacaoRouter from "./tipoHabilitacao";
import tipoEstabelecimentoRouter from "./tipoEstabelecimento";
import turnoRouter from "./turnoRouter";
import naturezaRouter from "./natureza";
import estabelecimentoRouter from "./estabelecimento.routes";

const router = Router();

// Registra todas as rotas
router.use("/componentes", componentsRouter);
router.use("/tipo-qualificacao", tipoQualificacaoRouter);
router.use("/tipo-habilitacao", tipoHabilitacaoRouter);
router.use("/tipo-estabelecimento", tipoEstabelecimentoRouter);
router.use("/turnos", turnoRouter);
router.use("/natureza", naturezaRouter);
router.use("/estabelecimentos", estabelecimentoRouter);

export default router;