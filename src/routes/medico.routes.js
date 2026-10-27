const { Router } = require("express");
const { listarMedicos, obtenerMedico } = require("../controllers/medico.controller");
const { verificarToken } = require("../middlewares/auth.middleware");

const router = Router();

// Lo usan el operador para cargar agenda, el medico para ver sus especialidades
// y el paciente al pedir un turno: alcanza con tener sesion.
router.use(verificarToken);

router.get("/", listarMedicos);
router.get("/:id", obtenerMedico);

module.exports = router;
