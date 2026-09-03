const { Router } = require("express");
const { registro, login, perfil } = require("../controllers/auth.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");
const { auditar } = require("../middlewares/auditoria.middleware");
const { enviarRespuesta } = require("../utils/respuesta");

const router = Router();

// El registro es un alta de usuario, asi que se audita. El login no: es un POST,
// pero no crea ni modifica nada.
router.post("/registro", auditar("usuario"), registro);
router.post("/login", login);
router.get("/perfil", verificarToken, perfil);

// Endpoint de prueba para validar verificarRol (devuelve 403 si el rol no es administrador)
router.get("/admin-test", verificarToken, verificarRol("administrador"), (req, res) => {
  return enviarRespuesta(res, 200, "ok", { mensaje: "Acceso de administrador concedido" });
});

module.exports = router;
