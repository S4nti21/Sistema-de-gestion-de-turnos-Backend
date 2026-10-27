const pool = require("../config/db");
const { enviarRespuesta } = require("../utils/respuesta");
const { esFechaValida, esHoraValida, hoyIso } = require("../utils/fechas");
const { turnoEntraEnRango } = require("../utils/agenda");

// Ademas de los ids, el listado trae los nombres para que el front no tenga que
// resolverlos uno por uno.
const SELECT_AGENDA_DETALLE = `
  SELECT
    a.id,
    a.fecha,
    a.hora_entrada,
    a.hora_salida,
    a.id_medico,
    a.id_especialidad,
    a.id_sede,
    m.nombre AS medico_nombre,
    m.apellido AS medico_apellido,
    e.descripcion AS especialidad_descripcion,
    s.nombre AS sede_nombre
  FROM agenda a
  INNER JOIN usuario m ON m.id = a.id_medico
  INNER JOIN especialidad e ON e.id = a.id_especialidad
  INNER JOIN sede s ON s.id = a.id_sede
`;

async function obtenerRango(conexion, id) {
  const [filas] = await conexion.query(`${SELECT_AGENDA_DETALLE} WHERE a.id = ?`, [id]);
  return filas[0] || null;
}

// Turnos confirmados que caen dentro de un rango: los enlazados por id_agenda y los
// del mismo medico, dia, sede y especialidad cuya hora esta entre la entrada y la salida.
async function turnosConfirmadosDelRango(conexion, rango) {
  const [turnos] = await conexion.query(
    `SELECT id, hora
     FROM turno
     WHERE estado = 'confirmado'
       AND (id_agenda = ?
         OR (id_medico = ? AND fecha = ? AND id_sede = ? AND id_especialidad = ?
             AND hora >= ? AND hora < ?))
     ORDER BY hora`,
    [
      rango.id,
      rango.id_medico,
      rango.fecha,
      rango.id_sede,
      rango.id_especialidad,
      rango.hora_entrada,
      rango.hora_salida,
    ]
  );

  return turnos;
}

function describirTurnos(cantidad) {
  return cantidad === 1 ? "1 turno confirmado" : `${cantidad} turnos confirmados`;
}

// Validaciones comunes al alta y a la modificacion de un rango.
// Devuelve { codigo, mensaje } si algo no valida, o null.
async function validarRango(datos, usuario, idExcluido = 0) {
  const { hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede } = datos;

  if (!esFechaValida(fecha)) {
    return { codigo: 400, mensaje: "La fecha debe tener el formato YYYY-MM-DD" };
  }

  if (fecha < hoyIso()) {
    return { codigo: 400, mensaje: "No se puede cargar agenda en una fecha pasada" };
  }

  if (!esHoraValida(hora_entrada) || !esHoraValida(hora_salida)) {
    return { codigo: 400, mensaje: "Las horas deben tener el formato HH:MM" };
  }

  if (hora_salida <= hora_entrada) {
    return { codigo: 400, mensaje: "La hora de salida debe ser posterior a la hora de entrada" };
  }

  if (usuario.rol === "operador" && Number(id_sede) !== Number(usuario.id_sede)) {
    return { codigo: 403, mensaje: "Un operador solo puede cargar agenda en su propia sede" };
  }

  const [sedes] = await pool.query("SELECT id FROM sede WHERE id = ?", [id_sede]);
  if (sedes.length === 0) {
    return { codigo: 400, mensaje: "La sede indicada no existe" };
  }

  const [especialidades] = await pool.query(
    "SELECT id FROM medico_especialidad WHERE id_medico = ? AND id_especialidad = ?",
    [id_medico, id_especialidad]
  );
  if (especialidades.length === 0) {
    return { codigo: 400, mensaje: "La especialidad indicada no es una de las del médico" };
  }

  // Un medico no puede estar en dos lugares a la vez: se controla contra sus
  // rangos de ese dia en cualquier sede.
  const [superpuestos] = await pool.query(
    `SELECT a.hora_entrada, a.hora_salida, s.nombre AS sede_nombre
     FROM agenda a
     INNER JOIN sede s ON s.id = a.id_sede
     WHERE a.id_medico = ? AND a.fecha = ? AND a.hora_entrada < ? AND a.hora_salida > ? AND a.id <> ?
     LIMIT 1`,
    [id_medico, fecha, hora_salida, hora_entrada, idExcluido]
  );
  if (superpuestos.length > 0) {
    const otro = superpuestos[0];
    return {
      codigo: 409,
      mensaje: `El horario se superpone con otro rango del médico ese día (${otro.hora_entrada} a ${otro.hora_salida} en ${otro.sede_nombre})`,
    };
  }

  return null;
}

