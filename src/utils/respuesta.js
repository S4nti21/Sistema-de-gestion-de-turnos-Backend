function enviarRespuesta(res, codigo, estado, datos = null) {
  return res.status(codigo).json({ codigo, estado, datos });
}

module.exports = { enviarRespuesta };
