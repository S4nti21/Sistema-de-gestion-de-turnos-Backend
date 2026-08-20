const { Router } = require("express");
const {
  crearAgenda,
  listarAgenda,
  actualizarAgenda,
  eliminarAgenda,
} = require("../controllers/agenda.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken, verificarRol("medico", "operador", "administrador"));

router.post("/", crearAgenda);
router.get("/", listarAgenda);
router.put("/:id", actualizarAgenda);
router.delete("/:id", eliminarAgenda);

module.exports = router;
