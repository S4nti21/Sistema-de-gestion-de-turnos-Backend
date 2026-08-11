const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { enviarRespuesta } = require("../utils/respuesta");

const SALT_ROUNDS = 10;

async function registro(req, res) {
  try {
    const { nombre, apellido, dni, email, password, fecha_nacimiento, telefono, id_cobertura } = req.body;

    if (!nombre || !apellido || !dni || !email || !password || !fecha_nacimiento || !id_cobertura) {
      return enviarRespuesta(
        res,
        400,
        "Faltan datos obligatorios: nombre, apellido, dni, email, password, fecha_nacimiento, id_cobertura"
      );
    }

    const [coberturas] = await pool.query("SELECT id FROM cobertura WHERE id = ?", [id_cobertura]);
    if (coberturas.length === 0) {
      return enviarRespuesta(res, 400, "La cobertura seleccionada no existe");
    }

    const [existentes] = await pool.query(
      "SELECT id FROM usuario WHERE dni = ? OR email = ?",
      [dni, email]
    );
    if (existentes.length > 0) {
      return enviarRespuesta(res, 409, "Ya existe un usuario registrado con ese DNI o email");
    }

    const passwordHasheada = await bcrypt.hash(password, SALT_ROUNDS);

    const [resultado] = await pool.query(
      `INSERT INTO usuario (apellido, nombre, fecha_nacimiento, password, rol, email, telefono, dni, id_sede, id_cobertura)
       VALUES (?, ?, ?, ?, 'paciente', ?, ?, ?, NULL, ?)`,
      [apellido, nombre, fecha_nacimiento, passwordHasheada, email, telefono || "", dni, id_cobertura]
    );

    const [usuarios] = await pool.query(
      "SELECT id, nombre, apellido, dni, email, rol, id_cobertura FROM usuario WHERE id = ?",
      [resultado.insertId]
    );

    return enviarRespuesta(res, 201, "ok", usuarios[0]);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al registrar el usuario");
  }
}

async function login(req, res) {
  try {
    const { dni, password } = req.body;

    if (!dni || !password) {
      return enviarRespuesta(res, 400, "dni y password son obligatorios");
    }

    const [usuarios] = await pool.query("SELECT * FROM usuario WHERE dni = ?", [dni]);
    if (usuarios.length === 0) {
      return enviarRespuesta(res, 401, "Credenciales inválidas");
    }

    const usuario = usuarios[0];
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return enviarRespuesta(res, 401, "Credenciales inválidas");
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol, id_sede: usuario.id_sede },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    return enviarRespuesta(res, 200, "ok", { token });
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al iniciar sesión");
  }
}

async function perfil(req, res) {
  try {
    const [usuarios] = await pool.query(
      "SELECT id, nombre, apellido, dni, email, telefono, fecha_nacimiento, rol, id_sede, id_cobertura FROM usuario WHERE id = ?",
      [req.usuario.id]
    );

    if (usuarios.length === 0) {
      return enviarRespuesta(res, 404, "Usuario no encontrado");
    }

    return enviarRespuesta(res, 200, "ok", usuarios[0]);
  } catch (error) {
    console.error(error);
    return enviarRespuesta(res, 500, "Error al obtener el perfil");
  }
}

module.exports = { registro, login, perfil };
