const { Router } = require("express");
const {
  listarNotificaciones,
  marcarNotificacionLeida,
} = require("../controllers/notificacion.controller");
const { verificarToken } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken);

router.get("/", listarNotificaciones);
router.patch("/:id/leida", marcarNotificacionLeida);

module.exports = router;
