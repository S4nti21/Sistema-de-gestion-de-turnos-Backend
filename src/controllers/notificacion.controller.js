const pool = require("../config/db");
const { enviarRespuesta } = require("../utils/respuesta");

async function listarNotificaciones(req, res) {
  try {
    const [notificaciones] = await pool.query(
      `SELECT id, id_usuario, tipo, mensaje, fecha, leida
       FROM notificacion
       WHERE id_usuario = ?
       ORDER BY fecha DESC, id DESC`,
      [req.usuario.id]
    );

    return enviarRespuesta(res, 200, "ok", notificaciones);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al obtener las notificaciones");
  }
}

async function marcarNotificacionLeida(req, res) {
  try {
    const { id } = req.params;

    const [resultado] = await pool.query(
      "UPDATE notificacion SET leida = 1 WHERE id = ? AND id_usuario = ?",
      [id, req.usuario.id]
    );

    if (resultado.affectedRows === 0) {
      return enviarRespuesta(res, 404, "La notificacion indicada no existe");
    }

    const [notificaciones] = await pool.query(
      `SELECT id, id_usuario, tipo, mensaje, fecha, leida
       FROM notificacion
       WHERE id = ?`,
      [id]
    );

    return enviarRespuesta(res, 200, "ok", notificaciones[0]);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al actualizar la notificacion");
  }
}

module.exports = {
  listarNotificaciones,
  marcarNotificacionLeida,
};
