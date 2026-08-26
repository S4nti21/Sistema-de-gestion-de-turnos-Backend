const express = require("express");
const cors = require("cors");
const { enviarRespuesta } = require("./utils/respuesta");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const coberturaRoutes = require("./routes/cobertura.routes");
const sedeRoutes = require("./routes/sede.routes");
const especialidadRoutes = require("./routes/especialidad.routes");
const agendaRoutes = require("./routes/agenda.routes");
const turnoRoutes = require("./routes/turno.routes");
const historialRoutes = require("./routes/historial.routes");
const notificacionRoutes = require("./routes/notificacion.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/health", healthRoutes);
app.use("/auth", authRoutes);
app.use("/coberturas", coberturaRoutes);
app.use("/sedes", sedeRoutes);
app.use("/especialidades", especialidadRoutes);
app.use("/agenda", agendaRoutes);
app.use("/turnos", turnoRoutes);
app.use("/historial-clinico", historialRoutes);
app.use("/notificaciones", notificacionRoutes);

app.use((req, res) => {
  return enviarRespuesta(res, 404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`);
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  return enviarRespuesta(res, 500, "Error interno del servidor");
});

module.exports = app;
