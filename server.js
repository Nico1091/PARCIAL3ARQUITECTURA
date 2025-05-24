/*
*****************************************************POR FAVOR DEJE COMENTADO EL PROGRAMA Y CADA PARTE FINALIZADA ************************************************************
*/
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const connection = require('./database');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;

// Clave secreta para JWT
const JWT_SECRET = 'tu_clave_secreta_muy_segura';

// Middleware global
app.use(cors());
app.use(express.json());

// Middleware para verificar token
const verificarToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Token no proporcionado' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido' });
    }
};

// Código especial para administradores
const Codigo_administraacion = 'ADMON123';

// Middleware para verificar si el usuario es administrador
function isAdmin(req, res, next) {
    if (req.user && req.user.id_perfil === 2) {
        return next();
    }
    return res.status(403).json({ message: 'Acceso no autorizado' });
}

// Ruta para registro de usuarios
app.post('/registro', async (req, res) => {
    const { nombre, email, contrasena, id_perfil, adminCode } = req.body;

    if (!nombre || !email || !contrasena || !id_perfil) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    if (id_perfil === 2 && adminCode !== Codigo_administraacion) {
        return res.status(403).json({ message: 'Código de administrador incorrecto' });
    }

    try {
        const ConsultaEmail = 'SELECT * FROM usuario WHERE email = ?';
        connection.query(ConsultaEmail, [email], async (error, resultados) => {
            if (error) {
                console.error('Error al verificar email:', error);
                return res.status(500).json({ message: 'Error en el servidor' });
            }

            if (resultados.length > 0) {
                return res.status(400).json({ message: 'El email ya está registrado' });
            }

            const var_hashercontrasena = await bcrypt.hash(contrasena, 10);
            const Consultainsertar = 'INSERT INTO usuario (nombre, email, contrasena, id_perfil) VALUES (?, ?, ?, ?)';
            connection.query(Consultainsertar, [nombre, email, var_hashercontrasena, id_perfil], (err, results) => {
                if (err) {
                    console.error('Error al registrar usuario:', err);
                    return res.status(500).json({
                        message: 'Error al registrar el usuario',
                        error: err.sqlMessage || err.message
                    });
                }

                const Consultatraerusuario = 'SELECT id, nombre, email, id_perfil FROM usuario WHERE id = ?';
                connection.query(Consultatraerusuario, [results.insertId], (err, userResults) => {
                    if (err || userResults.length === 0) {
                        return res.status(201).json({ message: 'Usuario registrado exitosamente' });
                    }
                    res.status(201).json({
                        message: 'Usuario registrado exitosamente',
                        usuario: userResults[0]
                    });
                });
            });
        });
    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Ruta para login de usuarios
app.post('/login', async (req, res) => {
    const { usuario, password, id_perfil } = req.body;

    if (!usuario || !password) {
        return res.status(400).json({ message: 'Debe ingresar nombre/email y contraseña' });
    }

    try {
        // Primero buscamos el usuario sin JOIN para evitar problemas con el perfil
        const query = 'SELECT * FROM usuario WHERE (email = ? OR nombre = ?) AND id_perfil = ?';
        connection.query(query, [usuario, usuario, id_perfil], async (err, results) => {
            if (err) {
                console.error('Error en la consulta:', err);
                return res.status(500).json({
                    message: 'Error en el servidor',
                    error: err.sqlMessage || err.message
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    message: id_perfil === 2 ? 'Administrador no encontrado o credenciales incorrectas' : 'Usuario no encontrado'
                });
            }

            const usuarioDB = results[0];
            
            try {
                const passwordMatch = await bcrypt.compare(password, usuarioDB.contrasena);
                if (!passwordMatch) {
                    return res.status(401).json({ message: 'Credenciales inválidas' });
                }

                // Generar token JWT con el id_usuario
                const token = jwt.sign(
                    { 
                        id: usuarioDB.id_usuario,
                        nombre: usuarioDB.nombre,
                        email: usuarioDB.email,
                        id_perfil: usuarioDB.id_perfil,
                        timestamp: Date.now() // Agregamos timestamp para hacer el token único
                    },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                // Crear un objeto de usuario sin la contraseña
                const usuarioResponse = {
                    id_usuario: usuarioDB.id_usuario,
                    nombre: usuarioDB.nombre,
                    email: usuarioDB.email,
                    id_perfil: usuarioDB.id_perfil
                };

                // Establecer headers de caché para evitar problemas
                res.set({
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                });

                res.json({
                    message: 'Inicio de sesión exitoso',
                    usuario: usuarioResponse,
                    token
                });
            } catch (bcryptError) {
                console.error('Error al verificar contraseña:', bcryptError);
                return res.status(500).json({ message: 'Error al verificar credenciales' });
            }
        });
    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Configuración de directorio para archivos
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Configuración de multer para archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Ruta para publicar contenido con archivo
app.post('/publicar', verificarToken, upload.single('archivo'), (req, res) => {
    const { contenido } = req.body;
    const archivo = req.file;

    if (!contenido?.trim()) {
        return res.status(400).json({ error: 'El contenido es obligatorio' });
    }

    // Primero verificamos si el usuario tiene un perfil
    const checkPerfilQuery = 'SELECT id_perfil FROM perfil WHERE id_perfil = ?';
    connection.query(checkPerfilQuery, [req.usuario.id], (err, perfilResults) => {
        if (err) {
            console.error('Error al verificar perfil:', err);
            return res.status(500).json({ error: 'Error de base de datos' });
        }

        // Si no existe el perfil, lo creamos
        if (perfilResults.length === 0) {
            const createPerfilQuery = 'INSERT INTO perfil (id_perfil) VALUES (?)';
            connection.query(createPerfilQuery, [req.usuario.id], (err, createResults) => {
                if (err) {
                    console.error('Error al crear perfil:', err);
                    return res.status(500).json({ error: 'Error al crear perfil' });
                }
                insertarPublicacion();
            });
        } else {
            insertarPublicacion();
        }
    });

    function insertarPublicacion() {
        let blob = null;
        if (archivo) {
            const fullPath = archivo.path;
            blob = fs.readFileSync(fullPath);
        }

        const sql = 'INSERT INTO publicacion (contenido, archivos, autor, fecha) VALUES (?, ?, ?, NOW())';
        connection.query(sql, [contenido.trim(), blob, req.usuario.id], (err, result) => {
            if (err) {
                console.error('Error al guardar publicación:', err);
                return res.status(500).json({ error: 'Error de base de datos' });
            }
            res.status(201).json({
                message: 'Publicación guardada',
                id_publicacion: result.insertId,
                autor: req.usuario.id
            });
        });
    }
});

// Ruta protegida solo para administradores
app.get('/admin/dashboard', isAdmin, (req, res) => {
    res.json({
        message: 'Bienvenido al panel de administración',
        usuario: req.user
    });
});

// Ruta para verificar token
app.get('/verificar-token', verificarToken, (req, res) => {
    res.json({ valid: true });
});

// Ruta para cerrar sesión
app.post('/logout', verificarToken, (req, res) => {
    try {
        // Establecer headers de caché para evitar problemas
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        res.json({ 
            message: 'Sesión cerrada exitosamente',
            success: true 
        });
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        res.status(500).json({ message: 'Error al cerrar sesión' });
    }
});

// Función auxiliar para convertir BLOB a base64
function blobToBase64(blob) {
    return blob ? Buffer.from(blob).toString('base64') : null;
}

// Rutas para el perfil
app.get('/perfil/:id', verificarToken, (req, res) => {
    const id_usuario = req.params.id;
    
    // Verificar que el usuario solo pueda ver su propio perfil
    if (req.usuario.id.toString() !== id_usuario) {
        return res.status(403).json({ message: 'No autorizado para ver este perfil' });
    }

    // Consulta principal del perfil
    const sqlPerfil = `
        SELECT p.*, 
               pub.contenido as publicacion_contenido, 
               pub.archivos as publicacion_archivos,
               m.contenido as mensaje_contenido,
               pos.curriculum, 
               pos.carta_presentacion
        FROM perfil p
        LEFT JOIN publicacion pub ON p.id_publicacion = pub.id_publicacion
        LEFT JOIN mensaje m ON p.id_mensaje = m.idMensaje
        LEFT JOIN postulacion pos ON p.id_postulacion = pos.id_postulacion
        WHERE p.id_perfil = ?
    `;

    connection.query(sqlPerfil, [id_usuario], (err, results) => {
        if (err) {
            console.error('Error al obtener perfil:', err);
            return res.status(500).json({ message: 'Error al obtener el perfil' });
        }

        if (results.length === 0) {
            // Si no existe el perfil, devolver uno vacío
            return res.json({
                experiencia: '',
                educacion: '',
                habilidades: '',
                resumen: '',
                foto: null,
                publicaciones: [],
                mensajes: [],
                postulaciones: []
            });
        }

        // Procesar el resultado para convertir BLOBs a base64
        const perfil = results[0];
        const perfilJSON = {
            experiencia: perfil.experiencia || '',
            educacion: perfil.educacion || '',
            habilidades: perfil.habilidades || '',
            resumen: perfil.resumen || '',
            foto: blobToBase64(perfil.foto),
            publicacion: perfil.publicacion_contenido ? {
                contenido: perfil.publicacion_contenido,
                archivos: blobToBase64(perfil.publicacion_archivos)
            } : null,
            mensaje: perfil.mensaje_contenido ? {
                contenido: blobToBase64(perfil.mensaje_contenido)
            } : null,
            postulacion: {
                curriculum: blobToBase64(perfil.curriculum),
                carta_presentacion: blobToBase64(perfil.carta_presentacion)
            }
        };

        res.json(perfilJSON);
    });
});

app.put('/perfil/:id', verificarToken, (req, res) => {
    const id_usuario = req.params.id;
    const { resumen, experiencia, educacion, habilidades } = req.body;

    // Verificar que el usuario solo pueda actualizar su propio perfil
    if (req.usuario.id.toString() !== id_usuario) {
        return res.status(403).json({ message: 'No autorizado para actualizar este perfil' });
    }

    // Primero verificar si existe el perfil
    const checkSql = 'SELECT id_perfil FROM perfil WHERE id_perfil = ?';
    connection.query(checkSql, [id_usuario], (err, results) => {
        if (err) {
            console.error('Error al verificar perfil:', err);
            return res.status(500).json({ message: 'Error al verificar el perfil' });
        }

        if (results.length === 0) {
            // Si no existe, crear nuevo perfil
            const insertSql = 'INSERT INTO perfil (id_perfil, resumen, experiencia, educacion, habilidades) VALUES (?, ?, ?, ?, ?)';
            connection.query(insertSql, [id_usuario, resumen, experiencia, educacion, habilidades], (err) => {
                if (err) {
                    console.error('Error al crear perfil:', err);
                    return res.status(500).json({ message: 'Error al crear el perfil' });
                }
                res.json({ 
                    message: 'Perfil creado exitosamente',
                    perfil: {
                        resumen,
                        experiencia,
                        educacion,
                        habilidades
                    }
                });
            });
        } else {
            // Si existe, actualizar
            const updateSql = 'UPDATE perfil SET resumen = ?, experiencia = ?, educacion = ?, habilidades = ? WHERE id_perfil = ?';
            connection.query(updateSql, [resumen, experiencia, educacion, habilidades, id_usuario], (err) => {
                if (err) {
                    console.error('Error al actualizar perfil:', err);
                    return res.status(500).json({ message: 'Error al actualizar el perfil' });
                }
                res.json({ 
                    message: 'Perfil actualizado exitosamente',
                    perfil: {
                        resumen,
                        experiencia,
                        educacion,
                        habilidades
                    }
                });
            });
        }
    });
});

app.put('/perfil/:id/foto', verificarToken, (req, res) => {
    const id_usuario = req.params.id;
    const { foto } = req.body;

    // Verificar que el usuario solo pueda actualizar su propia foto
    if (req.usuario.id.toString() !== id_usuario) {
        return res.status(403).json({ message: 'No autorizado para actualizar esta foto' });
    }

    // Convertir la cadena base64 a un buffer
    let fotoBuffer;
    try {
        fotoBuffer = Buffer.from(foto, 'base64');
    } catch (error) {
        console.error('Error al procesar la imagen:', error);
        return res.status(400).json({ message: 'Formato de imagen inválido' });
    }

    // Primero verificar si existe el perfil
    const checkSql = 'SELECT id_perfil FROM perfil WHERE id_perfil = ?';
    connection.query(checkSql, [id_usuario], (err, results) => {
        if (err) {
            console.error('Error al verificar perfil:', err);
            return res.status(500).json({ message: 'Error al verificar el perfil' });
        }

        if (results.length === 0) {
            // Si no existe, crear nuevo perfil con la foto
            const insertSql = 'INSERT INTO perfil (id_perfil, foto) VALUES (?, ?)';
            connection.query(insertSql, [id_usuario, fotoBuffer], (err) => {
                if (err) {
                    console.error('Error al crear perfil con foto:', err);
                    return res.status(500).json({ message: 'Error al guardar la foto' });
                }
                res.json({ 
                    message: 'Foto guardada exitosamente',
                    foto: foto // Devolvemos la foto en base64
                });
            });
        } else {
            // Si existe, actualizar la foto
            const updateSql = 'UPDATE perfil SET foto = ? WHERE id_perfil = ?';
            connection.query(updateSql, [fotoBuffer, id_usuario], (err) => {
                if (err) {
                    console.error('Error al actualizar foto:', err);
                    return res.status(500).json({ message: 'Error al actualizar la foto' });
                }
                res.json({ 
                    message: 'Foto actualizada exitosamente',
                    foto: foto // Devolvemos la foto en base64
                });
            });
        }
    });
});

// Ruta para obtener documentos específicos
app.get('/perfil/:id/documentos/:tipo', verificarToken, (req, res) => {
    const id_usuario = req.params.id;
    const tipo = req.params.tipo;
    
    // Verificar autorización
    if (req.usuario.id.toString() !== id_usuario) {
        return res.status(403).json({ message: 'No autorizado para ver estos documentos' });
    }

    let sql;
    let params = [id_usuario];

    switch(tipo) {
        case 'curriculum':
        case 'carta_presentacion':
            sql = `SELECT ${tipo} FROM postulacion WHERE id_postulacion IN (SELECT id_postulacion FROM perfil WHERE id_perfil = ?)`;
            break;
        case 'publicaciones':
            sql = 'SELECT contenido, archivos, fecha FROM publicacion WHERE id_publicacion IN (SELECT id_publicacion FROM perfil WHERE id_perfil = ?)';
            break;
        case 'mensajes':
            sql = 'SELECT contenido, fecha_envio FROM mensaje WHERE idMensaje IN (SELECT id_mensaje FROM perfil WHERE id_perfil = ?)';
            break;
        default:
            return res.status(400).json({ message: 'Tipo de documento no válido' });
    }

    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error(`Error al obtener ${tipo}:`, err);
            return res.status(500).json({ message: `Error al obtener ${tipo}` });
        }

        // Convertir BLOBs a base64
        const documentos = results.map(doc => {
            const docProcessed = { ...doc };
            if (doc.contenido) docProcessed.contenido = blobToBase64(doc.contenido);
            if (doc.archivos) docProcessed.archivos = blobToBase64(doc.archivos);
            if (doc[tipo]) docProcessed[tipo] = blobToBase64(doc[tipo]);
            return docProcessed;
        });

        res.json(documentos);
    });
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});