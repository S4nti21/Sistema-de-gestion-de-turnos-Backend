const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { enviarRespuesta } = require("../utils/respuesta");
const { hoyIso } = require("../utils/fechas");

const SALT_ROUNDS = 10;
const ROLES_VALIDOS = ["paciente", "medico", "operador", "administrador"];
const LIMITE_POR_DEFECTO = 10;
const LIMITE_MAXIMO = 100;

// Nunca se devuelve la columna password: siempre se listan las columnas explicitas.
const SELECT_USUARIO = `
  SELECT id, nombre, apellido, dni, email, telefono, fecha_nacimiento, rol, id_sede, id_cobertura
  FROM usuario
`;

const SELECT_USUARIO_LISTADO = `
  SELECT
    u.id, u.nombre, u.apellido, u.dni, u.email, u.telefono, u.fecha_nacimiento, u.rol,
    u.id_sede, u.id_cobertura,
    s.nombre AS sede_nombre
  FROM usuario u
  LEFT JOIN sede s ON s.id = u.id_sede
`;

// A los medicos se les agrega la lista de especialidades asignadas.
async function obtenerUsuarioPorId(id, conexion = pool) {
  const [usuarios] = await conexion.query(`${SELECT_USUARIO} WHERE id = ?`, [id]);
  const usuario = usuarios[0];
  if (!usuario) {
    return null;
  }

  if (usuario.rol === "medico") {
    const [especialidades] = await conexion.query(
      `SELECT e.id, e.descripcion
       FROM medico_especialidad me
       INNER JOIN especialidad e ON e.id = me.id_especialidad
       WHERE me.id_medico = ?
       ORDER BY e.descripcion`,
      [id]
    );
    usuario.especialidades = especialidades;
  }

  return usuario;
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

// Las especialidades (ids) solo aplican a los medicos. Si no se envian, en el alta
// el medico queda sin especialidades y en la modificacion se conservan las que tenia.
async function validarEspecialidades(rol, especialidades) {
  if (rol !== "medico" || especialidades === undefined) {
    return { ids: null };
  }

  if (!Array.isArray(especialidades) || especialidades.length === 0) {
    return { error: "Un médico debe tener al menos una especialidad" };
  }

  const ids = [...new Set(especialidades.map(Number))];
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    return { error: "Las especialidades deben indicarse con sus ids" };
  }

  const [existentes] = await pool.query("SELECT id FROM especialidad WHERE id IN (?)", [ids]);
  if (existentes.length !== ids.length) {
    return { error: "Alguna de las especialidades indicadas no existe" };
  }

  return { ids };
}

async function guardarEspecialidades(connection, idMedico, ids) {
  await connection.query(
    "DELETE FROM medico_especialidad WHERE id_medico = ? AND id_especialidad NOT IN (?)",
    [idMedico, ids]
  );
  await connection.query(
    "INSERT IGNORE INTO medico_especialidad (id_medico, id_especialidad) VALUES ?",
    [ids.map((idEspecialidad) => [idMedico, idEspecialidad])]
  );
}

