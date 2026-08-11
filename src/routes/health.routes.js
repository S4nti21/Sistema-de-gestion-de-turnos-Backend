const { Router } = require("express");
const pool = require("../config/db");
const { enviarRespuesta } = require("../utils/respuesta");

const router = Router();

router.get("/", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return enviarRespuesta(res, 200, "ok", { db: "conectada" });
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "No se pudo conectar a la base de datos");
  }
});

module.exports = router;
