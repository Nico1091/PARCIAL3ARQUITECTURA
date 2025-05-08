/*
*****************************************************POR FAVOR DEJE COMENTADO EL PROGRAMA Y CADA PARTE FINALIZADA ************************************************************
*/
const express = require('express');
//Recibir peticiones CRUD   y enviar respuestas en formato de extension de datos por ejemplo JSON
const cors = require('cors');
//libreria para puertos
const bcrypt = require('bcrypt');
//Libreria que utilizamos para encriptar las claves del usuario y asi tener un minimo protocolo de seguridad
const connection = require('./database');
//llama al archivo database.js para conexion
const app = express();
//app es el componente que almacena las solicitudes de la base de datos por tanto se considera una variable puente entre los datos almacenados y lo programado
 //usamos el express para hacer peticiones a la base de datos
const port = 3000; 
//puerto en el que se ejecuta el servidor 

// Configuración
app.use(cors());
app.use(express.json());

// Código para registro de administracion
const Codigo_administraacion = 'ADMON123';

// Middleware para verificar administracion
    function isAdmin(req, res, next) { 
         //Parametrizamos los datos que requerimos para verificacion y next para continuar
    if (req.user && req.user.id_perfil === 2) {
        //Si el usuario esta en estado 2=administrador podemos continuar
        return next();
    }
    return res.status(403).json({ message: 'Acceso no autorizado' });
    //si los parametros salen del condicional muestra al usuario que no esta autoorizado a ingresar
}

