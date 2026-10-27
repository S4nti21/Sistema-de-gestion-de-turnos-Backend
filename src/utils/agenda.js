const { hoyIso, horaActual } = require("./fechas");

// Duracion fija de cada turno. La disponibilidad y el alta de turnos usan la misma
// grilla: dentro de un rango de agenda, los turnos empiezan cada 30 minutos.
const DURACION_TURNO_MINUTOS = 30;

function aMinutos(hora) {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * 60 + minutos;
}

function aHora(minutos) {
  const horas = String(Math.floor(minutos / 60)).padStart(2, "0");
  return `${horas}:${String(minutos % 60).padStart(2, "0")}`;
}

// Horarios de inicio de los turnos que entran completos en un rango:
// 08:00-10:00 -> 08:00, 08:30, 09:00, 09:30.
function generarHorarios(horaEntrada, horaSalida) {
  const horarios = [];
  const fin = aMinutos(horaSalida);

  for (
    let inicio = aMinutos(horaEntrada);
    inicio + DURACION_TURNO_MINUTOS <= fin;
    inicio += DURACION_TURNO_MINUTOS
  ) {
    horarios.push(aHora(inicio));
  }

  return horarios;
}

// Un turno "entra" en un rango si empieza dentro de el y termina antes de la salida.
function turnoEntraEnRango(hora, horaEntrada, horaSalida) {
  return hora >= horaEntrada && aMinutos(hora) + DURACION_TURNO_MINUTOS <= aMinutos(horaSalida);
}

// Horarios libres de un dia: los de cada rango de agenda, menos los ya ocupados por
// turnos confirmados y, si el dia es hoy, menos los que ya pasaron.
function horariosLibres(rangos, horasOcupadas, fecha) {
  const hoy = hoyIso();
  if (fecha < hoy) {
    return [];
  }

  const ahora = fecha === hoy ? horaActual() : null;
  const libres = new Set();

  for (const rango of rangos) {
    for (const hora of generarHorarios(rango.hora_entrada, rango.hora_salida)) {
      if (!horasOcupadas.includes(hora) && (!ahora || hora > ahora)) {
        libres.add(hora);
      }
    }
  }

  return [...libres].sort();
}

module.exports = {
  DURACION_TURNO_MINUTOS,
  generarHorarios,
  turnoEntraEnRango,
  horariosLibres,
};
