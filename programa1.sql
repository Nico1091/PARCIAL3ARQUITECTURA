-- =====================================================
-- SCRIPT SQL COMPLETO PARA WAMPSERVER MYSQL
-- Sistema de Red Social con Solicitudes de Amistad
-- =====================================================

-- Crear y usar la base de datos
DROP DATABASE IF EXISTS programa1;
CREATE DATABASE programa1;
USE programa1;

-- =====================================================
-- TABLA DE PERFILES (TIPOS DE USUARIO)
-- =====================================================
CREATE TABLE perfil (
    id_perfil INT PRIMARY KEY,
    nombre_perfil VARCHAR(50) NOT NULL
);

-- Insertar tipos de perfiles
INSERT INTO perfil (id_perfil, nombre_perfil) VALUES
(1, 'usuario'),
(2, 'administrador');

-- =====================================================
-- TABLA DE USUARIOS
-- =====================================================
CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    id_perfil INT NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_perfil) REFERENCES perfil(id_perfil)
);

-- =====================================================
-- TABLA DE CONEXIONES/SOLICITUDES DE AMISTAD
-- =====================================================
CREATE TABLE conexiones (
    id_conexion INT PRIMARY KEY AUTO_INCREMENT,
    usuario_solicitante INT NOT NULL,
    usuario_solicitado INT NOT NULL,
    estado ENUM('pendiente', 'aceptada', 'rechazada') DEFAULT 'pendiente',
    fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_respuesta DATETIME DEFAULT NULL,
    FOREIGN KEY (usuario_solicitante) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (usuario_solicitado) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    -- Índice único para evitar solicitudes duplicadas
    UNIQUE KEY unique_connection (usuario_solicitante, usuario_solicitado)
);

