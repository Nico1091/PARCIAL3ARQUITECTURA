# Crear y usar la base de datos
DROP DATABASE IF EXISTS Programa1;
CREATE DATABASE Programa1;
USE Programa1;

# Tabla de perfiles de usuario
CREATE TABLE perfil (
    id_perfil INT PRIMARY KEY,
    nombre_perfil VARCHAR(50)
);

# Insertar tipos de perfiles
INSERT INTO perfil (id_perfil, nombre_perfil) VALUES
(1, 'usuario'),
(2, 'administrador');

# Tabla de usuarios
CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    id_perfil INT NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_perfil) REFERENCES perfil(id_perfil)
);

# Tabla de mensajes
CREATE TABLE mensajes (
    id_mensaje INT PRIMARY KEY AUTO_INCREMENT,
    emisor_id INT NOT NULL,
    receptor_id INT NOT NULL,
    mensaje TEXT NOT NULL,
    fecha_envio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    leido BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (emisor_id) REFERENCES usuario(id_usuario),
    FOREIGN KEY (receptor_id) REFERENCES usuario(id_usuario)
);

# Tabla de conexiones/amistades
CREATE TABLE conexiones (
    id_conexion INT PRIMARY KEY AUTO_INCREMENT,
    usuario_solicitante INT NOT NULL,
    usuario_solicitado INT NOT NULL,
    estado ENUM('pendiente', 'aceptada', 'rechazada') DEFAULT 'pendiente',
    fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_respuesta DATETIME DEFAULT NULL,
    FOREIGN KEY (usuario_solicitante) REFERENCES usuario(id_usuario),
    FOREIGN KEY (usuario_solicitado) REFERENCES usuario(id_usuario)
);

# Insertar usuarios de prueba (contraseña: 123456)
INSERT INTO usuario (nombre, email, contrasena, id_perfil) VALUES
('Juan Pérez', 'juan@example.com', '$2b$10$YourHashedPasswordHere', 1),
('María García', 'maria@example.com', '$2b$10$YourHashedPasswordHere', 1),
('Admin', 'admin@example.com', '$2b$10$YourHashedPasswordHere', 2),
('Ana López', 'ana@example.com', '$2b$10$YourHashedPasswordHere', 1),
('Carlos Ruiz', 'carlos@example.com', '$2b$10$YourHashedPasswordHere', 1);

# Crear algunas conexiones de prueba
INSERT INTO conexiones (usuario_solicitante, usuario_solicitado, estado, fecha_respuesta) VALUES
(1, 2, 'aceptada', NOW()),
(1, 4, 'pendiente', NULL),
(3, 1, 'aceptada', NOW()),
(5, 2, 'pendiente', NULL);

# Crear algunos mensajes de prueba
INSERT INTO mensajes (emisor_id, receptor_id, mensaje) VALUES
(1, 2, '¡Hola María! ¿Cómo estás?'),
(2, 1, 'Hola Juan, todo bien ¿y tú?'),
(3, 1, 'Hola Juan, soy el administrador'),
(1, 3, 'Hola Admin, gracias por aceptar mi solicitud');

#Comando utilizado para crear la tabla 
use programa1;
#comando utilizado para usar la base de datos
#ESTOS SON LOS COMANDOS DE LA BASE DE DATOS
create database programa1;
#Crea la base de datos con el nombre programa1
#Primera tabla
CREATE TABLE usuario (
#Tabla llamada usuario
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
#id_usuario es la primera variable que esta en entero y es auto incremental ademas de ser la llave primaria
    nombre TEXT,
#Nombre es una variable para el nombre del usuario de tipo texto
    email TEXT DEFAULT NULL,
#email es una variable para asignar el correo de la persona en tipo texto por defecto en vacio
    contrasena TEXT DEFAULT NULL,
#contrasena es una variable para almacenar la contraseña del registro de usuario tipo texto por defecto en null
    id_perfil int,
#id_perfil es una variable para asignar su el usuario es administrador o no:
#1: usuario niveles normales
#2: Usuario niveles de administrador
    publicaciones longblob,
#Publicaciones es una variable asignada para almacenar publicaciones de variable longblob es decir que almacena pdfs excel y demas 
#Maximo tamaño: 10 MB
    conexiones Longblob,
#Conexiones hasta ahora no tiene utilidad alguna pero quien subio el archivo hizo esta variable aun asi es lonngblob por tanto:
#almacena pdfs excel y demas con maximo tamaño de 10 MB
    foreign  key (id_perfil) references perfil(id_perfil)
#importamos la tabla perfil mediante foreign key 
);
select * from usuario;	

