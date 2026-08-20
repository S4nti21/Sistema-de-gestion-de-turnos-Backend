const pool = require("../config/db");
const { enviarRespuesta } = require("../utils/respuesta");

async function crearAgenda(req, res) {
  try {
    const { hora_entrada, hora_salida, fecha, id_especialidad, id_sede } = req.body;
    let { id_medico } = req.body;

    if (req.usuario.rol === "medico") {
      if (id_medico && Number(id_medico) !== req.usuario.id) {
        return enviarRespuesta(res, 403, "Un médico solo puede cargar su propia agenda");
      }
      id_medico = req.usuario.id;
    }

    if (!hora_entrada || !hora_salida || !fecha || !id_medico || !id_especialidad || !id_sede) {
      return enviarRespuesta(
        res,
        400,
        "Faltan datos obligatorios: hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede"
      );
    }

    const [medicos] = await pool.query(
      "SELECT id FROM usuario WHERE id = ? AND rol = 'medico'",
      [id_medico]
    );
    if (medicos.length === 0) {
      return enviarRespuesta(res, 400, "El id_medico indicado no corresponde a un médico existente");
    }

    const [especialidades] = await pool.query("SELECT id FROM especialidad WHERE id = ?", [
      id_especialidad,
    ]);
    if (especialidades.length === 0) {
      return enviarRespuesta(res, 400, "La especialidad indicada no existe");
    }

    const [sedes] = await pool.query("SELECT id FROM sede WHERE id = ?", [id_sede]);
    if (sedes.length === 0) {
      return enviarRespuesta(res, 400, "La sede indicada no existe");
    }

    const [resultado] = await pool.query(
      `INSERT INTO agenda (hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede]
    );

    const [agenda] = await pool.query("SELECT * FROM agenda WHERE id = ?", [resultado.insertId]);

    return enviarRespuesta(res, 201, "ok", agenda[0]);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al crear la agenda");
  }
}

async function listarAgenda(req, res) {
  try {
    const { id_sede, fecha } = req.query;
    let { id_medico } = req.query;

    if (req.usuario.rol === "medico") {
      id_medico = req.usuario.id;
    }

    const condiciones = [];
    const valores = [];

    if (id_medico) {
      condiciones.push("id_medico = ?");
      valores.push(id_medico);
    }
    if (id_sede) {
      condiciones.push("id_sede = ?");
      valores.push(id_sede);
    }
    if (fecha) {
      condiciones.push("fecha = ?");
      valores.push(fecha);
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

    const [agenda] = await pool.query(
      `SELECT * FROM agenda ${where} ORDER BY fecha, hora_entrada`,
      valores
    );

    return enviarRespuesta(res, 200, "ok", agenda);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al obtener la agenda");
  }
}

async function actualizarAgenda(req, res) {
  try {
    const { id } = req.params;
    const { hora_entrada, hora_salida, fecha, id_especialidad, id_sede } = req.body;

    const [filas] = await pool.query("SELECT * FROM agenda WHERE id = ?", [id]);
    if (filas.length === 0) {
      return enviarRespuesta(res, 404, "El registro de agenda indicado no existe");
    }

    const registro = filas[0];

    if (req.usuario.rol === "medico" && registro.id_medico !== req.usuario.id) {
      return enviarRespuesta(res, 403, "Un médico solo puede modificar su propia agenda");
    }

    if (!hora_entrada || !hora_salida || !fecha || !id_especialidad || !id_sede) {
      return enviarRespuesta(
        res,
        400,
        "Faltan datos obligatorios: hora_entrada, hora_salida, fecha, id_especialidad, id_sede"
      );
    }

    const [especialidades] = await pool.query("SELECT id FROM especialidad WHERE id = ?", [
      id_especialidad,
    ]);
    if (especialidades.length === 0) {
      return enviarRespuesta(res, 400, "La especialidad indicada no existe");
    }

    const [sedes] = await pool.query("SELECT id FROM sede WHERE id = ?", [id_sede]);
    if (sedes.length === 0) {
      return enviarRespuesta(res, 400, "La sede indicada no existe");
    }

    await pool.query(
      `UPDATE agenda SET hora_entrada = ?, hora_salida = ?, fecha = ?, id_especialidad = ?, id_sede = ?
       WHERE id = ?`,
      [hora_entrada, hora_salida, fecha, id_especialidad, id_sede, id]
    );

    const [actualizada] = await pool.query("SELECT * FROM agenda WHERE id = ?", [id]);

    return enviarRespuesta(res, 200, "ok", actualizada[0]);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al actualizar la agenda");
  }
}

async function eliminarAgenda(req, res) {
  try {
    const { id } = req.params;

    const [filas] = await pool.query("SELECT * FROM agenda WHERE id = ?", [id]);
    if (filas.length === 0) {
      return enviarRespuesta(res, 404, "El registro de agenda indicado no existe");
    }

    const registro = filas[0];

    if (req.usuario.rol === "medico" && registro.id_medico !== req.usuario.id) {
      return enviarRespuesta(res, 403, "Un médico solo puede eliminar su propia agenda");
    }

    const [turnos] = await pool.query("SELECT id FROM turno WHERE id_agenda = ? LIMIT 1", [id]);
    if (turnos.length > 0) {
      return enviarRespuesta(res, 409, "No se puede eliminar la agenda: tiene turnos asociados");
    }

    await pool.query("DELETE FROM agenda WHERE id = ?", [id]);

    return enviarRespuesta(res, 200, "ok", { id: Number(id) });
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al eliminar la agenda");
  }
}

module.exports = { crearAgenda, listarAgenda, actualizarAgenda, eliminarAgenda };
