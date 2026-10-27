const { Router } = require("express");
const {
  fechasDisponibles,
  horariosDisponibles,
} = require("../controllers/disponibilidad.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

const router = Router();

// La usan el paciente al pedir un turno y el operador al asignarlo.
router.use(verificarToken, verificarRol("paciente", "operador"));

router.get("/fechas", fechasDisponibles);
router.get("/horarios", horariosDisponibles);

module.exports = router;
