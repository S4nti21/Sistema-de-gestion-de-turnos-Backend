const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { enviarRespuesta } = require("../utils/respuesta");

const SALT_ROUNDS = 10;
const ROLES_VALIDOS = ["paciente", "medico", "operador", "administrador"];

// Nunca se devuelve la columna password: siempre se listan las columnas explicitas.
const SELECT_USUARIO = `
  SELECT id, nombre, apellido, dni, email, telefono, fecha_nacimiento, rol, id_sede, id_cobertura
  FROM usuario
`;

async function obtenerUsuarioPorId(id) {
  const [usuarios] = await pool.query(`${SELECT_USUARIO} WHERE id = ?`, [id]);
  return usuarios[0] || null;
}

// Cada rol define que vinculo es obligatorio y cual debe quedar en NULL:
// los medicos y operadores pertenecen a una sede, los pacientes a una cobertura.
function resolverVinculos(rol, id_sede, id_cobertura) {
  if (rol === "medico" || rol === "operador") {
    if (!id_sede) {
      return { error: `Falta el dato obligatorio para el rol ${rol}: id_sede` };
    }
    return { id_sede, id_cobertura: null };
  }

  if (rol === "paciente") {
    if (!id_cobertura) {
      return { error: "Falta el dato obligatorio para el rol paciente: id_cobertura" };
    }
    return { id_sede: null, id_cobertura };
  }

  return { id_sede: null, id_cobertura: null };
}

async function validarVinculos(vinculos) {
  if (vinculos.id_sede) {
    const [sedes] = await pool.query("SELECT id FROM sede WHERE id = ?", [vinculos.id_sede]);
    if (sedes.length === 0) {
      return "La sede indicada no existe";
    }
  }

  if (vinculos.id_cobertura) {
    const [coberturas] = await pool.query("SELECT id FROM cobertura WHERE id = ?", [
      vinculos.id_cobertura,
    ]);
    if (coberturas.length === 0) {
      return "La cobertura indicada no existe";
    }
  }

  return null;
}

