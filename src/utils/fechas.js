const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// Acepta solo YYYY-MM-DD y descarta fechas que existen como texto pero no en el
// calendario (2026-02-30, por ejemplo).
function esFechaValida(valor) {
  if (!FORMATO_FECHA.test(valor)) {
    return false;
  }

  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

// Acepta solo HH:MM en formato de 24 horas (08:30, 14:00...).
function esHoraValida(valor) {
  return typeof valor === "string" && FORMATO_HORA.test(valor);
}

function dosDigitos(numero) {
  return String(numero).padStart(2, "0");
}

// Fecha local del servidor en formato YYYY-MM-DD: la misma referencia que CURDATE().
function hoyIso() {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}`;
}

// Hora local del servidor en formato HH:MM.
function horaActual() {
  const ahora = new Date();
  return `${dosDigitos(ahora.getHours())}:${dosDigitos(ahora.getMinutes())}`;
}

// YYYY-MM-DD -> DD/MM/YYYY, el formato con el que se muestran las fechas en los mensajes.
function formatearFecha(valor) {
  const [anio, mes, dia] = String(valor).split("-");
  return `${dia}/${mes}/${anio}`;
}

// Normaliza el rango de fechas que comparten los reportes y la consulta de auditoria.
// Devuelve { error } si algo no valida, o { desde, hasta } (cualquiera puede ser null).
function validarRangoFechas(desde, hasta) {
  const desdeNormalizado = desde ? String(desde).trim() : null;
  const hastaNormalizado = hasta ? String(hasta).trim() : null;

  if (desdeNormalizado && !esFechaValida(desdeNormalizado)) {
    return { error: "El parametro desde debe tener el formato YYYY-MM-DD" };
  }

  if (hastaNormalizado && !esFechaValida(hastaNormalizado)) {
    return { error: "El parametro hasta debe tener el formato YYYY-MM-DD" };
  }

  if (desdeNormalizado && hastaNormalizado && desdeNormalizado > hastaNormalizado) {
    return { error: "El parametro desde no puede ser posterior a hasta" };
  }

  return { desde: desdeNormalizado, hasta: hastaNormalizado };
}

module.exports = {
  esFechaValida,
  esHoraValida,
  hoyIso,
  horaActual,
  formatearFecha,
  validarRangoFechas,
};
