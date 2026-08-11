const jwt = require("jsonwebtoken");
const { enviarRespuesta } = require("../utils/respuesta");

function verificarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    return enviarRespuesta(res, 401, "No se proporcionó un token de autenticación");
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload;
    next();
  } catch (error) {
    return enviarRespuesta(res, 401, "Token inválido o vencido");
  }
}

function verificarRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return enviarRespuesta(res, 403, "No tenés permisos para acceder a este recurso");
    }
    next();
  };
}

module.exports = { verificarToken, verificarRol };
