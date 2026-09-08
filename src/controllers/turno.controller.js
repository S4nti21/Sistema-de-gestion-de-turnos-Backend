const pool = require("../config/db");
const { enviarRespuesta } = require("../utils/respuesta");

const SELECT_TURNO_DETALLE = `
  SELECT
    t.id,
    t.id_paciente,
    t.id_medico,
    t.id_especialidad,
    t.id_sede,
    t.fecha,
    t.hora,
    t.nota,
    t.id_cobertura,
    t.estado,
    CONCAT(p.nombre, ' ', p.apellido) AS paciente_nombre,
    CONCAT(m.nombre, ' ', m.apellido) AS medico_nombre,
    e.descripcion AS especialidad_descripcion,
    s.nombre AS sede_nombre
  FROM turno t
  LEFT JOIN usuario p ON p.id = t.id_paciente
  LEFT JOIN usuario m ON m.id = t.id_medico
  LEFT JOIN especialidad e ON e.id = t.id_especialidad
  LEFT JOIN sede s ON s.id = t.id_sede
`;

async function crearNotificacion(connection, idUsuario, tipo, mensaje) {
  await connection.query(
    `INSERT INTO notificacion (id_usuario, tipo, mensaje, fecha, leida)
     VALUES (?, ?, ?, NOW(), 0)`,
    [idUsuario, tipo, mensaje]
  );
}

async function obtenerTurnoDetalle(connection, idTurno) {
  const [turnos] = await connection.query(`${SELECT_TURNO_DETALLE} WHERE t.id = ?`, [idTurno]);
  return turnos[0] || null;
}

function validarAutorizacionTurno(turno, usuario) {
  if (usuario.rol === "paciente" && turno.id_paciente !== usuario.id) {
    return "Solo podes operar sobre tus propios turnos";
  }

  if ((usuario.rol === "operador" || usuario.rol === "medico") && turno.id_sede !== usuario.id_sede) {
    return "Solo podes operar sobre turnos de tu propia sede";
  }

  if (usuario.rol === "medico" && turno.id_medico !== usuario.id) {
    return "Solo podes operar sobre tus propios turnos";
  }

  return null;
}

async function crearTurno(req, res) {
  const connection = await pool.getConnection();

  try {
    const { id_especialidad, id_sede, id_medico, fecha, hora, nota } = req.body;
    let { id_paciente } = req.body;

    if (!id_especialidad || !id_sede || !id_medico || !fecha || !hora || !nota) {
      return enviarRespuesta(
        res,
        400,
        "Faltan datos obligatorios: id_especialidad, id_sede, id_medico, fecha, hora, nota"
      );
    }

    if (req.usuario.rol === "paciente") {
      id_paciente = req.usuario.id;
    } else if (req.usuario.rol === "operador") {
      if (!id_paciente) {
        return enviarRespuesta(res, 400, "Falta el dato obligatorio: id_paciente");
      }

      if (Number(id_sede) !== Number(req.usuario.id_sede)) {
        return enviarRespuesta(res, 403, "Solo podes crear turnos para tu propia sede");
      }
    } else {
      return enviarRespuesta(res, 403, "No tenes permisos para crear turnos");
    }

    await connection.beginTransaction();

    const [pacientes] = await connection.query(
      "SELECT id, nombre, apellido, id_cobertura, rol FROM usuario WHERE id = ?",
      [id_paciente]
    );
    if (pacientes.length === 0 || pacientes[0].rol !== "paciente") {
      await connection.rollback();
      return enviarRespuesta(res, 404, "El paciente indicado no existe");
    }

    const [medicos] = await connection.query(
      "SELECT id, nombre, apellido, id_sede FROM usuario WHERE id = ? AND rol = 'medico'",
      [id_medico]
    );
    if (medicos.length === 0) {
      await connection.rollback();
      return enviarRespuesta(res, 404, "El medico indicado no existe");
    }

    const [especialidades] = await connection.query(
      "SELECT id FROM especialidad WHERE id = ?",
      [id_especialidad]
    );
    if (especialidades.length === 0) {
      await connection.rollback();
      return enviarRespuesta(res, 404, "La especialidad indicada no existe");
    }

    const [sedes] = await connection.query("SELECT id, nombre FROM sede WHERE id = ?", [id_sede]);
    if (sedes.length === 0) {
      await connection.rollback();
      return enviarRespuesta(res, 404, "La sede indicada no existe");
    }

    const [agenda] = await connection.query(
      `SELECT id, hora_entrada, hora_salida
       FROM agenda
       WHERE id_medico = ? AND id_sede = ? AND id_especialidad = ? AND fecha = ?
         AND hora_entrada <= ? AND hora_salida > ?
       LIMIT 1`,
      [id_medico, id_sede, id_especialidad, fecha, hora, hora]
    );
    if (agenda.length === 0) {
      await connection.rollback();
      return enviarRespuesta(res, 409, "El horario solicitado no esta disponible en la agenda del medico");
    }

    const [ocupado] = await connection.query(
      `SELECT id
       FROM turno
       WHERE id_medico = ? AND fecha = ? AND hora = ? AND estado = 'confirmado'
       LIMIT 1`,
      [id_medico, fecha, hora]
    );
    if (ocupado.length > 0) {
      await connection.rollback();
      return enviarRespuesta(res, 409, "El horario solicitado ya tiene un turno confirmado");
    }

    const [resultado] = await connection.query(
      `INSERT INTO turno
       (id_paciente, id_medico, id_especialidad, id_sede, fecha, hora, nota, id_cobertura, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmado')`,
      [id_paciente, id_medico, id_especialidad, id_sede, fecha, hora, nota, pacientes[0].id_cobertura]
    );

    const turno = await obtenerTurnoDetalle(connection, resultado.insertId);
    await crearNotificacion(
      connection,
      turno.id_paciente,
      "turno_confirmado",
      `Tu turno fue confirmado para el ${turno.fecha} a las ${turno.hora} con ${turno.medico_nombre || "el medico asignado"}.`
    );

    await connection.commit();
    return enviarRespuesta(res, 201, "ok", turno);
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return enviarRespuesta(res, 500, "Error al crear el turno");
  } finally {
    connection.release();
  }
}

