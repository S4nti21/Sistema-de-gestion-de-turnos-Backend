const pool = require("../config/db");
const { enviarRespuesta } = require("../utils/respuesta");
const { validarRangoFechas } = require("../utils/fechas");

// mysql2 devuelve los SUM() como string (vienen como DECIMAL) y como NULL cuando
// el grupo no tiene filas, asi que todo conteo pasa por aca antes de responder.
function aNumero(valor) {
  return Number(valor ?? 0);
}

// Fragmento de filtro por fecha reutilizado por los cuatro reportes.
// En los reportes con LEFT JOIN va DENTRO del ON: si fuera al WHERE, el LEFT JOIN
// se degradaria a INNER y desaparecerian las sedes/especialidades sin turnos.
function filtroFecha(alias, rango) {
  const condiciones = [];
  const parametros = [];

  if (rango.desde) {
    condiciones.push(`${alias}.fecha >= ?`);
    parametros.push(rango.desde);
  }

  if (rango.hasta) {
    condiciones.push(`${alias}.fecha <= ?`);
    parametros.push(rango.hasta);
  }

  return { sql: condiciones.length > 0 ? ` AND ${condiciones.join(" AND ")}` : "", parametros };
}

function leerRango(req, res) {
  const rango = validarRangoFechas(req.query.desde, req.query.hasta);
  if (rango.error) {
    enviarRespuesta(res, 400, rango.error);
    return null;
  }

  return rango;
}

async function turnosPorEspecialidad(req, res) {
  try {
    const rango = leerRango(req, res);
    if (!rango) return undefined;

    const filtro = filtroFecha("t", rango);

    const [filas] = await pool.query(
      `SELECT
         e.id AS id_especialidad,
         e.descripcion AS especialidad,
         COUNT(t.id) AS cantidad_turnos,
         SUM(t.estado = 'confirmado') AS confirmados,
         SUM(t.estado = 'atendido') AS atendidos,
         SUM(t.estado = 'cancelado') AS cancelados
       FROM especialidad e
       LEFT JOIN turno t ON t.id_especialidad = e.id${filtro.sql}
       GROUP BY e.id, e.descripcion
       ORDER BY cantidad_turnos DESC, e.descripcion ASC`,
      filtro.parametros
    );

    const items = filas.map((fila) => ({
      id_especialidad: fila.id_especialidad,
      especialidad: fila.especialidad,
      cantidad_turnos: aNumero(fila.cantidad_turnos),
      confirmados: aNumero(fila.confirmados),
      atendidos: aNumero(fila.atendidos),
      cancelados: aNumero(fila.cancelados),
    }));

    return enviarRespuesta(res, 200, "ok", {
      filtros: { desde: rango.desde, hasta: rango.hasta },
      total_turnos: items.reduce((total, item) => total + item.cantidad_turnos, 0),
      items,
    });
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al obtener el reporte de turnos por especialidad");
  }
}

async function turnosPorSede(req, res) {
  try {
    const rango = leerRango(req, res);
    if (!rango) return undefined;

    const filtro = filtroFecha("t", rango);

    const [filas] = await pool.query(
      `SELECT
         s.id AS id_sede,
         s.nombre AS sede,
         COUNT(t.id) AS cantidad_turnos,
         SUM(t.estado = 'confirmado') AS confirmados,
         SUM(t.estado = 'atendido') AS atendidos,
         SUM(t.estado = 'cancelado') AS cancelados
       FROM sede s
       LEFT JOIN turno t ON t.id_sede = s.id${filtro.sql}
       GROUP BY s.id, s.nombre
       ORDER BY cantidad_turnos DESC, s.nombre ASC`,
      filtro.parametros
    );

    const items = filas.map((fila) => ({
      id_sede: fila.id_sede,
      sede: fila.sede,
      cantidad_turnos: aNumero(fila.cantidad_turnos),
      confirmados: aNumero(fila.confirmados),
      atendidos: aNumero(fila.atendidos),
      cancelados: aNumero(fila.cancelados),
    }));

    return enviarRespuesta(res, 200, "ok", {
      filtros: { desde: rango.desde, hasta: rango.hasta },
      total_turnos: items.reduce((total, item) => total + item.cantidad_turnos, 0),
      items,
    });
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al obtener el reporte de turnos por sede");
  }
}

async function rankingMedicos(req, res) {
  try {
    const rango = leerRango(req, res);
    if (!rango) return undefined;

    const filtro = filtroFecha("t", rango);

    // El ranking cuenta turnos ATENDIDOS, pero se devuelven todos los medicos
    // (la consigna pide el ranking completo, no solo el primero).
    const [filas] = await pool.query(
      `SELECT
         u.id AS id_medico,
         CONCAT(u.nombre, ' ', u.apellido) AS medico,
         s.nombre AS sede,
         COUNT(t.id) AS turnos_atendidos
       FROM usuario u
       LEFT JOIN sede s ON s.id = u.id_sede
       LEFT JOIN turno t ON t.id_medico = u.id AND t.estado = 'atendido'${filtro.sql}
       WHERE u.rol = 'medico'
       GROUP BY u.id, u.nombre, u.apellido, s.nombre
       ORDER BY turnos_atendidos DESC, medico ASC`,
      filtro.parametros
    );

    let items = filas.map((fila, indice) => ({
      posicion: indice + 1,
      id_medico: fila.id_medico,
      medico: fila.medico,
      sede: fila.sede,
      turnos_atendidos: aNumero(fila.turnos_atendidos),
    }));

    const limite = Number(req.query.limite);
    if (Number.isInteger(limite) && limite > 0) {
      items = items.slice(0, limite);
    }

    return enviarRespuesta(res, 200, "ok", {
      filtros: { desde: rango.desde, hasta: rango.hasta },
      total_turnos_atendidos: items.reduce((total, item) => total + item.turnos_atendidos, 0),
      items,
    });
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al obtener el ranking de medicos");
  }
}

async function tasaCancelacion(req, res) {
  try {
    const rango = leerRango(req, res);
    if (!rango) return undefined;

    // Sin LEFT JOIN, aca el filtro de fecha si va en el WHERE.
    const condiciones = [];
    const parametros = [];

    if (rango.desde) {
      condiciones.push("fecha >= ?");
      parametros.push(rango.desde);
    }

    if (rango.hasta) {
      condiciones.push("fecha <= ?");
      parametros.push(rango.hasta);
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

    const [filas] = await pool.query(
      `SELECT
         COUNT(*) AS total_turnos,
         SUM(estado = 'cancelado') AS turnos_cancelados,
         SUM(estado = 'atendido') AS turnos_atendidos,
         SUM(estado = 'confirmado') AS turnos_confirmados
       FROM turno ${where}`,
      parametros
    );

    const totalTurnos = aNumero(filas[0].total_turnos);
    const turnosCancelados = aNumero(filas[0].turnos_cancelados);

    const tasa = totalTurnos === 0 ? 0 : turnosCancelados / totalTurnos;

    return enviarRespuesta(res, 200, "ok", {
      filtros: { desde: rango.desde, hasta: rango.hasta },
      total_turnos: totalTurnos,
      turnos_cancelados: turnosCancelados,
      turnos_atendidos: aNumero(filas[0].turnos_atendidos),
      turnos_confirmados: aNumero(filas[0].turnos_confirmados),
      tasa_cancelacion: Number(tasa.toFixed(4)),
      porcentaje_cancelacion: Number((tasa * 100).toFixed(2)),
    });
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al obtener la tasa de cancelacion");
  }
}

module.exports = { turnosPorEspecialidad, turnosPorSede, rankingMedicos, tasaCancelacion };
