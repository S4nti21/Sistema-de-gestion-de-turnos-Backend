const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { enviarRespuesta } = require("../utils/respuesta");

const SALT_ROUNDS = 10;
const LIMITE_BUSQUEDA = 20;
const LARGO_MINIMO_BUSQUEDA = 2;
const LARGO_MINIMO_PASSWORD = 6;
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SELECT_PACIENTE = `
  SELECT
    u.id,
    u.nombre,
    u.apellido,
    u.dni,
    u.email,
    u.telefono,
    u.fecha_nacimiento,
    u.id_cobertura,
    c.nombre AS cobertura_nombre
  FROM usuario u
  LEFT JOIN cobertura c ON c.id = u.id_cobertura
`;

// El texto buscado no debe funcionar como comodin dentro del LIKE.
function escaparLike(texto) {
  return texto.replace(/[\\%_]/g, "\\$&");
}

// Busqueda por DNI (empieza con) o por apellido (contiene), para el operador,
// el medico y el administrador.
async function buscarPacientes(req, res) {
  try {
    const busqueda = String(req.query.busqueda || "").trim();
    if (busqueda.length < LARGO_MINIMO_BUSQUEDA) {
      return enviarRespuesta(
        res,
        400,
        `Ingresá al menos ${LARGO_MINIMO_BUSQUEDA} caracteres del DNI o del apellido`
      );
    }

    const patron = escaparLike(busqueda);
    const [pacientes] = await pool.query(
      `${SELECT_PACIENTE}
       WHERE u.rol = 'paciente'
         AND (u.dni LIKE CONCAT(?, '%') OR u.apellido LIKE CONCAT('%', ?, '%'))
       ORDER BY u.apellido, u.nombre
       LIMIT ?`,
      [patron, patron, LIMITE_BUSQUEDA]
    );

    return enviarRespuesta(res, 200, "ok", pacientes);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al buscar pacientes");
  }
}

// El paciente solo puede cambiar su email, su contraseña, su telefono y su cobertura.
async function actualizarMisDatos(req, res) {
  try {
    const { email, telefono, id_cobertura, password } = req.body;

    if (!email || !id_cobertura) {
      return enviarRespuesta(res, 400, "Faltan datos obligatorios: email, id_cobertura");
    }

    if (!FORMATO_EMAIL.test(email) || email.length > 100) {
      return enviarRespuesta(res, 400, "El email no tiene un formato válido");
    }

    if (telefono && String(telefono).length > 20) {
      return enviarRespuesta(res, 400, "El teléfono admite hasta 20 caracteres");
    }

    if (password && String(password).length < LARGO_MINIMO_PASSWORD) {
      return enviarRespuesta(
        res,
        400,
        `La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres`
      );
    }

    const [coberturas] = await pool.query("SELECT id FROM cobertura WHERE id = ?", [id_cobertura]);
    if (coberturas.length === 0) {
      return enviarRespuesta(res, 400, "La cobertura seleccionada no existe");
    }

    const [existentes] = await pool.query(
      "SELECT id FROM usuario WHERE email = ? AND id <> ?",
      [email, req.usuario.id]
    );
    if (existentes.length > 0) {
      return enviarRespuesta(res, 409, "Ya existe otro usuario registrado con ese email");
    }

    // La contraseña es opcional: si no viene, se conserva la que ya tenia.
    const passwordHasheada = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;

    await pool.query(
      `UPDATE usuario
       SET email = ?, telefono = ?, id_cobertura = ?, password = COALESCE(?, password)
       WHERE id = ? AND rol = 'paciente'`,
      [email, telefono || "", id_cobertura, passwordHasheada, req.usuario.id]
    );

    const [usuarios] = await pool.query(
      `SELECT id, nombre, apellido, dni, email, telefono, fecha_nacimiento, rol, id_sede, id_cobertura
       FROM usuario WHERE id = ?`,
      [req.usuario.id]
    );

    return enviarRespuesta(res, 200, "ok", usuarios[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return enviarRespuesta(res, 409, "Ya existe otro usuario registrado con ese email");
    }

    console.error(error);
    return enviarRespuesta(res, 500, "Error al actualizar tus datos");
  }
}

module.exports = { buscarPacientes, actualizarMisDatos };