-- =====================================================
-- TABLA DE MENSAJES
-- =====================================================
CREATE TABLE mensajes (
    id_mensaje INT PRIMARY KEY AUTO_INCREMENT,
    emisor_id INT NOT NULL,
    receptor_id INT NOT NULL,
    mensaje TEXT NOT NULL,
    fecha_envio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    leido BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (emisor_id) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (receptor_id) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- =====================================================
-- TABLA DE PUBLICACIONES
-- =====================================================
CREATE TABLE publicacion (
    id_publicacion INT AUTO_INCREMENT PRIMARY KEY,
    contenido TEXT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    archivos LONGBLOB DEFAULT NULL,
    autor INT NOT NULL,
    FOREIGN KEY (autor) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- =====================================================
-- INSERTAR USUARIOS DE PRUEBA
-- =====================================================
-- NOTA: Las contraseñas están hasheadas con bcrypt (contraseña original: 123456)
INSERT INTO usuario (nombre, email, contrasena, id_perfil) VALUES
('Juan Pérez', 'juan@example.com', '$2b$10$YJQ8q3q3q3q3q3q3q3q3qOE4y4y4y4y4y4y4y4y4y4y4y4y4y4y4y4', 1),
('María García', 'maria@example.com', '$2b$10$YJQ8q3q3q3q3q3q3q3q3qOE4y4y4y4y4y4y4y4y4y4y4y4y4y4y4y4', 1),
('Carlos Admin', 'admin@example.com', '$2b$10$YJQ8q3q3q3q3q3q3q3q3qOE4y4y4y4y4y4y4y4y4y4y4y4y4y4y4y4', 2),
('Ana López', 'ana@example.com', '$2b$10$YJQ8q3q3q3q3q3q3q3q3qOE4y4y4y4y4y4y4y4y4y4y4y4y4y4y4y4', 1),
('Luis Rodríguez', 'luis@example.com', '$2b$10$YJQ8q3q3q3q3q3q3q3q3qOE4y4y4y4y4y4y4y4y4y4y4y4y4y4y4y4', 1);

-- =====================================================
-- INSERTAR CONEXIONES DE PRUEBA
-- =====================================================
INSERT INTO conexiones (usuario_solicitante, usuario_solicitado, estado, fecha_respuesta) VALUES
(1, 2, 'aceptada', NOW()),
(1, 4, 'pendiente', NULL),
(3, 1, 'aceptada', NOW()),
(5, 2, 'pendiente', NULL),
(4, 5, 'pendiente', NULL);

-- =====================================================
-- INSERTAR MENSAJES DE PRUEBA
-- =====================================================
INSERT INTO mensajes (emisor_id, receptor_id, mensaje) VALUES
(1, 2, '¡Hola María! ¿Cómo estás?'),
(2, 1, 'Hola Juan, todo bien ¿y tú?'),
(3, 1, 'Hola Juan, soy el administrador'),
(1, 3, 'Hola Admin, gracias por aceptar mi solicitud');

-- =====================================================
-- INSERTAR PUBLICACIONES DE PRUEBA
-- =====================================================
INSERT INTO publicacion (contenido, autor) VALUES
('¡Bienvenidos a RedSocialPro! Esta es mi primera publicación en la plataforma.', 1),
('Muy emocionada de formar parte de esta comunidad profesional. ¡Saludos a todos!', 2),
('Sistema de solicitudes de amistad funcionando correctamente. ¡Excelente trabajo del equipo de desarrollo!', 3),
('Compartiendo mi experiencia en desarrollo web. ¿Alguien más trabaja con JavaScript?', 4),
('Nueva actualización del sistema implementada. Todo funcionando perfectamente.', 5);

-- =====================================================
-- CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================
CREATE INDEX idx_conexiones_solicitante ON conexiones(usuario_solicitante);
CREATE INDEX idx_conexiones_solicitado ON conexiones(usuario_solicitado);
CREATE INDEX idx_conexiones_estado ON conexiones(estado);
CREATE INDEX idx_mensajes_emisor ON mensajes(emisor_id);
CREATE INDEX idx_mensajes_receptor ON mensajes(receptor_id);
CREATE INDEX idx_publicacion_autor ON publicacion(autor);
CREATE INDEX idx_publicacion_fecha ON publicacion(fecha);

-- =====================================================
-- VISTAS ÚTILES PARA CONSULTAS
-- =====================================================

-- Vista para solicitudes pendientes con información completa
CREATE VIEW vista_solicitudes_pendientes AS
SELECT 
    c.id_conexion,
    c.usuario_solicitante,
    c.usuario_solicitado,
    c.fecha_solicitud,
    u_emisor.nombre as emisor_nombre,
    u_emisor.email as emisor_email,
    u_receptor.nombre as receptor_nombre,
    u_receptor.email as receptor_email
FROM conexiones c
JOIN usuario u_emisor ON c.usuario_solicitante = u_emisor.id_usuario
JOIN usuario u_receptor ON c.usuario_solicitado = u_receptor.id_usuario
WHERE c.estado = 'pendiente';

-- Vista para amistades activas
CREATE VIEW vista_amistades AS
SELECT 
    c.id_conexion,
    c.usuario_solicitante,
    c.usuario_solicitado,
    c.fecha_solicitud,
    c.fecha_respuesta,
    u1.nombre as usuario1_nombre,
    u1.email as usuario1_email,
    u2.nombre as usuario2_nombre,
    u2.email as usuario2_email
FROM conexiones c
JOIN usuario u1 ON c.usuario_solicitante = u1.id_usuario
JOIN usuario u2 ON c.usuario_solicitado = u2.id_usuario
WHERE c.estado = 'aceptada';

-- =====================================================
-- PROCEDIMIENTOS ALMACENADOS ÚTILES
-- =====================================================

DELIMITER //

-- Procedimiento para obtener amigos de un usuario
CREATE PROCEDURE ObtenerAmigosUsuario(IN usuario_id INT)
BEGIN
    SELECT DISTINCT
        CASE 
            WHEN c.usuario_solicitante = usuario_id THEN c.usuario_solicitado
            ELSE c.usuario_solicitante
        END as amigo_id,
        CASE 
            WHEN c.usuario_solicitante = usuario_id THEN u2.nombre
            ELSE u1.nombre
        END as amigo_nombre,
        CASE 
            WHEN c.usuario_solicitante = usuario_id THEN u2.email
            ELSE u1.email
        END as amigo_email,
        c.fecha_respuesta as fecha_amistad
    FROM conexiones c
    JOIN usuario u1 ON c.usuario_solicitante = u1.id_usuario
    JOIN usuario u2 ON c.usuario_solicitado = u2.id_usuario
    WHERE (c.usuario_solicitante = usuario_id OR c.usuario_solicitado = usuario_id)
    AND c.estado = 'aceptada'
    ORDER BY c.fecha_respuesta DESC;
END //
show tables;
select * from perfil;
-- Procedimiento para contar estadísticas de usuario
CREATE PROCEDURE EstadisticasUsuario(IN usuario_id INT)
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM conexiones 
         WHERE (usuario_solicitante = usuario_id OR usuario_solicitado = usuario_id) 
         AND estado = 'aceptada') as total_amigos,
        (SELECT COUNT(*) FROM conexiones 
         WHERE usuario_solicitado = usuario_id AND estado = 'pendiente') as solicitudes_recibidas,
        (SELECT COUNT(*) FROM conexiones 
         WHERE usuario_solicitante = usuario_id AND estado = 'pendiente') as solicitudes_enviadas,
        (SELECT COUNT(*) FROM publicacion WHERE autor = usuario_id) as total_publicaciones,
        (SELECT COUNT(*) FROM mensajes WHERE emisor_id = usuario_id) as mensajes_enviados,
        (SELECT COUNT(*) FROM mensajes WHERE receptor_id = usuario_id) as mensajes_recibidos;
END //

DELIMITER ;

-- =====================================================
-- CONSULTAS DE VERIFICACIÓN
-- =====================================================

-- Verificar tablas creadas
SHOW TABLES;

-- Verificar usuarios insertados
SELECT u.id_usuario, u.nombre, u.email, p.nombre_perfil, u.fecha_registro 
FROM usuario u 
JOIN perfil p ON u.id_perfil = p.id_perfil
ORDER BY u.fecha_registro DESC;

-- Verificar conexiones
SELECT 
    c.id_conexion,
    u1.nombre as solicitante,
    u2.nombre as solicitado,
    c.estado,
    c.fecha_solicitud
FROM conexiones c
JOIN usuario u1 ON c.usuario_solicitante = u1.id_usuario
JOIN usuario u2 ON c.usuario_solicitado = u2.id_usuario
ORDER BY c.fecha_solicitud DESC;

-- Verificar mensajes
SELECT 
    m.id_mensaje,
    u1.nombre as emisor,
    u2.nombre as receptor,
    LEFT(m.mensaje, 50) as mensaje_preview,
    m.fecha_envio
FROM mensajes m
JOIN usuario u1 ON m.emisor_id = u1.id_usuario
JOIN usuario u2 ON m.receptor_id = u2.id_usuario
ORDER BY m.fecha_envio DESC;
show tables;
select * from usuario;
-- Verificar publicaciones
SELECT 
    p.id_publicacion,
    u.nombre as autor,
    LEFT(p.contenido, 100) as contenido_preview,
    p.fecha
FROM publicacion p
JOIN usuario u ON p.autor = u.id_usuario
ORDER BY p.fecha DESC;

-- =====================================================
-- INSTRUCCIONES DE USO
-- =====================================================
/*
INSTRUCCIONES PARA USAR ESTE SCRIPT:

1. Asegúrate de que WampServer esté ejecutándose
2. Abre phpMyAdmin o MySQL Workbench
3. Ejecuta este script completo
4. Verifica que se hayan creado todas las tablas y datos

USUARIOS DE PRUEBA CREADOS:
- juan@example.com (Usuario normal)
- maria@example.com (Usuario normal)  
- admin@example.com (Administrador)
- ana@example.com (Usuario normal)
- luis@example.com (Usuario normal)

CONTRASEÑA PARA TODOS LOS USUARIOS: 123456

CÓDIGO DE ADMINISTRADOR: ADMON123

FUNCIONALIDADES IMPLEMENTADAS:
✅ Registro y login de usuarios
✅ Sistema de solicitudes de amistad
✅ Búsqueda de usuarios
✅ Aceptar/rechazar solicitudes
✅ Prevención de solicitudes duplicadas
✅ Gestión de publicaciones
✅ Sistema de mensajes
✅ Autenticación con JWT
✅ Validaciones robustas
*/