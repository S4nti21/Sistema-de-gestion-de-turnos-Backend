const { Router } = require("express");
const {
  crearTurno,
  listarMisTurnos,
  listarTurnosMedico,
  listarTurnosSede,
  cancelarTurno,
  atenderTurno,
} = require("../controllers/turno.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken);

router.post("/", verificarRol("paciente", "operador"), crearTurno);
router.get("/mis-turnos", verificarRol("paciente"), listarMisTurnos);
router.get("/medico", verificarRol("medico"), listarTurnosMedico);
router.get("/sede", verificarRol("operador"), listarTurnosSede);
router.patch("/:id/cancelar", verificarRol("paciente", "operador", "medico"), cancelarTurno);
router.patch("/:id/atender", verificarRol("medico"), atenderTurno);

module.exports = router;
