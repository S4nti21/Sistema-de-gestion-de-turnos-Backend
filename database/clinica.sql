DROP DATABASE IF EXISTS `clinica`;
CREATE DATABASE `clinica` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `clinica`;

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `sede` (
  `id`        INT NOT NULL AUTO_INCREMENT,
  `nombre`    VARCHAR(50)  NOT NULL,
  `direccion` VARCHAR(100) NOT NULL,
  `telefono`  VARCHAR(20)  NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cobertura` (
  `id`     INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `especialidad` (
  `id`          INT NOT NULL AUTO_INCREMENT,
  `descripcion` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `usuario` (
  `id`               INT NOT NULL AUTO_INCREMENT,
  `apellido`         VARCHAR(50)  NOT NULL,
  `nombre`           VARCHAR(50)  NOT NULL,
  `fecha_nacimiento` DATE         NOT NULL,
  `password`         VARCHAR(255) NOT NULL,
  `rol`              VARCHAR(20)  NOT NULL,
  `email`            VARCHAR(100) NOT NULL,
  `telefono`         VARCHAR(20)  NOT NULL DEFAULT '',
  `dni`              VARCHAR(8)   NOT NULL,
  `id_sede`          INT DEFAULT NULL,
  `id_cobertura`     INT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_usuario_dni`   (`dni`),
  UNIQUE KEY `uq_usuario_email` (`email`),
  KEY `idx_usuario_rol`       (`rol`),
  KEY `idx_usuario_sede`      (`id_sede`),
  KEY `idx_usuario_cobertura` (`id_cobertura`),
  CONSTRAINT `fk_usuario_sede`      FOREIGN KEY (`id_sede`)      REFERENCES `sede` (`id`),
  CONSTRAINT `fk_usuario_cobertura` FOREIGN KEY (`id_cobertura`) REFERENCES `cobertura` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `medico_especialidad` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `id_medico`       INT NOT NULL,
  `id_especialidad` INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_medico_especialidad` (`id_medico`, `id_especialidad`),
  KEY `idx_me_especialidad` (`id_especialidad`),
  CONSTRAINT `fk_me_medico`       FOREIGN KEY (`id_medico`)       REFERENCES `usuario` (`id`),
  CONSTRAINT `fk_me_especialidad` FOREIGN KEY (`id_especialidad`) REFERENCES `especialidad` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `agenda` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `hora_entrada`    VARCHAR(5) NOT NULL,
  `hora_salida`     VARCHAR(5) NOT NULL,
  `fecha`           DATE NOT NULL,
  `id_medico`       INT NOT NULL,
  `id_especialidad` INT NOT NULL,
  `id_sede`         INT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_agenda_medico`       (`id_medico`),
  KEY `idx_agenda_especialidad` (`id_especialidad`),
  KEY `idx_agenda_sede`         (`id_sede`),
  KEY `idx_agenda_fecha`        (`fecha`),
  CONSTRAINT `fk_agenda_medico`       FOREIGN KEY (`id_medico`)       REFERENCES `usuario` (`id`),
  CONSTRAINT `fk_agenda_especialidad` FOREIGN KEY (`id_especialidad`) REFERENCES `especialidad` (`id`),
  CONSTRAINT `fk_agenda_sede`         FOREIGN KEY (`id_sede`)         REFERENCES `sede` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `turno` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `id_paciente`     INT NOT NULL,
  `id_medico`       INT NOT NULL,
  `id_especialidad` INT NOT NULL,
  `id_sede`         INT NOT NULL,
  `id_agenda`       INT DEFAULT NULL,
  `fecha`           DATE DEFAULT NULL,
  `hora`            VARCHAR(5) DEFAULT NULL,
  `nota`            VARCHAR(40) DEFAULT NULL,
  `id_cobertura`    INT NOT NULL,
  `estado`          VARCHAR(20) NOT NULL DEFAULT 'confirmado',
  PRIMARY KEY (`id`),
  KEY `idx_turno_fecha`        (`fecha`),
  KEY `idx_turno_estado`       (`estado`),
  KEY `idx_turno_paciente`     (`id_paciente`),
  KEY `idx_turno_medico`       (`id_medico`),
  KEY `idx_turno_especialidad` (`id_especialidad`),
  KEY `idx_turno_sede`         (`id_sede`),
  KEY `idx_turno_agenda`       (`id_agenda`),
  KEY `idx_turno_cobertura`    (`id_cobertura`),
  CONSTRAINT `fk_turno_paciente`     FOREIGN KEY (`id_paciente`)     REFERENCES `usuario` (`id`),
  CONSTRAINT `fk_turno_medico`       FOREIGN KEY (`id_medico`)       REFERENCES `usuario` (`id`),
  CONSTRAINT `fk_turno_especialidad` FOREIGN KEY (`id_especialidad`) REFERENCES `especialidad` (`id`),
  CONSTRAINT `fk_turno_sede`         FOREIGN KEY (`id_sede`)         REFERENCES `sede` (`id`),
  CONSTRAINT `fk_turno_agenda`       FOREIGN KEY (`id_agenda`)       REFERENCES `agenda` (`id`),
  CONSTRAINT `fk_turno_cobertura`    FOREIGN KEY (`id_cobertura`)    REFERENCES `cobertura` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `historial_clinico` (
  `id`            INT NOT NULL AUTO_INCREMENT,
  `id_turno`      INT NOT NULL,
  `id_medico`     INT NOT NULL,
  `id_paciente`   INT NOT NULL,
  `diagnostico`   VARCHAR(255) NOT NULL,
  `tratamiento`   VARCHAR(255) DEFAULT NULL,
  `observaciones` VARCHAR(255) DEFAULT NULL,
  `fecha`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_historial_turno`    (`id_turno`),
  KEY `idx_historial_medico`   (`id_medico`),
  KEY `idx_historial_paciente` (`id_paciente`),
  CONSTRAINT `fk_historial_turno`    FOREIGN KEY (`id_turno`)    REFERENCES `turno` (`id`),
  CONSTRAINT `fk_historial_medico`   FOREIGN KEY (`id_medico`)   REFERENCES `usuario` (`id`),
  CONSTRAINT `fk_historial_paciente` FOREIGN KEY (`id_paciente`) REFERENCES `usuario` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notificacion` (
  `id`         INT NOT NULL AUTO_INCREMENT,
  `id_usuario` INT NOT NULL,
  `tipo`       VARCHAR(30)  NOT NULL,
  `mensaje`    VARCHAR(255) NOT NULL,
  `leida`      TINYINT(1)   NOT NULL DEFAULT 0,
  `fecha`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notificacion_usuario` (`id_usuario`),
  CONSTRAINT `fk_notificacion_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `log_auditoria` (
  `id`         INT NOT NULL AUTO_INCREMENT,
  `id_usuario` INT NOT NULL,
  `accion`     VARCHAR(20) NOT NULL,
  `entidad`    VARCHAR(30) NOT NULL,
  `id_entidad` INT DEFAULT NULL,
  `detalle`    VARCHAR(255) DEFAULT NULL,
  `fecha`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_log_usuario` (`id_usuario`),
  KEY `idx_log_entidad` (`entidad`),
  KEY `idx_log_accion`  (`accion`),
  KEY `idx_log_fecha`   (`fecha`),
  CONSTRAINT `fk_log_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Datos de prueba. Las fechas de agenda, turnos, historial, notificaciones y
-- auditoria se calculan a partir del dia en que se importa el script: siempre hay
-- turnos de hoy, futuros y pasados para probar cada rol.
SET @hoy = CURDATE();

INSERT INTO `sede` (`id`, `nombre`, `direccion`, `telefono`) VALUES
(1, 'Sede Centro', 'San Martin 123',    '3424000001'),
(2, 'Sede Norte',  'Av. Rivadavia 456', '3424000002'),
(3, 'Sede Sur',    'Belgrano 789',      '3424000003');

INSERT INTO `cobertura` (`id`, `nombre`) VALUES
(1, 'Jerarquicos'),
(2, 'OSDE'),
(3, 'Swiss Medical'),
(4, 'Particular');

INSERT INTO `especialidad` (`id`, `descripcion`) VALUES
(1, 'Cardiologia'),
(2, 'Clinica Medica'),
(3, 'Dermatologia'),
(4, 'Pediatria'),
(5, 'Traumatologia');

-- Todos los usuarios tienen la password Password123!
INSERT INTO `usuario` (`id`, `apellido`, `nombre`, `fecha_nacimiento`, `password`, `rol`, `email`, `telefono`, `dni`, `id_sede`, `id_cobertura`) VALUES
(1,  'Gomez',    'Marcos',  '1975-08-01', '$2b$10$TE23KITugmTG72PzcQVQbOM9SXAEedqNV0y3G6FWQDRJPMYstBaaO', 'administrador', 'mgomez@clinica.com',   '3424222333', '10000001', NULL, NULL),
(2,  'Lopez',    'Ana',     '1980-05-10', '$2b$10$TE23KITugmTG72PzcQVQbOM9SXAEedqNV0y3G6FWQDRJPMYstBaaO', 'medico',        'alopez@clinica.com',   '3424111222', '10000002', 1,    NULL),
(3,  'Perez',    'Juan',    '1995-12-30', '$2b$10$TE23KITugmTG72PzcQVQbOM9SXAEedqNV0y3G6FWQDRJPMYstBaaO', 'operador',      'jperez@clinica.com',   '3424568897', '10000003', 1,    NULL),
(4,  'Ramirez',  'Diego',   '1978-02-19', '$2b$10$TE23KITugmTG72PzcQVQbOM9SXAEedqNV0y3G6FWQDRJPMYstBaaO', 'medico',        'dramirez@clinica.com', '3424333444', '10000004', 2,    NULL),
(5,  'Sosa',     'Valeria', '1985-11-03', '$2b$10$TE23KITugmTG72PzcQVQbOM9SXAEedqNV0y3G6FWQDRJPMYstBaaO', 'medico',        'vsosa@clinica.com',    '3424444555', '10000005', 3,    NULL),
(6,  'Diaz',     'Carla',   '1990-07-21', '$2b$10$TE23KITugmTG72PzcQVQbOM9SXAEedqNV0y3G6FWQDRJPMYstBaaO', 'operador',      'cdiaz@clinica.com',    '3424555666', '10000006', 2,    NULL),
(7,  'Friggeri', 'Franco',  '1998-03-14', '$2b$10$TE23KITugmTG72PzcQVQbOM9SXAEedqNV0y3G6FWQDRJPMYstBaaO', 'paciente',      'ffriggeri@gmail.com',  '3424545555', '36000960', NULL, 1),
(8,  'Postman',  'Test',    '1999-01-01', '$2b$10$TE23KITugmTG72PzcQVQbOM9SXAEedqNV0y3G6FWQDRJPMYstBaaO', 'paciente',      'test.postman@mail.com','3424000000', '40111222', NULL, 1),
(9,  'Molina',   'Lucia',   '1993-06-25', '$2b$10$TE23KITugmTG72PzcQVQbOM9SXAEedqNV0y3G6FWQDRJPMYstBaaO', 'paciente',      'lmolina@gmail.com',    '3424666777', '41222333', NULL, 2),
(10, 'Herrera',  'Pablo',   '1987-09-08', '$2b$10$TE23KITugmTG72PzcQVQbOM9SXAEedqNV0y3G6FWQDRJPMYstBaaO', 'paciente',      'pherrera@gmail.com',   '3424777888', '42333444', NULL, 3),
(11, 'Nunez',    'Sofia',   '2001-04-17', '$2b$10$TE23KITugmTG72PzcQVQbOM9SXAEedqNV0y3G6FWQDRJPMYstBaaO', 'paciente',      'snunez@gmail.com',     '3424888999', '43444555', NULL, 4);

INSERT INTO `medico_especialidad` (`id`, `id_medico`, `id_especialidad`) VALUES
(1, 2, 5),
(2, 2, 2),
(3, 4, 1),
(4, 4, 2),
(5, 5, 4),
(6, 5, 3);

-- Ana Lopez (id 2) atiende en dos sedes: Traumatologia en Sede Centro a la manana
-- y Clinica Medica en Sede Norte a la tarde.
INSERT INTO `agenda` (`id`, `hora_entrada`, `hora_salida`, `fecha`, `id_medico`, `id_especialidad`, `id_sede`) VALUES
(1,  '08:00', '12:00', @hoy,                   2, 5, 1),
(2,  '14:00', '18:00', @hoy,                   2, 2, 2),
(3,  '08:00', '12:00', @hoy + INTERVAL 1 DAY,  2, 5, 1),
(4,  '14:00', '18:00', @hoy + INTERVAL 2 DAY,  2, 2, 2),
(5,  '08:00', '12:00', @hoy + INTERVAL 7 DAY,  2, 5, 1),
(6,  '14:00', '18:00', @hoy + INTERVAL 8 DAY,  2, 2, 2),
(7,  '08:00', '12:00', @hoy - INTERVAL 7 DAY,  2, 5, 1),
(8,  '14:00', '18:00', @hoy - INTERVAL 14 DAY, 2, 2, 2),
(9,  '08:00', '12:00', @hoy - INTERVAL 30 DAY, 2, 5, 1),
(10, '14:00', '18:00', @hoy - INTERVAL 45 DAY, 2, 2, 1),
(11, '09:00', '13:00', @hoy,                   4, 1, 2),
(12, '09:00', '13:00', @hoy + INTERVAL 1 DAY,  4, 1, 2),
(13, '15:00', '19:00', @hoy + INTERVAL 3 DAY,  4, 2, 2),
(14, '09:00', '13:00', @hoy + INTERVAL 7 DAY,  4, 1, 2),
(15, '09:00', '13:00', @hoy - INTERVAL 7 DAY,  4, 1, 2),
(16, '15:00', '19:00', @hoy - INTERVAL 21 DAY, 4, 2, 2),
(17, '09:00', '13:00', @hoy - INTERVAL 35 DAY, 4, 1, 2),
(18, '08:00', '12:00', @hoy,                   5, 4, 3),
(19, '14:00', '17:00', @hoy + INTERVAL 2 DAY,  5, 3, 3),
(20, '08:00', '12:00', @hoy + INTERVAL 4 DAY,  5, 4, 3),
(21, '08:00', '12:00', @hoy - INTERVAL 10 DAY, 5, 4, 3),
(22, '14:00', '17:00', @hoy - INTERVAL 28 DAY, 5, 3, 3);

-- Turnos en los tres estados: atendidos y cancelados en el pasado, confirmados hoy y
-- en los proximos dias.
INSERT INTO `turno` (`id`, `id_paciente`, `id_medico`, `id_especialidad`, `id_sede`, `id_agenda`, `fecha`, `hora`, `nota`, `id_cobertura`, `estado`) VALUES
(1,  7,  2, 5, 1, 9,  @hoy - INTERVAL 30 DAY, '08:30', 'Dolor de rodilla',        1, 'atendido'),
(2,  8,  2, 5, 1, 9,  @hoy - INTERVAL 30 DAY, '09:30', 'Esguince de tobillo',     1, 'atendido'),
(3,  9,  2, 5, 1, 9,  @hoy - INTERVAL 30 DAY, '10:30', 'Control de yeso',         2, 'cancelado'),
(4,  10, 2, 2, 1, 10, @hoy - INTERVAL 45 DAY, '14:30', 'Chequeo general',         3, 'atendido'),
(5,  11, 2, 2, 1, 10, @hoy - INTERVAL 45 DAY, '15:30', 'Control de presion',      4, 'atendido'),
(6,  9,  4, 1, 2, 17, @hoy - INTERVAL 35 DAY, '09:30', 'Electrocardiograma',      2, 'atendido'),
(7,  10, 4, 1, 2, 17, @hoy - INTERVAL 35 DAY, '11:00', 'Control cardiologico',    3, 'cancelado'),
(8,  7,  5, 3, 3, 22, @hoy - INTERVAL 28 DAY, '14:30', 'Control de lunares',      1, 'atendido'),
(9,  11, 4, 2, 2, 16, @hoy - INTERVAL 21 DAY, '15:30', 'Chequeo anual',           4, 'atendido'),
(10, 8,  2, 2, 2, 8,  @hoy - INTERVAL 14 DAY, '14:30', 'Analisis de sangre',      1, 'atendido'),
(11, 9,  2, 2, 2, 8,  @hoy - INTERVAL 14 DAY, '16:00', 'Control clinico',         2, 'cancelado'),
(12, 11, 5, 4, 3, 21, @hoy - INTERVAL 10 DAY, '08:30', 'Control de crecimiento',  4, 'atendido'),
(13, 10, 5, 4, 3, 21, @hoy - INTERVAL 10 DAY, '10:00', 'Fiebre persistente',      3, 'cancelado'),
(14, 7,  2, 5, 1, 7,  @hoy - INTERVAL 7 DAY,  '09:00', 'Control de rodilla',      1, 'atendido'),
(15, 9,  4, 1, 2, 15, @hoy - INTERVAL 7 DAY,  '10:30', 'Control de arritmia',     2, 'atendido'),
(16, 7,  2, 5, 1, 1,  @hoy,                   '09:00', 'Control post operatorio', 1, 'confirmado'),
(17, 8,  2, 5, 1, 1,  @hoy,                   '10:30', 'Dolor lumbar',            1, 'confirmado'),
(18, 11, 2, 2, 2, 2,  @hoy,                   '15:00', 'Chequeo general',         4, 'confirmado'),
(19, 9,  4, 1, 2, 11, @hoy,                   '10:00', 'Control cardiologico',    2, 'confirmado'),
(20, 10, 5, 4, 3, 18, @hoy,                   '09:30', 'Control pediatrico',      3, 'confirmado'),
(21, 7,  5, 4, 3, 18, @hoy,                   '11:00', 'Vacunacion',              1, 'cancelado'),
(22, 7,  2, 5, 1, 3,  @hoy + INTERVAL 1 DAY,  '08:30', 'Control de rodilla',      1, 'confirmado'),
(23, 10, 4, 1, 2, 12, @hoy + INTERVAL 1 DAY,  '09:30', 'Holter 24 horas',         3, 'confirmado'),
(24, 9,  2, 2, 2, 4,  @hoy + INTERVAL 2 DAY,  '14:30', 'Analisis de rutina',      2, 'confirmado'),
(25, 11, 5, 3, 3, 19, @hoy + INTERVAL 2 DAY,  '15:00', 'Consulta dermatologica',  4, 'confirmado'),
(26, 7,  4, 2, 2, 13, @hoy + INTERVAL 3 DAY,  '16:00', 'Chequeo anual',           1, 'confirmado'),
(27, 8,  2, 5, 1, 5,  @hoy + INTERVAL 7 DAY,  '09:00', 'Rehabilitacion',          1, 'confirmado');

-- Cada turno atendido tiene su registro de historial clinico.
INSERT INTO `historial_clinico` (`id`, `id_turno`, `id_medico`, `id_paciente`, `diagnostico`, `tratamiento`, `observaciones`, `fecha`) VALUES
(1,  1,  2, 7,  'Esguince de rodilla grado I', 'Reposo y antiinflamatorios',      'Control en 15 dias',               TIMESTAMP(@hoy - INTERVAL 30 DAY, '09:00:00')),
(2,  2,  2, 8,  'Esguince de tobillo leve',    'Vendaje y hielo',                 'Evitar deportes por 2 semanas',    TIMESTAMP(@hoy - INTERVAL 30 DAY, '10:00:00')),
(3,  4,  2, 10, 'Paciente sano',               'Sin tratamiento',                 'Control anual',                    TIMESTAMP(@hoy - INTERVAL 45 DAY, '15:00:00')),
(4,  5,  2, 11, 'Hipertension leve',           'Dieta hiposodica',                'Controlar la presion cada semana', TIMESTAMP(@hoy - INTERVAL 45 DAY, '16:00:00')),
(5,  6,  4, 9,  'Arritmia sinusal leve',       'Control periodico',               'Repetir ECG en 3 meses',           TIMESTAMP(@hoy - INTERVAL 35 DAY, '10:00:00')),
(6,  8,  5, 7,  'Nevos benignos',              'Proteccion solar diaria',         'Control anual de lunares',         TIMESTAMP(@hoy - INTERVAL 28 DAY, '15:00:00')),
(7,  9,  4, 11, 'Chequeo sin hallazgos',       'Actividad fisica regular',        'Proximo control en 12 meses',      TIMESTAMP(@hoy - INTERVAL 21 DAY, '16:00:00')),
(8,  10, 2, 8,  'Anemia leve',                 'Suplemento de hierro',            'Repetir analisis en 2 meses',      TIMESTAMP(@hoy - INTERVAL 14 DAY, '15:00:00')),
(9,  12, 5, 11, 'Crecimiento normal',          'Alimentacion balanceada',         'Proximo control en 6 meses',       TIMESTAMP(@hoy - INTERVAL 10 DAY, '09:00:00')),
(10, 14, 2, 7,  'Evolucion favorable',         'Kinesiologia 2 veces por semana', 'Buena movilidad articular',        TIMESTAMP(@hoy - INTERVAL 7 DAY,  '09:30:00')),
(11, 15, 4, 9,  'Arritmia controlada',         'Continuar con la medicacion',     'Control en 6 meses',               TIMESTAMP(@hoy - INTERVAL 7 DAY,  '11:00:00'));

INSERT INTO `notificacion` (`id`, `id_usuario`, `tipo`, `mensaje`, `leida`, `fecha`) VALUES
(1, 7, 'turno_atendido',   CONCAT('Tu turno del ', DATE_FORMAT(@hoy - INTERVAL 7 DAY, '%d/%m/%Y'), ' a las 09:00 fue marcado como atendido.'), 1, TIMESTAMP(@hoy - INTERVAL 7 DAY, '09:40:00')),
(2, 7, 'turno_confirmado', CONCAT('Tu turno fue confirmado para el ', DATE_FORMAT(@hoy, '%d/%m/%Y'), ' a las 09:00 con Ana Lopez.'), 1, TIMESTAMP(@hoy - INTERVAL 5 DAY, '10:00:00')),
(3, 2, 'turno_confirmado', CONCAT('Nuevo turno con Franco Friggeri el ', DATE_FORMAT(@hoy, '%d/%m/%Y'), ' a las 09:00 en Sede Centro.'), 0, TIMESTAMP(@hoy - INTERVAL 5 DAY, '10:00:00')),
(4, 7, 'turno_confirmado', CONCAT('Tu turno fue confirmado para el ', DATE_FORMAT(@hoy + INTERVAL 1 DAY, '%d/%m/%Y'), ' a las 08:30 con Ana Lopez.'), 0, TIMESTAMP(@hoy - INTERVAL 3 DAY, '12:00:00')),
(5, 2, 'turno_confirmado', CONCAT('Nuevo turno con Franco Friggeri el ', DATE_FORMAT(@hoy + INTERVAL 1 DAY, '%d/%m/%Y'), ' a las 08:30 en Sede Centro.'), 0, TIMESTAMP(@hoy - INTERVAL 3 DAY, '12:00:00')),
(6, 8, 'turno_confirmado', CONCAT('Tu turno fue confirmado para el ', DATE_FORMAT(@hoy + INTERVAL 7 DAY, '%d/%m/%Y'), ' a las 09:00 con Ana Lopez.'), 0, TIMESTAMP(@hoy - INTERVAL 2 DAY, '09:15:00')),
(7, 7, 'turno_cancelado',  CONCAT('Tu turno del ', DATE_FORMAT(@hoy, '%d/%m/%Y'), ' a las 11:00 fue cancelado.'), 0, TIMESTAMP(@hoy - INTERVAL 1 DAY, '18:00:00')),
(8, 5, 'turno_cancelado',  CONCAT('El turno de Franco Friggeri del ', DATE_FORMAT(@hoy, '%d/%m/%Y'), ' a las 11:00 fue cancelado.'), 0, TIMESTAMP(@hoy - INTERVAL 1 DAY, '18:00:00'));

INSERT INTO `log_auditoria` (`id`, `id_usuario`, `accion`, `entidad`, `id_entidad`, `detalle`, `fecha`) VALUES
(1, 1, 'ALTA',         'sede',         3,  'ALTA sobre sede #3 | {"nombre":"Sede Sur","direccion":"Belgrano 789","telefono":"3424000003"}', TIMESTAMP(@hoy - INTERVAL 60 DAY, '10:00:00')),
(2, 1, 'ALTA',         'cobertura',    4,  'ALTA sobre cobertura #4 | {"nombre":"Particular"}', TIMESTAMP(@hoy - INTERVAL 60 DAY, '10:05:00')),
(3, 1, 'ALTA',         'especialidad', 3,  'ALTA sobre especialidad #3 | {"descripcion":"Dermatologia"}', TIMESTAMP(@hoy - INTERVAL 60 DAY, '10:10:00')),
(4, 1, 'ALTA',         'usuario',      5,  'ALTA sobre usuario #5 | {"nombre":"Valeria","apellido":"Sosa","dni":"10000005","email":"vsosa@clinica.com","rol":"medico","id_sede":3,"especialidades":[4]}', TIMESTAMP(@hoy - INTERVAL 59 DAY, '11:00:00')),
(5, 7, 'ALTA',         'usuario',      7,  'ALTA sobre usuario #7 | {"nombre":"Franco","apellido":"Friggeri","dni":"36000960","email":"ffriggeri@gmail.com","id_cobertura":1}', TIMESTAMP(@hoy - INTERVAL 50 DAY, '18:30:00')),
(6, 1, 'MODIFICACION', 'usuario',      5,  'MODIFICACION sobre usuario #5 | {"nombre":"Valeria","apellido":"Sosa","rol":"medico","id_sede":3,"especialidades":[4,3]}', TIMESTAMP(@hoy - INTERVAL 30 DAY, '12:00:00')),
(7, 3, 'ALTA',         'usuario',      11, 'ALTA sobre usuario #11 | {"nombre":"Sofia","apellido":"Nunez","dni":"43444555","email":"snunez@gmail.com","id_cobertura":4}', TIMESTAMP(@hoy - INTERVAL 20 DAY, '09:45:00'));