async function listarMisTurnos(req, res) {
  try {
    if (req.usuario.rol !== "paciente") {
      return enviarRespuesta(res, 403, "Solo un paciente puede consultar sus turnos");
    }

    const [turnos] = await pool.query(
      `${SELECT_TURNO_DETALLE} WHERE t.id_paciente = ? ORDER BY t.fecha ASC, t.hora ASC`,
      [req.usuario.id]
    );

    return enviarRespuesta(res, 200, "ok", turnos);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al obtener los turnos");
  }
}

async function listarTurnosMedico(req, res) {
  try {
    if (req.usuario.rol !== "medico") {
      return enviarRespuesta(res, 403, "Solo un medico puede consultar estos turnos");
    }

    const { fecha } = req.query;
    if (!fecha) {
      return enviarRespuesta(res, 400, "Falta el dato obligatorio: fecha");
    }

    const [turnos] = await pool.query(
      `${SELECT_TURNO_DETALLE}
       WHERE t.id_medico = ? AND t.fecha = ? AND t.estado <> 'cancelado'
       ORDER BY t.hora ASC`,
      [req.usuario.id, fecha]
    );

    return enviarRespuesta(res, 200, "ok", turnos);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al obtener los turnos del medico");
  }
}

async function listarTurnosSede(req, res) {
  try {
    if (req.usuario.rol !== "operador") {
      return enviarRespuesta(res, 403, "Solo un operador puede consultar estos turnos");
    }

    const { fecha } = req.query;
    if (!fecha) {
      return enviarRespuesta(res, 400, "Falta el dato obligatorio: fecha");
    }

    const [turnos] = await pool.query(
      `${SELECT_TURNO_DETALLE}
       WHERE t.id_sede = ? AND t.fecha = ? AND t.estado <> 'cancelado'
       ORDER BY t.hora ASC`,
      [req.usuario.id_sede, fecha]
    );

    return enviarRespuesta(res, 200, "ok", turnos);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al obtener los turnos de la sede");
  }
}

async function cancelarTurno(req, res) {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    await connection.beginTransaction();

    const turno = await obtenerTurnoDetalle(connection, id);
    if (!turno) {
      await connection.rollback();
      return enviarRespuesta(res, 404, "El turno indicado no existe");
    }

    const errorAcceso = validarAutorizacionTurno(turno, req.usuario);
    if (errorAcceso) {
      await connection.rollback();
      return enviarRespuesta(res, 403, errorAcceso);
    }

    if (turno.estado !== "confirmado") {
      await connection.rollback();
      return enviarRespuesta(res, 409, "Solo se pueden cancelar turnos confirmados");
    }

    await connection.query("UPDATE turno SET estado = 'cancelado' WHERE id = ?", [id]);

    await crearNotificacion(
      connection,
      turno.id_paciente,
      "turno_cancelado",
      `Tu turno del ${turno.fecha} a las ${turno.hora} fue cancelado.`
    );

    if (turno.id_medico && turno.id_medico !== turno.id_paciente) {
      await crearNotificacion(
        connection,
        turno.id_medico,
        "turno_cancelado",
        `El turno del ${turno.fecha} a las ${turno.hora} fue cancelado.`
      );
    }

    const actualizado = await obtenerTurnoDetalle(connection, id);
    await connection.commit();
    return enviarRespuesta(res, 200, "ok", actualizado);
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return enviarRespuesta(res, 500, "Error al cancelar el turno");
  } finally {
    connection.release();
  }
}

async function atenderTurno(req, res) {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    await connection.beginTransaction();

    const turno = await obtenerTurnoDetalle(connection, id);
    if (!turno) {
      await connection.rollback();
      return enviarRespuesta(res, 404, "El turno indicado no existe");
    }

    if (req.usuario.rol !== "medico" || turno.id_medico !== req.usuario.id) {
      await connection.rollback();
      return enviarRespuesta(res, 403, "Solo podes atender tus propios turnos");
    }

    if (turno.id_sede !== req.usuario.id_sede) {
      await connection.rollback();
      return enviarRespuesta(res, 403, "Solo podes atender turnos de tu propia sede");
    }

    if (turno.estado !== "confirmado") {
      await connection.rollback();
      return enviarRespuesta(res, 409, "Solo se pueden atender turnos confirmados");
    }

    await connection.query("UPDATE turno SET estado = 'atendido' WHERE id = ?", [id]);

    await crearNotificacion(
      connection,
      turno.id_paciente,
      "turno_atendido",
      `Tu turno del ${turno.fecha} a las ${turno.hora} fue marcado como atendido.`
    );

    const actualizado = await obtenerTurnoDetalle(connection, id);
    await connection.commit();
    return enviarRespuesta(res, 200, "ok", actualizado);
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return enviarRespuesta(res, 500, "Error al atender el turno");
  } finally {
    connection.release();
  }
}

module.exports = {
  crearTurno,
  listarMisTurnos,
  listarTurnosMedico,
  listarTurnosSede,
  cancelarTurno,
  atenderTurno,
  obtenerTurnoDetalle,
};
