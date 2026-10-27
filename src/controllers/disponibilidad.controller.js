const pool = require("../config/db");
const { enviarRespuesta } = require("../utils/respuesta");
const { esFechaValida, hoyIso } = require("../utils/fechas");
const { horariosLibres } = require("../utils/agenda");

// Estas consultas solo devuelven fechas y horas: nunca datos de los pacientes
// que ya tienen turno.

function faltanFiltros({ id_medico, id_especialidad, id_sede }) {
  return !id_medico || !id_especialidad || !id_sede;
}

// Horas ocupadas por turnos confirmados del medico, agrupadas por fecha. Cuentan
// los de cualquier sede y especialidad: el medico no puede atender dos a la vez.
async function horasOcupadasPorFecha(idMedico, desde, hasta) {
  const [turnos] = await pool.query(
    `SELECT fecha, hora FROM turno
     WHERE id_medico = ? AND estado = 'confirmado' AND fecha BETWEEN ? AND ?`,
    [idMedico, desde, hasta]
  );

  const ocupadas = new Map();
  for (const turno of turnos) {
    ocupadas.set(turno.fecha, [...(ocupadas.get(turno.fecha) || []), turno.hora]);
  }

  return ocupadas;
}

async function fechasDisponibles(req, res) {
  try {
    const { id_medico, id_especialidad, id_sede } = req.query;

    if (faltanFiltros(req.query)) {
      return enviarRespuesta(
        res,
        400,
        "Faltan datos obligatorios: id_medico, id_especialidad, id_sede"
      );
    }

    const [rangos] = await pool.query(
      `SELECT fecha, hora_entrada, hora_salida
       FROM agenda
       WHERE id_medico = ? AND id_especialidad = ? AND id_sede = ? AND fecha >= ?
       ORDER BY fecha, hora_entrada`,
      [id_medico, id_especialidad, id_sede, hoyIso()]
    );

    if (rangos.length === 0) {
      return enviarRespuesta(res, 200, "ok", []);
    }

    const fechas = [...new Set(rangos.map((rango) => rango.fecha))];
    const ocupadas = await horasOcupadasPorFecha(id_medico, fechas[0], fechas[fechas.length - 1]);

    // Solo se ofrecen los dias que todavia tienen al menos un horario libre.
    const disponibles = fechas.filter(
      (fecha) =>
        horariosLibres(
          rangos.filter((rango) => rango.fecha === fecha),
          ocupadas.get(fecha) || [],
          fecha
        ).length > 0
    );

    return enviarRespuesta(res, 200, "ok", disponibles);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al obtener las fechas disponibles");
  }
}

async function horariosDisponibles(req, res) {
  try {
    const { id_medico, id_especialidad, id_sede, fecha } = req.query;

    if (faltanFiltros(req.query) || !fecha) {
      return enviarRespuesta(
        res,
        400,
        "Faltan datos obligatorios: id_medico, id_especialidad, id_sede, fecha"
      );
    }

    if (!esFechaValida(fecha)) {
      return enviarRespuesta(res, 400, "La fecha debe tener el formato YYYY-MM-DD");
    }

    const [rangos] = await pool.query(
      `SELECT hora_entrada, hora_salida
       FROM agenda
       WHERE id_medico = ? AND id_especialidad = ? AND id_sede = ? AND fecha = ?`,
      [id_medico, id_especialidad, id_sede, fecha]
    );

    const ocupadas = await horasOcupadasPorFecha(id_medico, fecha, fecha);

    return enviarRespuesta(res, 200, "ok", horariosLibres(rangos, ocupadas.get(fecha) || [], fecha));
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al obtener los horarios disponibles");
  }
}

module.exports = { fechasDisponibles, horariosDisponibles };
