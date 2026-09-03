const { Router } = require("express");
const { listarLogs } = require("../controllers/auditoria.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken, verificarRol("administrador"));

router.get("/", listarLogs);

module.exports = router;