async function listarUsuarios(req, res) {
  try {
    const { rol, id_sede, dni } = req.query;

    if (rol && !ROLES_VALIDOS.includes(rol)) {
      return enviarRespuesta(res, 400, `El rol debe ser uno de: ${ROLES_VALIDOS.join(", ")}`);
    }

    const condiciones = [];
    const parametros = [];

    if (rol) {
      condiciones.push("rol = ?");
      parametros.push(rol);
    }

    if (id_sede) {
      condiciones.push("id_sede = ?");
      parametros.push(id_sede);
    }

    if (dni) {
      condiciones.push("dni = ?");
      parametros.push(dni);
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

    const [usuarios] = await pool.query(
      `${SELECT_USUARIO} ${where} ORDER BY apellido, nombre`,
      parametros
    );

    return enviarRespuesta(res, 200, "ok", usuarios);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al obtener los usuarios");
  }
}

async function obtenerUsuario(req, res) {
  try {
    const usuario = await obtenerUsuarioPorId(req.params.id);
    if (!usuario) {
      return enviarRespuesta(res, 404, "El usuario indicado no existe");
    }

    return enviarRespuesta(res, 200, "ok", usuario);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al obtener el usuario");
  }
}

async function crearUsuario(req, res) {
  try {
    const { nombre, apellido, dni, email, password, fecha_nacimiento, telefono, rol } = req.body;
    const { id_sede, id_cobertura } = req.body;

    if (!nombre || !apellido || !dni || !email || !password || !fecha_nacimiento || !rol) {
      return enviarRespuesta(
        res,
        400,
        "Faltan datos obligatorios: nombre, apellido, dni, email, password, fecha_nacimiento, rol"
      );
    }

    if (!ROLES_VALIDOS.includes(rol)) {
      return enviarRespuesta(res, 400, `El rol debe ser uno de: ${ROLES_VALIDOS.join(", ")}`);
    }

    const vinculos = resolverVinculos(rol, id_sede, id_cobertura);
    if (vinculos.error) {
      return enviarRespuesta(res, 400, vinculos.error);
    }

    const errorVinculos = await validarVinculos(vinculos);
    if (errorVinculos) {
      return enviarRespuesta(res, 400, errorVinculos);
    }

    const [existentes] = await pool.query("SELECT id FROM usuario WHERE dni = ? OR email = ?", [
      dni,
      email,
    ]);
    if (existentes.length > 0) {
      return enviarRespuesta(res, 409, "Ya existe un usuario registrado con ese DNI o email");
    }

    const passwordHasheada = await bcrypt.hash(password, SALT_ROUNDS);

    const [resultado] = await pool.query(
      `INSERT INTO usuario (apellido, nombre, fecha_nacimiento, password, rol, email, telefono, dni, id_sede, id_cobertura)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        apellido,
        nombre,
        fecha_nacimiento,
        passwordHasheada,
        rol,
        email,
        telefono || "",
        dni,
        vinculos.id_sede,
        vinculos.id_cobertura,
      ]
    );

    const usuario = await obtenerUsuarioPorId(resultado.insertId);
    return enviarRespuesta(res, 201, "ok", usuario);
  } catch (error) {
    // El indice unico de dni/email cierra la ventana de carrera que deja el SELECT previo.
    if (error.code === "ER_DUP_ENTRY") {
      return enviarRespuesta(res, 409, "Ya existe un usuario registrado con ese DNI o email");
    }

    console.error(error);
    return enviarRespuesta(res, 500, "Error al crear el usuario");
  }
}

async function actualizarUsuario(req, res) {
  try {
    const { id } = req.params;

    const actual = await obtenerUsuarioPorId(id);
    if (!actual) {
      return enviarRespuesta(res, 404, "El usuario indicado no existe");
    }

    const { nombre, apellido, dni, email, fecha_nacimiento, telefono, password, rol } = req.body;
    const { id_sede, id_cobertura } = req.body;

    if (!nombre || !apellido || !dni || !email || !fecha_nacimiento || !rol) {
      return enviarRespuesta(
        res,
        400,
        "Faltan datos obligatorios: nombre, apellido, dni, email, fecha_nacimiento, rol"
      );
    }

    if (!ROLES_VALIDOS.includes(rol)) {
      return enviarRespuesta(res, 400, `El rol debe ser uno de: ${ROLES_VALIDOS.join(", ")}`);
    }

    const vinculos = resolverVinculos(rol, id_sede, id_cobertura);
    if (vinculos.error) {
      return enviarRespuesta(res, 400, vinculos.error);
    }

    const errorVinculos = await validarVinculos(vinculos);
    if (errorVinculos) {
      return enviarRespuesta(res, 400, errorVinculos);
    }

    const [existentes] = await pool.query(
      "SELECT id FROM usuario WHERE (dni = ? OR email = ?) AND id <> ?",
      [dni, email, id]
    );
    if (existentes.length > 0) {
      return enviarRespuesta(res, 409, "Ya existe otro usuario registrado con ese DNI o email");
    }

    // La password es opcional: si no viene, se conserva la que ya tenia.
    const passwordHasheada = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;

    await pool.query(
      `UPDATE usuario
       SET apellido = ?, nombre = ?, fecha_nacimiento = ?, rol = ?, email = ?, telefono = ?,
           dni = ?, id_sede = ?, id_cobertura = ?, password = COALESCE(?, password)
       WHERE id = ?`,
      [
        apellido,
        nombre,
        fecha_nacimiento,
        rol,
        email,
        telefono || "",
        dni,
        vinculos.id_sede,
        vinculos.id_cobertura,
        passwordHasheada,
        id,
      ]
    );

    const usuario = await obtenerUsuarioPorId(id);
    return enviarRespuesta(res, 200, "ok", usuario);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return enviarRespuesta(res, 409, "Ya existe otro usuario registrado con ese DNI o email");
    }

    console.error(error);
    return enviarRespuesta(res, 500, "Error al actualizar el usuario");
  }
}

async function eliminarUsuario(req, res) {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const usuario = await obtenerUsuarioPorId(id);
    if (!usuario) {
      return enviarRespuesta(res, 404, "El usuario indicado no existe");
    }

    if (Number(id) === req.usuario.id) {
      return enviarRespuesta(res, 409, "No podes eliminar tu propio usuario");
    }

    const dependencias = [
      ["SELECT id FROM turno WHERE id_paciente = ? OR id_medico = ? LIMIT 1", [id, id], "turnos"],
      ["SELECT id FROM agenda WHERE id_medico = ? LIMIT 1", [id], "agenda"],
      [
        "SELECT id FROM historial_clinico WHERE id_paciente = ? OR id_medico = ? LIMIT 1",
        [id, id],
        "historial clinico",
      ],
      [
        "SELECT id FROM medico_especialidad WHERE id_medico = ? LIMIT 1",
        [id],
        "especialidades asignadas",
      ],
      // Los logs no se borran nunca: son el rastro de auditoria.
      [
        "SELECT id FROM log_auditoria WHERE id_usuario = ? LIMIT 1",
        [id],
        "registros de auditoria",
      ],
    ];

    for (const [consulta, parametros, descripcion] of dependencias) {
      const [filas] = await pool.query(consulta, parametros);
      if (filas.length > 0) {
        return enviarRespuesta(
          res,
          409,
          `No se puede eliminar el usuario: tiene ${descripcion} asociados`
        );
      }
    }

    await connection.beginTransaction();
    // Las notificaciones son datos derivados del usuario, no informacion propia:
    // se borran junto con el.
    await connection.query("DELETE FROM notificacion WHERE id_usuario = ?", [id]);
    await connection.query("DELETE FROM usuario WHERE id = ?", [id]);
    await connection.commit();

    return enviarRespuesta(res, 200, "ok", { id: Number(id) });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return enviarRespuesta(res, 500, "Error al eliminar el usuario");
  } finally {
    connection.release();
  }
}

module.exports = {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
};
