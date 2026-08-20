const pool = require("../config/db");
const { enviarRespuesta } = require("../utils/respuesta");

async function crearEspecialidad(req, res) {
  try {
    const { descripcion } = req.body;

    if (!descripcion) {
      return enviarRespuesta(res, 400, "Falta el dato obligatorio: descripcion");
    }

    const [resultado] = await pool.query(
      "INSERT INTO especialidad (descripcion) VALUES (?)",
      [descripcion]
    );

    const [especialidades] = await pool.query(
      "SELECT id, descripcion FROM especialidad WHERE id = ?",
      [resultado.insertId]
    );

    return enviarRespuesta(res, 201, "ok", especialidades[0]);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al crear la especialidad");
  }
}

async function listarEspecialidades(req, res) {
  try {
    const [especialidades] = await pool.query(
      "SELECT id, descripcion FROM especialidad ORDER BY descripcion"
    );
    return enviarRespuesta(res, 200, "ok", especialidades);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al obtener las especialidades");
  }
}

async function actualizarEspecialidad(req, res) {
  try {
    const { id } = req.params;
    const { descripcion } = req.body;

    const [especialidades] = await pool.query("SELECT id FROM especialidad WHERE id = ?", [id]);
    if (especialidades.length === 0) {
      return enviarRespuesta(res, 404, "La especialidad indicada no existe");
    }

    if (!descripcion) {
      return enviarRespuesta(res, 400, "Falta el dato obligatorio: descripcion");
    }

    await pool.query("UPDATE especialidad SET descripcion = ? WHERE id = ?", [descripcion, id]);

    const [actualizada] = await pool.query(
      "SELECT id, descripcion FROM especialidad WHERE id = ?",
      [id]
    );

    return enviarRespuesta(res, 200, "ok", actualizada[0]);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al actualizar la especialidad");
  }
}

async function eliminarEspecialidad(req, res) {
  try {
    const { id } = req.params;

    const [especialidades] = await pool.query("SELECT id FROM especialidad WHERE id = ?", [id]);
    if (especialidades.length === 0) {
      return enviarRespuesta(res, 404, "La especialidad indicada no existe");
    }

    const [medicos] = await pool.query(
      "SELECT id FROM medico_especialidad WHERE id_especialidad = ? LIMIT 1",
      [id]
    );
    if (medicos.length > 0) {
      return enviarRespuesta(res, 409, "No se puede eliminar la especialidad: tiene médicos asociados");
    }

    await pool.query("DELETE FROM especialidad WHERE id = ?", [id]);

    return enviarRespuesta(res, 200, "ok", { id: Number(id) });
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al eliminar la especialidad");
  }
}

module.exports = { crearEspecialidad, listarEspecialidades, actualizarEspecialidad, eliminarEspecialidad };
