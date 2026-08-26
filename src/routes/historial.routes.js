const { Router } = require("express");
const {
  registrarHistorial,
  consultarHistorialPaciente,
} = require("../controllers/historial.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken);

router.post("/turnos/:id_turno", verificarRol("medico"), registrarHistorial);
router.get("/paciente/:id_paciente", verificarRol("paciente", "medico"), consultarHistorialPaciente);

module.exports = router;
