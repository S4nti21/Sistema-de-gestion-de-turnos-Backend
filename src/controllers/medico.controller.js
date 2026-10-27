const pool = require("../config/db");
const { enviarRespuesta } = require("../utils/respuesta");

// Cualquier usuario con sesion puede listar medicos, asi que solo se exponen
// nombre, apellido y especialidades: nada de DNI, email ni telefono.
async function adjuntarEspecialidades(medicos) {
  if (medicos.length === 0) {
    return medicos;
  }

  const [filas] = await pool.query(
    `SELECT me.id_medico, e.id, e.descripcion
     FROM medico_especialidad me
     INNER JOIN especialidad e ON e.id = me.id_especialidad
     WHERE me.id_medico IN (?)
     ORDER BY e.descripcion`,
    [medicos.map((medico) => medico.id)]
  );

  return medicos.map((medico) => ({
    ...medico,
    especialidades: filas
      .filter((fila) => fila.id_medico === medico.id)
      .map(({ id, descripcion }) => ({ id, descripcion })),
  }));
}

function esVerdadero(valor) {
  return valor === "1" || valor === "true";
}

async function listarMedicos(req, res) {
  try {
    const { id_especialidad, id_sede, con_agenda } = req.query;

    const condiciones = ["u.rol = 'medico'"];
    const parametros = [];

    if (id_especialidad) {
      condiciones.push(
        "EXISTS (SELECT 1 FROM medico_especialidad me WHERE me.id_medico = u.id AND me.id_especialidad = ?)"
      );
      parametros.push(id_especialidad);
    }

    if (esVerdadero(con_agenda)) {
      // Solo los medicos con agenda desde hoy en adelante (para la sede y la
      // especialidad pedidas, si vienen): los unicos a los que se les puede pedir turno.
      const filtrosAgenda = ["a.id_medico = u.id", "a.fecha >= CURDATE()"];
      if (id_sede) {
        filtrosAgenda.push("a.id_sede = ?");
        parametros.push(id_sede);
      }
      if (id_especialidad) {
        filtrosAgenda.push("a.id_especialidad = ?");
        parametros.push(id_especialidad);
      }
      condiciones.push(`EXISTS (SELECT 1 FROM agenda a WHERE ${filtrosAgenda.join(" AND ")})`);
    } else if (id_sede) {
      // Un medico es "de la sede" si es su sede principal o si tiene agenda cargada en ella.
      condiciones.push(
        "(u.id_sede = ? OR EXISTS (SELECT 1 FROM agenda a WHERE a.id_medico = u.id AND a.id_sede = ?))"
      );
      parametros.push(id_sede, id_sede);
    }

    const [medicos] = await pool.query(
      `SELECT u.id, u.nombre, u.apellido
       FROM usuario u
       WHERE ${condiciones.join(" AND ")}
       ORDER BY u.apellido, u.nombre`,
      parametros
    );

    return enviarRespuesta(res, 200, "ok", await adjuntarEspecialidades(medicos));
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al obtener los médicos");
  }
}

async function obtenerMedico(req, res) {
  try {
    const [medicos] = await pool.query(
      "SELECT id, nombre, apellido FROM usuario WHERE id = ? AND rol = 'medico'",
      [req.params.id]
    );
    if (medicos.length === 0) {
      return enviarRespuesta(res, 404, "El médico indicado no existe");
    }

    const [medico] = await adjuntarEspecialidades(medicos);
    return enviarRespuesta(res, 200, "ok", medico);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al obtener el médico");
  }
}

module.exports = { listarMedicos, obtenerMedico };
