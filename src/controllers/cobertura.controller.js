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

async function crearCobertura(req, res) {
  try {
    const { nombre } = req.body;

    if (!nombre) {
      return enviarRespuesta(res, 400, "Falta el dato obligatorio: nombre");
    }

    const [resultado] = await pool.query("INSERT INTO cobertura (nombre) VALUES (?)", [nombre]);

    const [coberturas] = await pool.query("SELECT id, nombre FROM cobertura WHERE id = ?", [
      resultado.insertId,
    ]);

    return enviarRespuesta(res, 201, "ok", coberturas[0]);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al crear la cobertura");
  }
}

async function actualizarCobertura(req, res) {
  try {
    const { id } = req.params;
    const { nombre } = req.body;

    const [coberturas] = await pool.query("SELECT id FROM cobertura WHERE id = ?", [id]);
    if (coberturas.length === 0) {
      return enviarRespuesta(res, 404, "La cobertura indicada no existe");
    }

    if (!nombre) {
      return enviarRespuesta(res, 400, "Falta el dato obligatorio: nombre");
    }

    await pool.query("UPDATE cobertura SET nombre = ? WHERE id = ?", [nombre, id]);

    const [actualizada] = await pool.query("SELECT id, nombre FROM cobertura WHERE id = ?", [id]);

    return enviarRespuesta(res, 200, "ok", actualizada[0]);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al actualizar la cobertura");
  }
}

async function eliminarCobertura(req, res) {
  try {
    const { id } = req.params;

    const [coberturas] = await pool.query("SELECT id FROM cobertura WHERE id = ?", [id]);
    if (coberturas.length === 0) {
      return enviarRespuesta(res, 404, "La cobertura indicada no existe");
    }

    const [usuarios] = await pool.query(
      "SELECT id FROM usuario WHERE id_cobertura = ? LIMIT 1",
      [id]
    );
    if (usuarios.length > 0) {
      return enviarRespuesta(res, 409, "No se puede eliminar la cobertura: tiene usuarios asociados");
    }

    await pool.query("DELETE FROM cobertura WHERE id = ?", [id]);

    return enviarRespuesta(res, 200, "ok", { id: Number(id) });
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al eliminar la cobertura");
  }
}

module.exports = {
  listarCoberturas,
  crearCobertura,
  actualizarCobertura,
  eliminarCobertura,
};