async function listarUsuarios(req, res) {
  try {
    const { rol, id_sede, dni, nombre, apellido } = req.query;

    if (rol && !ROLES_VALIDOS.includes(rol)) {
      return enviarRespuesta(res, 400, `El rol debe ser uno de: ${ROLES_VALIDOS.join(", ")}`);
    }

    const condiciones = [];
    const parametros = [];

    if (rol) {
      condiciones.push("u.rol = ?");
      parametros.push(rol);
    }

    if (id_sede) {
      condiciones.push("u.id_sede = ?");
      parametros.push(id_sede);
    }

    if (dni) {
      condiciones.push("u.dni = ?");
      parametros.push(dni);
    }

    if (nombre) {
      condiciones.push("u.nombre LIKE CONCAT('%', ?, '%')");
      parametros.push(String(nombre).trim());
    }

    if (apellido) {
      condiciones.push("u.apellido LIKE CONCAT('%', ?, '%')");
      parametros.push(String(apellido).trim());
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

    const limite = Math.min(Math.max(Number(req.query.limite) || LIMITE_POR_DEFECTO, 1), LIMITE_MAXIMO);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const [totales] = await pool.query(
      `SELECT COUNT(*) AS total FROM usuario u ${where}`,
      parametros
    );

    const [usuarios] = await pool.query(
      `${SELECT_USUARIO_LISTADO} ${where} ORDER BY u.apellido, u.nombre, u.id LIMIT ? OFFSET ?`,
      [...parametros, limite, offset]
    );

    return enviarRespuesta(res, 200, "ok", {
      total: Number(totales[0].total),
      limite,
      offset,
      items: usuarios,
    });
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
  const connection = await pool.getConnection();

  try {
    const { nombre, apellido, dni, email, password, fecha_nacimiento, telefono, rol } = req.body;
    const { id_sede, id_cobertura, especialidades } = req.body;

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

    const especialidadesValidadas = await validarEspecialidades(rol, especialidades);
    if (especialidadesValidadas.error) {
      return enviarRespuesta(res, 400, especialidadesValidadas.error);
    }

    const [existentes] = await pool.query("SELECT id FROM usuario WHERE dni = ? OR email = ?", [
      dni,
      email,
    ]);
    if (existentes.length > 0) {
      return enviarRespuesta(res, 409, "Ya existe un usuario registrado con ese DNI o email");
    }

    const passwordHasheada = await bcrypt.hash(password, SALT_ROUNDS);

    await connection.beginTransaction();

    const [resultado] = await connection.query(
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

    if (especialidadesValidadas.ids) {
      await guardarEspecialidades(connection, resultado.insertId, especialidadesValidadas.ids);
    }

    await connection.commit();

    const usuario = await obtenerUsuarioPorId(resultado.insertId);
    return enviarRespuesta(res, 201, "ok", usuario);
  } catch (error) {
    await connection.rollback();

    // El indice unico de dni/email cierra la ventana de carrera que deja el SELECT previo.
    if (error.code === "ER_DUP_ENTRY") {
      return enviarRespuesta(res, 409, "Ya existe un usuario registrado con ese DNI o email");
    }

    console.error(error);
    return enviarRespuesta(res, 500, "Error al crear el usuario");
  } finally {
    connection.release();
  }
}

async function actualizarUsuario(req, res) {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const actual = await obtenerUsuarioPorId(id);
    if (!actual) {
      return enviarRespuesta(res, 404, "El usuario indicado no existe");
    }

    const { nombre, apellido, dni, email, fecha_nacimiento, telefono, password, rol } = req.body;
    const { id_sede, id_cobertura, especialidades } = req.body;

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

    const especialidadesValidadas = await validarEspecialidades(rol, especialidades);
    if (especialidadesValidadas.error) {
      return enviarRespuesta(res, 400, especialidadesValidadas.error);
    }

    // No se puede quitar una especialidad con la que el medico ya tiene agenda cargada.
    if (especialidadesValidadas.ids) {
      const [enUso] = await pool.query(
        `SELECT DISTINCT e.descripcion
         FROM agenda a
         INNER JOIN especialidad e ON e.id = a.id_especialidad
         WHERE a.id_medico = ? AND a.fecha >= ? AND a.id_especialidad NOT IN (?)`,
        [id, hoyIso(), especialidadesValidadas.ids]
      );
      if (enUso.length > 0) {
        return enviarRespuesta(
          res,
          409,
          `No se puede quitar ${enUso.map((fila) => fila.descripcion).join(", ")}: el médico tiene agenda cargada con esa especialidad`
        );
      }
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

    await connection.beginTransaction();

    await connection.query(
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

    if (especialidadesValidadas.ids) {
      await guardarEspecialidades(connection, Number(id), especialidadesValidadas.ids);
    }

    await connection.commit();

    const usuario = await obtenerUsuarioPorId(id);
    return enviarRespuesta(res, 200, "ok", usuario);
  } catch (error) {
    await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      return enviarRespuesta(res, 409, "Ya existe otro usuario registrado con ese DNI o email");
    }

    console.error(error);
    return enviarRespuesta(res, 500, "Error al actualizar el usuario");
  } finally {
    connection.release();
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