set sql_safe_updates=0;
# En caso de que usted tenga problema que no le permita actualizar mediante Update  ya que tiene actualizacion segura usted debe  de usar esta sentencia

CREATE TABLE perfil (
#Tabla perfil es creada con el fin almacenar los datos del perfil del usuario incluyendo si este es o no un administrador
    id_perfil INT AUTO_INCREMENT PRIMARY KEY,
    #Id perfil entero autoincremetal clave primaria que define si el perfil es de un usuario administrador o usuario normla
    experiencia TEXT DEFAULT NULL,
    #experiencia de tipo texto sirve para escribir lo que el usuario tiene como experiencia
    educacion TEXT DEFAULT NULL,
    #educacion  tipo texto sirve que el usuario escriba la educacion que ha tenido
    habilidades TEXT DEFAULT NULL,
    #habilidades tipo texto sirve para que el usuario describa sus habilidades por defecto esta en vacio
    resumen TEXT DEFAULT NULL,
    #resumen tipo texto por defecto en vacio sirve para que el usuario haga un resumen de su pensamiento sociocritico 
    # o de lo que quiera reflejar a las empresas para las que quiere trabajar
    foto MEDIUMBLOB DEFAULT NULL,
    #Foto de tipo mediumblob sirve para almacenar datos de tipo binario de archivo puedo almacenar alli cualquier archivo que se requiera 
    id_postulacion INT,
    #id_postulacionn sirve para almacenar el numero de postulacion que ha solicitado deberia ser para un orden asignado
    id_mensaje int,
    #id_mensaje sirve para almacenar los ids de los mensajes que se realicen 
    id_oportunidad int,
    #id_oportunidad sirve para almacenar los id de la oportunidad de trabajo 
    #y mostrarle al usuario cuales son las oportunidades de trabajo que este tiene
    id_publicacion int,
    #id_publicacion sirve para traer el numero de publicacionn y permitirle verla al usuario mediante consulta
    FOREIGN KEY (id_publicacion) REFERENCES publicacion(id_publicacion),
    #sirve para hacer referencia a la tabla publicacion
    FOREIGN KEY (id_oportunidad) REFERENCES oportunidad(id_oportunidad),
    #sirve para hacer referencia a la tabla oportunidad
    FOREIGN KEY (id_postulacion) REFERENCES postulacion(id_postulacion),
    #sirve para hacer referencia a la tabla postulacion
    FOREIGN KEY (id_mensaje) REFERENCES mensaje(id_mensaje)
    #sirve para hacer referencia a la tabla mensaje
);
create table postulacion (
#Tabla postulacion
id_postulacion int primary key,
#id_postulacion tipo entero y clave primaria sirve para tener el numero de postulacion en orden asignado
id_oportunidad int,
#oportunidad  tipo texto por defecto vacio sirve para mostrar el tipo de oportunidad que tiene el usuario
curriculum longblob default null,
#curriculum tipo longblob sirve para meter archivos binarios posiblemente extension .pdf para hojas de vida 
carta_presentacion longblob,
#carta_presentacion tipo longblob sirve para meter archivos binarios posiblemente extension .pdf para expedir una carta de presentacion 
#a la empresa
foreign key (id_oportunidad) references oportunidad(id_oportunidad)
#Sirve para hacer referencia a la tabla oportunidad
);


