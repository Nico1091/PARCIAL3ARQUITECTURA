create database Programa1;
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