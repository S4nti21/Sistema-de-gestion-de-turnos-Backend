const { Router } = require("express");
const {
  crearEspecialidad,
  listarEspecialidades,
  actualizarEspecialidad,
  eliminarEspecialidad,
} = require("../controllers/especialidad.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken, verificarRol("administrador"));

router.post("/", crearEspecialidad);
router.get("/", listarEspecialidades);
router.put("/:id", actualizarEspecialidad);
router.delete("/:id", eliminarEspecialidad);

module.exports = router;