CREATE TABLE Mensaje(
#Tabla Mensaje sirve para escribir los mensajes al usuario y que este lo pueda almacenar
    idMensaje INT PRIMARY KEY AUTO_INCREMENT,
    #idMensaje tipo entero clave primaria sirve para identificar el numero de mensaje
    remitente INT,
    #remintente de tipo entero almacena el id del perfil del que fue enviado el mensaje 
    destinatario INT,
    #destinatario de tipo entero sirve almacena el id ddel perfil del que fue recibido el mensaje
    contenido LONGBLOB DEFAULT NULL,
    #contenido de tipo longblob almacena archivos binarios de extensionn enn este caso puede almacenar fotos y videos por debajo de 4 MB
    fecha_envio DATETIME DEFAULT current_timestamp,
    #fecha_envio de tipo fecha tiempo almacena la fecha actual por defecto para saber justamente en el momento en el que fue enviado el mensaje
    Foreign key (remitente) references perfil(id_perfil),
    #referencia al id de la tabla perfil como remitente
    Foreign key (destinatario) references perfil(id_perfil)
    #referencia al ide de la tabla perfil como destinatario
);


create table publicacion (
#tabla publicacion sirve para almacenar la publicacion del usuario
id_publicacion int primary key,
#id_publicacion almacena el numero de publicacionn hecha en el sistema como usuario
contenido	text,
#contenido almacena el contenido de tipo texto para que el usuario pueda escribir sus publicacion
fecha datetime default current_timestamp,
#fecha de tipo fecha tiempo almacena la fecha actual y sirve para que el usuario pueda saber la fecha de la publicacion
archivos longblob default null,
#archivo de tipo longblob sirve para que el usuario pueda meter archivos a su publicacionn
autor int,
#autor sirve para saber el id del autor de de la publicacion
foreign key (autor) references perfil(id_perfil)
#referencia a el id de la tabla perfil
);


create table oportunidad (
#oportunidad sirve para almacenar las oportunidades de trabajo hasta el momento la tabla no se me hace tan util ya que existe una tabla publicacion
#sin embargo asi lo dicto la persona que documentó antes para entregarnos el trabajo
id_oportunidad int auto_increment primary key,
#id_oportunidad autoincremental clave primaria sirve para ver el numero de la oportunidad que se publicó
titulo text,
#titulo variable de texto almacena el titulo de la oportunidad de trabajo
descripcion text,
#descripcion tipo texto almacenna la descripcion del trabajo ofrecido
ubicacion text,
#ubicacion tipo texto almacena la ubicacion de donde se va a trabajar(Se requieren ubicaciones precisas)
industria text
#industria tipo texto almacena el nombre de la industria que ofrece el trabajo
);

#SI DESEA SABER LOS NOMBRES DE LAS TABLAS EJECUTE EL COMANDO:
show tables;
#SI DESEA CONSULTAR UNA TABLA ESPECIFICA EJECUTE EL COMANDO:
select * from oportunidad;
select * from perfil;
select * from postulacion;
select * from publicacion;
select * from usuario;

#NOMBRES DE LOS INTEGRANTES DEL GRUPO
#NICOLAS ANGEL ROJAS YAÑEZ
#ESCRIBA AQUI SU NOMBRE
#ESCRIBA AQUI SU NOMBRE
#ESCRIBA AQUI SU NOMBRE

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS mensajes (
    id_mensaje INT PRIMARY KEY AUTO_INCREMENT,
    emisor_id INT NOT NULL,
    receptor_id INT NOT NULL,
    mensaje TEXT NOT NULL,
    fecha_envio DATETIME NOT NULL,
    leido BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (emisor_id) REFERENCES usuario(id_usuario),
    FOREIGN KEY (receptor_id) REFERENCES usuario(id_usuario)
);

