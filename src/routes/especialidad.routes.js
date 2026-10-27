const { Router } = require("express");
const {
  crearEspecialidad,
  listarEspecialidades,
  actualizarEspecialidad,
  eliminarEspecialidad,
} = require("../controllers/especialidad.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken);

// El listado lo usan todos los roles para elegir una especialidad; el ABM es solo del administrador.
router.get("/", listarEspecialidades);
router.post("/", verificarRol("administrador"), crearEspecialidad);
router.put("/:id", verificarRol("administrador"), actualizarEspecialidad);
router.delete("/:id", verificarRol("administrador"), eliminarEspecialidad);

module.exports = router;
