const CAMPOS_HISTORIAL = ["diagnostico", "tratamiento", "observaciones"];
const LARGO_MAXIMO_CAMPO = 255;

// Indica si el body trae algun dato de historial clinico (al atender un turno es opcional).
function traeDatosHistorial(cuerpo) {
  return CAMPOS_HISTORIAL.some((campo) => cuerpo && cuerpo[campo] !== undefined);
}

// Valida un registro de historial clinico. Devuelve el mensaje de error o null.
function validarDatosHistorial(cuerpo) {
  if (!cuerpo || CAMPOS_HISTORIAL.some((campo) => !cuerpo[campo])) {
    return "Faltan datos obligatorios: diagnostico, tratamiento, observaciones";
  }

  if (CAMPOS_HISTORIAL.some((campo) => String(cuerpo[campo]).length > LARGO_MAXIMO_CAMPO)) {
    return `El diagnostico, el tratamiento y las observaciones admiten hasta ${LARGO_MAXIMO_CAMPO} caracteres`;
  }

  return null;
}

// Inserta el historial de un turno usando la conexion (y la transaccion) de quien llama.
async function insertarHistorial(connection, turno, { diagnostico, tratamiento, observaciones }) {
  const [resultado] = await connection.query(
    `INSERT INTO historial_clinico
     (id_turno, id_medico, id_paciente, diagnostico, tratamiento, observaciones, fecha)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [turno.id, turno.id_medico, turno.id_paciente, diagnostico, tratamiento, observaciones]
  );

  return resultado.insertId;
}

module.exports = { traeDatosHistorial, validarDatosHistorial, insertarHistorial };