// Envio de datos
app.post('/registro', async (req, res) => {
    // post para envio y recibimiento de datos en este caso mediante async para sincronizar request y response
    const { nombre, email, contrasena, id_perfil, adminCode } = req.body; 
    //agarra algunos de los datos del usuario que estan en la base de datos de la tabla usuario mas el codigo de administrador

    // Validaciones básicas
    if (!nombre || !email || !contrasena || !id_perfil) { 
        // Comprobacion de que los datos si estan registrados por el usuario
        return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    // Validación especial para administrador
    if (id_perfil === 2) {    //verifica que el usuario este en estado 2 o administrador
        if (adminCode !== Codigo_administraacion) { 
            //Verfica que el codigo sea el correspondiente a administracion
            return res.status(403).json({ 
                  //retorna el estado 403 problemas de autenticacion por rango lo traduce en formato json a Codigo incorrecto
                message: 'Código de administrador incorrecto' 
            });
        }
    }

    try {
        //                                                                      VERIFICACION DE ERRORRES
        // Verificar si el email ya existe
        const ConsultaEmail = 'SELECT * FROM usuario WHERE email = ?';
        //hace la consulta a la base de datos sobre el email
        connection.query(ConsultaEmail, [email], async (error, resultados) => {
            //hace consulta con la conexion de la base de datos  email en este caso es un array ? para consulta de la base de datos
        //  parametriza el objetor error y resultados 
            if (error) {
                // condicional de error
                console.error('Error al verificar email:', error);
                //mostrar en la consola que no se pudo verificar el email + parametro error
                return res.status(500).json({ message: 'Error en el servidor' });
            }

            if (resultados.length > 0) {
                //revisa si en el array esta o no el dato que se intenta insertar
                //comprueba si el email ya existe o no
                return res.status(400).json({ message: 'El email ya está registrado' });
            }

            // Encriptar contraseña
            const var_hashercontrasena = await bcrypt.hash(contrasena, 10);
            // Variable constante parametrizadora de la contraseña hasheandola en este caso nivel 10
            // Insertar usuario
            const Consultainsertar = 'INSERT INTO usuario (nombre, email, contrasena, id_perfil) VALUES (?, ?, ?, ?)'; 
            // Inserta los datos del usuario entre ellos su contraseña
            connection.query(Consultainsertar, [nombre, email, var_hashercontrasena, id_perfil], (err, results) => {
                // consulta de conexion a la base de datos verificando variables  
                if (err) {
                    //encapsula el error para registro de usuario
                    //si sucede un error muestra el mensaje
                    console.error('Error al registrar usuario:', err);
                    return res.status(500).json({
                        // mostrar error al usuario  500: significa un error generico  cuando no se pudo determinar el fallo
                        message: 'Error al registrar el usuario',
                        error: err.sqlMessage || err.message
                        //Almacena  si el error Sucedio en la base de datos o en server.js
                    });
                }
                
                // Obtener datos del usuario recién creado sin la contraseña
                const Consultatraerusuario = 'SELECT id, nombre, email, id_perfil FROM usuario WHERE id = ?';
                connection.query(Consultatraerusuario, [results.insertId], (err, userResults) => {
                //realiza la conexion a la base de datos con la consulta almacenada mas la consulta de results.insertid=(id=?)
                    if (err || userResults.length === 0) {
                        //Comprueba en la base de datos si no ocurrio ningun error y si no devolvio ningun resultado
                        return res.status(201).json({ message: 'Usuario registrado exitosamente' });
                    }
                    res.status(201).json({
                        //establece el estado de HTTP aa 201 para formato creado informa al usuario de que se creo mediante este estado traduciendolo a JSON
                        message: 'Usuario registrado exitosamente',
                        usuario: userResults[0] 
                        //concatena los dtos del usuario y recorre a el nivel del id o la primera variable 
                    });
                });
            });
        });
    } catch (error) {
        //encapsula el error en la variable error
        console.error('Error en el servidor:', error);
        //muestra a la  consola el error
        res.status(500).json({ message: 'Error en el servidor' });
        //responde en estado 500 es decir en error inesperado con mensaje error en el servidor
    }
});

// Ruta para login
app.post('/login', async (req, res) => {
    //sincroniza  la informacion de la base de datos y la forma de responder del programa
    const { usuario, password, id_perfil } = req.body;
    //crea como constante porque son datos que no cambian ya que estan registrados en una base de datos y los mete al pedido de la base de datos
    if (!usuario || !password) {
        //si usuario o contraseña esta vacio muestra lo que esta adentro del condicionnal if
        return res.status(400).json({ message: 'Debe ingresar nombre/email y contraseña' });
        //retorna en respuesta al protocolo que la respuesta es incorrecta o no se puede procesar error 400 lo pasa a formato JSON y le dice al cliente que debe rellenar el campo vacio
    }

    try {
        //intentar
        const query = 'SELECT * FROM usuario WHERE (email = ? OR nombre = ?) AND id_perfil = ?';
        //hace la consultaa por email o nombre y id_perfil variables de la tabla Usuario
        connection.query(query, [usuario, usuario, id_perfil], async (err, results) => {
            //consultas de conexion  con la base de datos las probabilidades para el campo de usuario y sincroniza entre la variable error y resultados
            if (err) {
                //error 
                console.error('Error en la consulta:', err);
                //imprime el error avisando que es error a la consola
                return res.status(500).json({
                    //si no puede responder pasa el error a estado 500 y l traduce a json lo muestra al usuario como error en el servidor
                    message: 'Error en el servidor',
                    error: err.sqlMessage || err.message
                    //Almacena si el error sucedio en la base de datos o en server.js 
                });
            }

            if (results.length === 0) {
                //si al ingresar la consulta muestra 0 o no aparece dentro de la base de datos sucede el condicionnal
                return res.status(404).json({ 
                    //retorna el error 404 no encontrado o no existe encapsula el error de que no hay o no existen registros
                    message: id_perfil === 2 ?     
                    //este mensaje se aclara que es para el campo de id_perfil=2 lo que quiere decir que es un perfil de administrador
                        'Administrador no encontrado o credenciales incorrectas' : 
                        'Usuario no encontrado' 
                        //Muestra mensajes para el problema
                });
            }

            const usuarioDB = results[0];
            //almacena en la consulta olos resultados y revisar el campo id de la tabla perfil
            // Verificar contraseña
            const passwordMatch = await bcrypt.compare(password, usuarioDB.contrasena);
            //almacena una comparacion con la contraseña digitada y hash o  la contraseña ya establecida para revisar si coinciden y permitir el paso al usuario
            if (!passwordMatch) {
                //en caso de que no coincidan las contraseñas condicional if se encargara de enncapsular el error 401: problema de credenciales faltantes/invalidas y le muestra el mensaje al usuario mediante un JSON
                return res.status(401).json({ message: 'Credenciales inválidas' });
            }

            delete usuarioDB.contrasena;
            //Elimina la contraseña del objeto de usuarioDB para evitar mostrarla como respuesta en el JSON al cliente

            res.json({
                //responde al usuario con el JSON como inicio exitoso ademas de almacenar el objeto de USUARIODB en usuario
                message: 'Inicio de sesión exitoso',
                usuario: usuarioDB
            });
        });
    } catch (error) {
        //encapsulaa el error al objeto error 
        console.error('Error en el servidor:', error);
        //mediante la consola informa de que ha sucedido un error 
        res.status(500).json({ message: 'Error en el servidor' });
        //responde con el estado de error 500: cuando no se sabe que sucedio o no supo encapsular el desarrollador  mostrandole al usuario por el protcolo JSON de que sucedio un error en el servidor
    }
});

// Ruta de ejemplo solo para admin
app.get('/admin/dashboard', isAdmin, (req, res) => {
    //manda traer el app al panel de administracion, revisa si es administrador mediante la funcion establecida y parametriza los datos a enviar y la forma de responder 
    res.json({ 
        //responde mediente JSON como: bienvenido al panel de administracion 
        message: 'Bienvenido al panel de administración',
        usuario: req.user 
        //almacena los datos de usuario en la variable usuario 
    });
});

// Iniciar servidor
app.listen(port, () => {
    //manda la aplicacion a escucharse en el puerto correspondiente enviar 
    console.log(`Servidor escuchando en el puerto ${port}`);
    //se resume a que le muestra al programador el puerto en el que se esta ejecutando el programa pero sin el app.listen el app no escucha escucharia el puerto
});