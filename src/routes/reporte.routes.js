const { Router } = require("express");
const {
  turnosPorEspecialidad,
  turnosPorSede,
  rankingMedicos,
  tasaCancelacion,
} = require("../controllers/reporte.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken, verificarRol("administrador"));

router.get("/turnos-por-especialidad", turnosPorEspecialidad);
router.get("/turnos-por-sede", turnosPorSede);
router.get("/ranking-medicos", rankingMedicos);
router.get("/tasa-cancelacion", tasaCancelacion);

module.exports = router;
