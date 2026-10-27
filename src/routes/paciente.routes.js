const { Router } = require("express");
const { buscarPacientes, actualizarMisDatos } = require("../controllers/paciente.controller");
const { registro } = require("../controllers/auth.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");
const { auditar } = require("../middlewares/auditoria.middleware");

const router = Router();

router.use(verificarToken);

router.get("/", verificarRol("operador", "medico", "administrador"), buscarPacientes);

// El alta que hace el operador valida lo mismo que el registro publico; al pasar
// por auditar() con token, el log queda a nombre del operador.
router.post("/", verificarRol("operador"), auditar("usuario"), registro);

router.put("/mis-datos", verificarRol("paciente"), auditar("usuario"), actualizarMisDatos);

module.exports = router;
