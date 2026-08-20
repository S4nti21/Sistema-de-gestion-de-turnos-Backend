const { Router } = require("express");
const { crearSede, listarSedes, actualizarSede, eliminarSede } = require("../controllers/sede.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken, verificarRol("administrador"));

router.post("/", crearSede);
router.get("/", listarSedes);
router.put("/:id", actualizarSede);
router.delete("/:id", eliminarSede);

module.exports = router;
