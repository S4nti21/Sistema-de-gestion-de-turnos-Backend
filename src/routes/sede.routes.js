const { Router } = require("express");
const { crearSede, listarSedes, actualizarSede, eliminarSede } = require("../controllers/sede.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken);

// El listado lo usan todos los roles para elegir una sede; el ABM es solo del administrador.
router.get("/", listarSedes);
router.post("/", verificarRol("administrador"), crearSede);
router.put("/:id", verificarRol("administrador"), actualizarSede);
router.delete("/:id", verificarRol("administrador"), eliminarSede);

module.exports = router;