// Reglas de propiedad para modificar o eliminar un rango existente.
function validarPropiedad(registro, usuario, accion) {
  if (usuario.rol === "medico" && registro.id_medico !== usuario.id) {
    return `Un médico solo puede ${accion} su propia agenda`;
  }

  if (usuario.rol === "operador" && registro.id_sede !== usuario.id_sede) {
    return `Un operador solo puede ${accion} la agenda de su propia sede`;
  }

  return null;
}

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

    const error = await validarRango(
      { hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede },
      req.usuario
    );
    if (error) {
      return enviarRespuesta(res, error.codigo, error.mensaje);
    }

    const [resultado] = await pool.query(
      `INSERT INTO agenda (hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede]
    );

    return enviarRespuesta(res, 201, "ok", await obtenerRango(pool, resultado.insertId));
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
      condiciones.push("a.id_medico = ?");
      valores.push(id_medico);
    }
    if (id_sede) {
      condiciones.push("a.id_sede = ?");
      valores.push(id_sede);
    }
    if (fecha) {
      condiciones.push("a.fecha = ?");
      valores.push(fecha);
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

    const [agenda] = await pool.query(
      `${SELECT_AGENDA_DETALLE} ${where} ORDER BY a.fecha, a.hora_entrada, m.apellido, m.nombre`,
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

    const registro = await obtenerRango(pool, id);
    if (!registro) {
      return enviarRespuesta(res, 404, "El registro de agenda indicado no existe");
    }

    const errorPropiedad = validarPropiedad(registro, req.usuario, "modificar");
    if (errorPropiedad) {
      return enviarRespuesta(res, 403, errorPropiedad);
    }

    if (registro.fecha < hoyIso()) {
      return enviarRespuesta(res, 409, "No se puede modificar un rango horario de una fecha pasada");
    }

    if (!hora_entrada || !hora_salida || !fecha || !id_especialidad || !id_sede) {
      return enviarRespuesta(
        res,
        400,
        "Faltan datos obligatorios: hora_entrada, hora_salida, fecha, id_especialidad, id_sede"
      );
    }

    const error = await validarRango(
      { hora_entrada, hora_salida, fecha, id_medico: registro.id_medico, id_especialidad, id_sede },
      req.usuario,
      registro.id
    );
    if (error) {
      return enviarRespuesta(res, error.codigo, error.mensaje);
    }

    // Ningun turno confirmado puede quedar fuera del rango modificado.
    const confirmados = await turnosConfirmadosDelRango(pool, registro);
    if (confirmados.length > 0) {
      const cambiaUbicacion =
        fecha !== registro.fecha ||
        Number(id_sede) !== registro.id_sede ||
        Number(id_especialidad) !== registro.id_especialidad;

      if (cambiaUbicacion) {
        return enviarRespuesta(
          res,
          409,
          `No se puede cambiar la fecha, la sede ni la especialidad del rango: tiene ${describirTurnos(confirmados.length)}`
        );
      }

      const fuera = confirmados.filter(
        (turno) => !turnoEntraEnRango(turno.hora, hora_entrada, hora_salida)
      );
      if (fuera.length > 0) {
        return enviarRespuesta(
          res,
          409,
          `No se puede modificar el rango: los turnos confirmados de las ${fuera
            .map((turno) => turno.hora)
            .join(", ")} quedarían fuera del nuevo horario`
        );
      }
    }

    await pool.query(
      `UPDATE agenda SET hora_entrada = ?, hora_salida = ?, fecha = ?, id_especialidad = ?, id_sede = ?
       WHERE id = ?`,
      [hora_entrada, hora_salida, fecha, id_especialidad, id_sede, id]
    );

    return enviarRespuesta(res, 200, "ok", await obtenerRango(pool, id));
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al actualizar la agenda");
  }
}

async function eliminarAgenda(req, res) {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const registro = await obtenerRango(connection, id);
    if (!registro) {
      return enviarRespuesta(res, 404, "El registro de agenda indicado no existe");
    }

    const errorPropiedad = validarPropiedad(registro, req.usuario, "eliminar");
    if (errorPropiedad) {
      return enviarRespuesta(res, 403, errorPropiedad);
    }

    if (registro.fecha < hoyIso()) {
      return enviarRespuesta(res, 409, "No se puede eliminar un rango horario de una fecha pasada");
    }

    const confirmados = await turnosConfirmadosDelRango(connection, registro);
    if (confirmados.length > 0) {
      return enviarRespuesta(
        res,
        409,
        `No se puede eliminar el rango horario: tiene ${describirTurnos(confirmados.length)}`
      );
    }

    // Los turnos cancelados o atendidos conservan su fecha, hora y sede: solo se
    // desvinculan del rango antes de borrarlo.
    await connection.beginTransaction();
    await connection.query("UPDATE turno SET id_agenda = NULL WHERE id_agenda = ?", [id]);
    await connection.query("DELETE FROM agenda WHERE id = ?", [id]);
    await connection.commit();

    return enviarRespuesta(res, 200, "ok", { id: Number(id) });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return enviarRespuesta(res, 500, "Error al eliminar la agenda");
  } finally {
    connection.release();
  }
}

module.exports = { crearAgenda, listarAgenda, actualizarAgenda, eliminarAgenda };