-- Tabla de conexiones/amistades
CREATE TABLE IF NOT EXISTS conexiones (
    id_conexion INT PRIMARY KEY AUTO_INCREMENT,
    usuario_solicitante INT NOT NULL,
    usuario_solicitado INT NOT NULL,
    estado ENUM('pendiente', 'aceptada', 'rechazada') DEFAULT 'pendiente',
    fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_respuesta DATETIME DEFAULT NULL,
    FOREIGN KEY (usuario_solicitante) REFERENCES usuario(id_usuario),
    FOREIGN KEY (usuario_solicitado) REFERENCES usuario(id_usuario)
);

# Alteraciones para actualizar la estructura de la base de datos
USE programa1;

# Modificar la tabla usuario
ALTER TABLE usuario
MODIFY COLUMN nombre VARCHAR(100) NOT NULL,
MODIFY COLUMN email VARCHAR(100) NOT NULL UNIQUE,
MODIFY COLUMN contrasena VARCHAR(255) NOT NULL,
ADD COLUMN fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP;

# Crear tabla de mensajes si no existe
CREATE TABLE IF NOT EXISTS mensajes (
    id_mensaje INT PRIMARY KEY AUTO_INCREMENT,
    emisor_id INT NOT NULL,
    receptor_id INT NOT NULL,
    mensaje TEXT NOT NULL,
    fecha_envio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    leido BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (emisor_id) REFERENCES usuario(id_usuario),
    FOREIGN KEY (receptor_id) REFERENCES usuario(id_usuario)
);

# Crear tabla de conexiones si no existe
CREATE TABLE IF NOT EXISTS conexiones (
    id_conexion INT PRIMARY KEY AUTO_INCREMENT,
    usuario_solicitante INT NOT NULL,
    usuario_solicitado INT NOT NULL,
    estado ENUM('pendiente', 'aceptada', 'rechazada') DEFAULT 'pendiente',
    fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_respuesta DATETIME DEFAULT NULL,
    FOREIGN KEY (usuario_solicitante) REFERENCES usuario(id_usuario),
    FOREIGN KEY (usuario_solicitado) REFERENCES usuario(id_usuario)
);

# Insertar perfiles si no existen
INSERT IGNORE INTO perfil (id_perfil, nombre_perfil) VALUES
(1, 'usuario'),
(2, 'administrador');

# Actualizar las columnas BLOB a tipos más específicos
ALTER TABLE usuario
DROP COLUMN publicaciones,
DROP COLUMN conexiones;

# Actualizar la tabla perfil
ALTER TABLE perfil
MODIFY COLUMN experiencia TEXT,
MODIFY COLUMN educacion TEXT,
MODIFY COLUMN habilidades TEXT,
MODIFY COLUMN resumen TEXT,
MODIFY COLUMN foto MEDIUMBLOB;

# Eliminar las restricciones de clave foránea antiguas si existen
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE perfil
DROP FOREIGN KEY IF EXISTS perfil_ibfk_1,
DROP FOREIGN KEY IF EXISTS perfil_ibfk_2,
DROP FOREIGN KEY IF EXISTS perfil_ibfk_3,
DROP FOREIGN KEY IF EXISTS perfil_ibfk_4;

ALTER TABLE perfil
DROP COLUMN id_postulacion,
DROP COLUMN id_mensaje,
DROP COLUMN id_oportunidad,
DROP COLUMN id_publicacion;

SET FOREIGN_KEY_CHECKS = 1;

# Crear índices para mejorar el rendimiento
CREATE INDEX idx_usuario_nombre ON usuario(nombre);
CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_conexiones_usuarios ON conexiones(usuario_solicitante, usuario_solicitado);
CREATE INDEX idx_mensajes_usuarios ON mensajes(emisor_id, receptor_id);
CREATE INDEX idx_conexiones_estado ON conexiones(estado);

# Actualizar los usuarios existentes si es necesario
UPDATE usuario SET id_perfil = 1 WHERE id_perfil IS NULL;

# Verificar y corregir la secuencia de auto_increment
ALTER TABLE usuario AUTO_INCREMENT = 1;
ALTER TABLE mensajes AUTO_INCREMENT = 1;
ALTER TABLE conexiones AUTO_INCREMENT = 1;