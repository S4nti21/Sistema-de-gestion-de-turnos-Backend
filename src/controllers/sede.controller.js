const pool = require("../config/db");
const { enviarRespuesta } = require("../utils/respuesta");

async function crearSede(req, res) {
  try {
    const { nombre, direccion, telefono } = req.body;

    if (!nombre || !direccion || !telefono) {
      return enviarRespuesta(res, 400, "Faltan datos obligatorios: nombre, direccion, telefono");
    }

    const [resultado] = await pool.query(
      "INSERT INTO sede (nombre, direccion, telefono) VALUES (?, ?, ?)",
      [nombre, direccion, telefono]
    );

    const [sedes] = await pool.query(
      "SELECT id, nombre, direccion, telefono FROM sede WHERE id = ?",
      [resultado.insertId]
    );

    return enviarRespuesta(res, 201, "ok", sedes[0]);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al crear la sede");
  }
}

async function listarSedes(req, res) {
  try {
    const [sedes] = await pool.query("SELECT id, nombre, direccion, telefono FROM sede ORDER BY nombre");
    return enviarRespuesta(res, 200, "ok", sedes);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al obtener las sedes");
  }
}

async function actualizarSede(req, res) {
  try {
    const { id } = req.params;
    const { nombre, direccion, telefono } = req.body;

    const [sedes] = await pool.query("SELECT id FROM sede WHERE id = ?", [id]);
    if (sedes.length === 0) {
      return enviarRespuesta(res, 404, "La sede indicada no existe");
    }

    if (!nombre || !direccion || !telefono) {
      return enviarRespuesta(res, 400, "Faltan datos obligatorios: nombre, direccion, telefono");
    }

    await pool.query(
      "UPDATE sede SET nombre = ?, direccion = ?, telefono = ? WHERE id = ?",
      [nombre, direccion, telefono, id]
    );

    const [actualizada] = await pool.query(
      "SELECT id, nombre, direccion, telefono FROM sede WHERE id = ?",
      [id]
    );

    return enviarRespuesta(res, 200, "ok", actualizada[0]);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al actualizar la sede");
  }
}

async function eliminarSede(req, res) {
  try {
    const { id } = req.params;

    const [sedes] = await pool.query("SELECT id FROM sede WHERE id = ?", [id]);
    if (sedes.length === 0) {
      return enviarRespuesta(res, 404, "La sede indicada no existe");
    }

    const [medicos] = await pool.query(
      "SELECT id FROM usuario WHERE id_sede = ? AND rol = 'medico' LIMIT 1",
      [id]
    );
    if (medicos.length > 0) {
      return enviarRespuesta(res, 409, "No se puede eliminar la sede: tiene médicos asociados");
    }

    const [operadores] = await pool.query(
      "SELECT id FROM usuario WHERE id_sede = ? AND rol = 'operador' LIMIT 1",
      [id]
    );
    if (operadores.length > 0) {
      return enviarRespuesta(res, 409, "No se puede eliminar la sede: tiene operadores asociados");
    }

    const [agenda] = await pool.query("SELECT id FROM agenda WHERE id_sede = ? LIMIT 1", [id]);
    if (agenda.length > 0) {
      return enviarRespuesta(res, 409, "No se puede eliminar la sede: tiene agenda asociada");
    }

    await pool.query("DELETE FROM sede WHERE id = ?", [id]);

    return enviarRespuesta(res, 200, "ok", { id: Number(id) });
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al eliminar la sede");
  }
}

module.exports = { crearSede, listarSedes, actualizarSede, eliminarSede };
