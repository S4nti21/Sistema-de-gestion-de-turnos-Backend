const pool = require("../config/db");
const { enviarRespuesta } = require("../utils/respuesta");
const { validarRangoFechas } = require("../utils/fechas");

const ACCIONES_VALIDAS = ["ALTA", "BAJA", "MODIFICACION"];
const LIMITE_POR_DEFECTO = 100;
const LIMITE_MAXIMO = 500;

const SELECT_LOG_DETALLE = `
  SELECT
    l.id,
    l.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS usuario_nombre,
    u.rol AS usuario_rol,
    l.accion,
    l.entidad,
    l.id_entidad,
    l.detalle,
    l.fecha
  FROM log_auditoria l
  LEFT JOIN usuario u ON u.id = l.id_usuario
`;

async function listarLogs(req, res) {
  try {
    const { id_usuario, entidad, accion, desde, hasta } = req.query;

    const rango = validarRangoFechas(desde, hasta);
    if (rango.error) {
      return enviarRespuesta(res, 400, rango.error);
    }

    const accionNormalizada = accion ? String(accion).toUpperCase() : null;
    if (accionNormalizada && !ACCIONES_VALIDAS.includes(accionNormalizada)) {
      return enviarRespuesta(
        res,
        400,
        `El parametro accion debe ser uno de: ${ACCIONES_VALIDAS.join(", ")}`
      );
    }

    const condiciones = [];
    const parametros = [];

    if (id_usuario) {
      condiciones.push("l.id_usuario = ?");
      parametros.push(id_usuario);
    }

    if (entidad) {
      condiciones.push("l.entidad = ?");
      parametros.push(entidad);
    }

    if (accionNormalizada) {
      condiciones.push("l.accion = ?");
      parametros.push(accionNormalizada);
    }

    if (rango.desde) {
      condiciones.push("l.fecha >= ?");
      parametros.push(rango.desde);
    }

    // l.fecha es DATETIME: sin el DATE_ADD se perderian los logs de la tarde
    // del ultimo dia del rango.
    if (rango.hasta) {
      condiciones.push("l.fecha < DATE_ADD(?, INTERVAL 1 DAY)");
      parametros.push(rango.hasta);
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

    const limite = Math.min(Math.max(Number(req.query.limite) || LIMITE_POR_DEFECTO, 1), LIMITE_MAXIMO);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const [totales] = await pool.query(
      `SELECT COUNT(*) AS total FROM log_auditoria l ${where}`,
      parametros
    );

    const [logs] = await pool.query(
      `${SELECT_LOG_DETALLE} ${where} ORDER BY l.fecha DESC, l.id DESC LIMIT ? OFFSET ?`,
      [...parametros, limite, offset]
    );

    return enviarRespuesta(res, 200, "ok", {
      filtros: {
        id_usuario: id_usuario || null,
        entidad: entidad || null,
        accion: accionNormalizada,
        desde: rango.desde,
        hasta: rango.hasta,
      },
      total: Number(totales[0].total),
      limite,
      offset,
      items: logs,
    });
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al obtener los registros de auditoria");
  }
}

module.exports = { listarLogs };
