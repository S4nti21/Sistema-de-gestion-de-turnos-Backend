const { Router } = require("express");
const {
  listarCoberturas,
  crearCobertura,
  actualizarCobertura,
  eliminarCobertura,
} = require("../controllers/cobertura.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

const router = Router();

// Listado público: lo reutiliza el registro de pacientes (semana 1), no requiere token.
router.get("/", listarCoberturas);

router.post("/", verificarToken, verificarRol("administrador"), crearCobertura);
router.put("/:id", verificarToken, verificarRol("administrador"), actualizarCobertura);
router.delete("/:id", verificarToken, verificarRol("administrador"), eliminarCobertura);

module.exports = router;
