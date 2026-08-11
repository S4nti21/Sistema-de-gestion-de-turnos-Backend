const pool = require("../config/db");
const { enviarRespuesta } = require("../utils/respuesta");

async function listarCoberturas(req, res) {
  try {
    const [coberturas] = await pool.query("SELECT id, nombre FROM cobertura ORDER BY nombre");
    return enviarRespuesta(res, 200, "ok", coberturas);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al obtener las coberturas");
  }
}

module.exports = { listarCoberturas };
