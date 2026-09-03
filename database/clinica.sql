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
(5, 5, 4);

INSERT INTO `agenda` (`id`, `hora_entrada`, `hora_salida`, `fecha`, `id_medico`, `id_especialidad`, `id_sede`) VALUES
(1,  '08:00', '13:00', '2026-06-10', 2, 5, 1),
(2,  '14:00', '19:00', '2026-06-17', 2, 2, 1),
(3,  '08:00', '13:00', '2026-07-08', 2, 5, 1),
(4,  '14:00', '19:00', '2026-07-15', 2, 2, 1),
(5,  '08:00', '13:00', '2026-08-05', 2, 5, 1),
(6,  '14:00', '19:00', '2026-08-12', 2, 2, 1),
(7,  '08:00', '13:00', '2026-08-19', 2, 5, 1),
(8,  '08:00', '13:00', '2026-09-09', 2, 5, 1),
(9,  '14:00', '19:00', '2026-09-16', 2, 2, 1),
(10, '08:00', '13:00', '2026-09-23', 2, 5, 1),
(11, '09:00', '14:00', '2026-06-24', 4, 1, 2),
(12, '15:00', '20:00', '2026-07-08', 4, 2, 2),
(13, '09:00', '14:00', '2026-07-22', 4, 1, 2),
(14, '09:00', '14:00', '2026-08-05', 4, 1, 2),
(15, '15:00', '20:00', '2026-08-19', 4, 2, 2),
(16, '09:00', '14:00', '2026-08-26', 4, 1, 2),
(17, '09:00', '14:00', '2026-09-09', 4, 1, 2),
(18, '15:00', '20:00', '2026-09-16', 4, 2, 2),
(19, '09:00', '14:00', '2026-09-30', 4, 1, 2),
(20, '08:00', '12:00', '2026-06-10', 5, 4, 3),
(21, '08:00', '12:00', '2026-07-15', 5, 4, 3),
(22, '08:00', '12:00', '2026-08-12', 5, 4, 3),
(23, '08:00', '12:00', '2026-08-26', 5, 4, 3),
(24, '08:00', '12:00', '2026-09-23', 5, 4, 3);

