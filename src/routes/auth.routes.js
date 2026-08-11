const { Router } = require("express");
const { registro, login, perfil } = require("../controllers/auth.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");
const { enviarRespuesta } = require("../utils/respuesta");

const router = Router();

router.post("/registro", registro);
router.post("/login", login);
router.get("/perfil", verificarToken, perfil);

// Endpoint de prueba para validar verificarRol (devuelve 403 si el rol no es admin)
router.get("/admin-test", verificarToken, verificarRol("admin"), (req, res) => {
  return enviarRespuesta(res, 200, "ok", { mensaje: "Acceso de administrador concedido" });
});

module.exports = router;
