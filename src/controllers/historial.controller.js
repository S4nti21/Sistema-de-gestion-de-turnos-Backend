const pool = require("../config/db");
const { enviarRespuesta } = require("../utils/respuesta");
const { obtenerTurnoDetalle } = require("./turno.controller");

async function registrarHistorial(req, res) {
  const connection = await pool.getConnection();

  try {
    const { id_turno } = req.params;
    const { diagnostico, tratamiento, observaciones } = req.body;

    if (!diagnostico || !tratamiento || !observaciones) {
      return enviarRespuesta(
        res,
        400,
        "Faltan datos obligatorios: diagnostico, tratamiento, observaciones"
      );
    }

    await connection.beginTransaction();

    const turno = await obtenerTurnoDetalle(connection, id_turno);
    if (!turno) {
      await connection.rollback();
      return enviarRespuesta(res, 404, "El turno indicado no existe");
    }

    if (req.usuario.rol !== "medico" || turno.id_medico !== req.usuario.id) {
      await connection.rollback();
      return enviarRespuesta(res, 403, "Solo podes registrar el historial de tus propios turnos");
    }

    if (turno.estado !== "atendido") {
      await connection.rollback();
      return enviarRespuesta(res, 409, "Solo se puede registrar historial sobre turnos atendidos");
    }

    const [existentes] = await connection.query(
      "SELECT id FROM historial_clinico WHERE id_turno = ? LIMIT 1",
      [id_turno]
    );
    if (existentes.length > 0) {
      await connection.rollback();
      return enviarRespuesta(res, 409, "El turno ya tiene historial clinico registrado");
    }

    const [resultado] = await connection.query(
      `INSERT INTO historial_clinico
       (id_turno, id_medico, id_paciente, diagnostico, tratamiento, observaciones, fecha)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [id_turno, req.usuario.id, turno.id_paciente, diagnostico, tratamiento, observaciones]
    );

    const [historial] = await connection.query(
      `SELECT
         hc.id,
         hc.id_turno,
         hc.id_medico,
         hc.id_paciente,
         hc.diagnostico,
         hc.tratamiento,
         hc.observaciones,
         hc.fecha,
         t.fecha AS turno_fecha,
         t.hora AS turno_hora
       FROM historial_clinico hc
       INNER JOIN turno t ON t.id = hc.id_turno
       WHERE hc.id = ?`,
      [resultado.insertId]
    );

    await connection.commit();
    return enviarRespuesta(res, 201, "ok", historial[0]);
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return enviarRespuesta(res, 500, "Error al registrar el historial clinico");
  } finally {
    connection.release();
  }
}

async function consultarHistorialPaciente(req, res) {
  try {
    const { id_paciente } = req.params;

    const [usuarios] = await pool.query("SELECT id, rol FROM usuario WHERE id = ?", [id_paciente]);
    if (usuarios.length === 0 || usuarios[0].rol !== "paciente") {
      return enviarRespuesta(res, 404, "El paciente indicado no existe");
    }

    if (req.usuario.rol === "paciente" && Number(id_paciente) !== Number(req.usuario.id)) {
      return enviarRespuesta(res, 403, "Solo podes consultar tu propio historial clinico");
    }

    let sql = `
      SELECT
        hc.id,
        hc.id_turno,
        hc.id_medico,
        hc.id_paciente,
        hc.diagnostico,
        hc.tratamiento,
        hc.observaciones,
        hc.fecha,
        t.fecha AS turno_fecha,
        t.hora AS turno_hora,
        CONCAT(m.nombre, ' ', m.apellido) AS medico_nombre
      FROM historial_clinico hc
      INNER JOIN turno t ON t.id = hc.id_turno
      INNER JOIN usuario m ON m.id = hc.id_medico
      WHERE hc.id_paciente = ?
    `;
    const valores = [id_paciente];

    if (req.usuario.rol === "medico") {
      sql += " AND hc.id_medico = ?";
      valores.push(req.usuario.id);
    } else if (req.usuario.rol !== "paciente") {
      return enviarRespuesta(res, 403, "No tenes permisos para consultar historial clinico");
    }

    sql += " ORDER BY hc.fecha DESC, hc.id DESC";

    const [historial] = await pool.query(sql, valores);
    return enviarRespuesta(res, 200, "ok", historial);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al consultar el historial clinico");
  }
}

module.exports = {
  registrarHistorial,
  consultarHistorialPaciente,
};