INSERT INTO `turno` (`id`, `id_paciente`, `id_medico`, `id_especialidad`, `id_sede`, `id_agenda`, `fecha`, `hora`, `nota`, `id_cobertura`, `estado`) VALUES
(1,  7,  2, 5, 1, 1,  '2026-06-10', '08:30', 'Control post operatorio',  1, 'atendido'),
(2,  8,  2, 5, 1, 1,  '2026-06-10', '09:30', 'Dolor de rodilla',         1, 'atendido'),
(3,  9,  2, 5, 1, 1,  '2026-06-10', '10:30', 'Esguince de tobillo',      2, 'cancelado'),
(4,  10, 2, 2, 1, 2,  '2026-06-17', '15:00', 'Chequeo general',          3, 'atendido'),
(5,  11, 2, 2, 1, 2,  '2026-06-17', '16:00', 'Control de presion',       4, 'atendido'),
(6,  9,  4, 1, 2, 11, '2026-06-24', '09:30', 'Electrocardiograma',       2, 'atendido'),
(7,  10, 4, 1, 2, 11, '2026-06-24', '11:00', 'Control cardiologico',     3, 'cancelado'),
(8,  7,  5, 4, 3, 20, '2026-06-10', '08:30', 'Control pediatrico',       1, 'atendido'),
(9,  7,  2, 5, 1, 3,  '2026-07-08', '08:30', 'Control de yeso',          1, 'atendido'),
(10, 8,  2, 5, 1, 3,  '2026-07-08', '10:00', 'Dolor lumbar',             1, 'atendido'),
(11, 11, 4, 2, 2, 12, '2026-07-08', '15:30', 'Chequeo anual',            4, 'atendido'),
(12, 9,  2, 2, 1, 4,  '2026-07-15', '14:30', 'Analisis de sangre',       2, 'atendido'),
(13, 10, 2, 2, 1, 4,  '2026-07-15', '16:00', 'Control clinico',          3, 'cancelado'),
(14, 8,  5, 4, 3, 21, '2026-07-15', '09:00', 'Vacunacion',               1, 'atendido'),
(15, 11, 5, 4, 3, 21, '2026-07-15', '10:30', 'Control de crecimiento',   4, 'atendido'),
(16, 7,  4, 1, 2, 13, '2026-07-22', '09:30', 'Ecocardiograma',           1, 'atendido'),
(17, 9,  4, 1, 2, 13, '2026-07-22', '11:30', 'Control de arritmia',      2, 'atendido'),
(18, 7,  2, 5, 1, 5,  '2026-08-05', '08:30', 'Rehabilitacion',           1, 'atendido'),
(19, 8,  2, 5, 1, 5,  '2026-08-05', '10:00', 'Control de fractura',      1, 'atendido'),
(20, 10, 4, 1, 2, 14, '2026-08-05', '09:30', 'Control de presion',       3, 'atendido'),
(21, 9,  2, 2, 1, 6,  '2026-08-12', '14:30', 'Consulta general',         2, 'atendido'),
(22, 11, 5, 4, 3, 22, '2026-08-12', '08:30', 'Control pediatrico',       4, 'atendido'),
(23, 10, 5, 4, 3, 22, '2026-08-12', '10:00', 'Fiebre persistente',       3, 'cancelado'),
(24, 7,  2, 5, 1, 7,  '2026-08-19', '09:00', 'Control de rodilla',       1, 'atendido'),
(25, 8,  4, 2, 2, 15, '2026-08-19', '15:30', 'Chequeo general',          1, 'atendido'),
(26, 9,  4, 1, 2, 16, '2026-08-26', '09:30', 'Holter 24 horas',          2, 'atendido'),
(27, 11, 4, 1, 2, 16, '2026-08-26', '11:00', 'Control cardiologico',     4, 'cancelado'),
(28, 7,  5, 4, 3, 23, '2026-08-26', '08:30', 'Control anual',            1, 'atendido'),
(29, 7,  2, 5, 1, 8,  '2026-09-09', '08:30', 'Control de rodilla',       1, 'confirmado'),
(30, 8,  2, 5, 1, 8,  '2026-09-09', '10:00', 'Dolor de espalda',         1, 'confirmado'),
(31, 9,  4, 1, 2, 17, '2026-09-09', '09:30', 'Control cardiologico',     2, 'confirmado'),
(32, 10, 2, 2, 1, 9,  '2026-09-16', '14:30', 'Chequeo general',          3, 'confirmado'),
(33, 11, 4, 2, 2, 18, '2026-09-16', '15:30', 'Analisis de rutina',       4, 'confirmado'),
(34, 7,  5, 4, 3, 24, '2026-09-23', '08:30', 'Control pediatrico',       1, 'confirmado'),
(35, 8,  2, 5, 1, 10, '2026-09-23', '09:00', 'Rehabilitacion',           1, 'cancelado');

INSERT INTO `historial_clinico` (`id`, `id_turno`, `id_medico`, `id_paciente`, `diagnostico`, `tratamiento`, `observaciones`, `fecha`) VALUES
(1, 1,  2, 7, 'Esguince de tobillo grado I',      'Reposo y antiinflamatorios',   'Control en 15 dias',            '2026-06-10 09:00:00'),
(2, 6,  4, 9, 'Arritmia sinusal leve',            'Control periodico',            'Repetir ECG en 3 meses',        '2026-06-24 10:15:00'),
(3, 9,  2, 7, 'Evolucion favorable de fractura',  'Retiro de yeso',               'Iniciar kinesiologia',          '2026-07-08 09:10:00'),
(4, 14, 5, 8, 'Paciente sano',                    'Vacunacion al dia',            'Proximo control en 6 meses',    '2026-07-15 09:30:00'),
(5, 18, 2, 7, 'Rehabilitacion en curso',          'Kinesiologia 2 veces por semana', 'Buena movilidad articular',  '2026-08-05 09:05:00');

INSERT INTO `notificacion` (`id`, `id_usuario`, `tipo`, `mensaje`, `leida`, `fecha`) VALUES
(1, 7, 'turno_confirmado', 'Tu turno fue confirmado para el 2026-09-09 a las 08:30 con Ana Lopez.',   0, '2026-08-20 09:00:00'),
(2, 8, 'turno_confirmado', 'Tu turno fue confirmado para el 2026-09-09 a las 10:00 con Ana Lopez.',   0, '2026-08-20 09:05:00'),
(3, 8, 'turno_cancelado',  'Tu turno del 2026-09-23 a las 09:00 fue cancelado.',                      0, '2026-08-28 11:00:00'),
(4, 7, 'turno_atendido',   'Tu turno del 2026-08-19 a las 09:00 fue marcado como atendido.',          1, '2026-08-19 09:40:00');
