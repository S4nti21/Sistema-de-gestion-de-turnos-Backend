const pool = require("../config/db");

const ACCION_POR_METODO = {
  POST: "ALTA",
  PUT: "MODIFICACION",
  PATCH: "MODIFICACION",
  DELETE: "BAJA",
};

const CAMPOS_SENSIBLES = ["password"];
const LARGO_MAXIMO_DETALLE = 255;

// Copia el body sin los campos que nunca deben quedar escritos en el log.
function limpiarCuerpo(cuerpo) {
  if (!cuerpo || typeof cuerpo !== "object") {
    return null;
  }

  const copia = { ...cuerpo };
  for (const campo of CAMPOS_SENSIBLES) {
    delete copia[campo];
  }

  return copia;
}

function armarDetalle(accion, entidad, idEntidad, req) {
  const referencia = idEntidad ? `${entidad} #${idEntidad}` : entidad;
  const partes = [`${accion} sobre ${referencia}`];

  const datosEnviados = limpiarCuerpo(req.body);
  if (datosEnviados && Object.keys(datosEnviados).length > 0) {
    partes.push(JSON.stringify(datosEnviados));
  }

  return partes.join(" | ").slice(0, LARGO_MAXIMO_DETALLE);
}

async function registrarLog(req, entidad, accion, cuerpo) {
  const datos = cuerpo && cuerpo.datos;

  // Quien hizo la accion. En /auth/registro no hay token, asi que el responsable
  // es el propio usuario recien creado.
  const idUsuario = (req.usuario && req.usuario.id) || (datos && datos.id) || null;
  if (!idUsuario) {
    return;
  }

  // Todos los controladores devuelven la fila afectada (y los delete, { id }),
  // asi que datos.id sirve para cualquier accion.
  const idEntidad = (datos && datos.id) || req.params.id || null;

  await pool.query(
    `INSERT INTO log_auditoria (id_usuario, accion, entidad, id_entidad, detalle, fecha)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [
      idUsuario,
      accion,
      entidad,
      idEntidad ? Number(idEntidad) : null,
      armarDetalle(accion, entidad, idEntidad, req),
    ]
  );
}

// Registra en log_auditoria toda alta, baja o modificacion exitosa de una entidad,
// sin que los controladores tengan que saber que la auditoria existe.
//
// Como todos responden via enviarRespuesta -> res.status(codigo).json(...),
// envolver res.json alcanza para capturar el resultado real de cualquier endpoint.
function auditar(entidad) {
  return (req, res, next) => {
    const accion = ACCION_POR_METODO[req.method.toUpperCase()];
    if (!accion) {
      return next();
    }

    const jsonOriginal = res.json.bind(res);

    res.json = (cuerpo) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Sin await: un fallo al escribir el log no debe romper la respuesta.
        registrarLog(req, entidad, accion, cuerpo).catch((error) =>
          console.error("No se pudo registrar la auditoria:", error)
        );
      }

      return jsonOriginal(cuerpo);
    };

    next();
  };
}

module.exports = { auditar };
