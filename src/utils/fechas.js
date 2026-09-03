const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Acepta solo YYYY-MM-DD y descarta fechas que existen como texto pero no en el
// calendario (2026-02-30, por ejemplo).
function esFechaValida(valor) {
  if (!FORMATO_FECHA.test(valor)) {
    return false;
  }

  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
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

module.exports = { validarRangoFechas };
