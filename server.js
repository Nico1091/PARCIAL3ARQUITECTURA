/*
*****************************************************
* SERVIDOR EXPRESS.JS COMPLETO PARA WAMP SERVER LOCAL
* Sistema de Red Social con Solicitudes de Amistad
****************************************************
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

// Aumentar el límite de tamaño para las solicitudes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Clave secreta para JWT
const JWT_SECRET = 'tu_clave_secreta_muy_segura';

// Middleware global
app.use(cors());
app.use(express.json());

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

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
    if (req.usuario && req.usuario.id_perfil === 2) {
        return next();
    }
    return res.status(403).json({ message: 'Acceso no autorizado' });
}

// Función mejorada para convertir BLOB a base64 con tipo MIME
function blobToBase64WithMime(blob) {
    if (!blob) return null;
    try {
        const base64 = Buffer.from(blob).toString('base64');
        let mimeType = 'application/octet-stream';
        
        if (blob.length >= 4) {
            const header = Buffer.from(blob.slice(0, 4));
            
            if (header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46) {
                mimeType = 'application/pdf';
            } else if (header[0] === 0xFF && header[1] === 0xD8) {
                mimeType = 'image/jpeg';
            } else if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
                mimeType = 'image/png';
            }
        }
        
        return {
            data: base64,
            mimeType: mimeType,
            size: blob.length
        };
    } catch (error) {
        console.error('Error al convertir BLOB:', error);
        return null;
    }
}

// Configuración de multer para archivos
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG) y PDFs.'));
    }
};

const upload = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// ================== RUTAS DE AUTENTICACIÓN ==================

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

                const Consultatraerusuario = 'SELECT id_usuario, nombre, email, id_perfil FROM usuario WHERE id_usuario = ?';
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

                const token = jwt.sign(
                    { 
                        id: usuarioDB.id_usuario,
                        nombre: usuarioDB.nombre,
                        email: usuarioDB.email,
                        id_perfil: usuarioDB.id_perfil,
                        timestamp: Date.now()
                    },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                const usuarioResponse = {
                    id_usuario: usuarioDB.id_usuario,
                    nombre: usuarioDB.nombre,
                    email: usuarioDB.email,
                    id_perfil: usuarioDB.id_perfil
                };

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

// ================== RUTAS DE SOLICITUDES DE AMISTAD ==================

// Enviar solicitud de amistad
app.post('/solicitar-amistad', verificarToken, async (req, res) => {
    const { id_receptor } = req.body;
    const id_emisor = req.usuario.id;

    try {
        if (!id_receptor) {
            return res.status(400).json({ 
                success: false,
                message: 'El ID del receptor es obligatorio' 
            });
        }

        const receptorId = parseInt(id_receptor);
        const emisorId = parseInt(id_emisor);

        if (isNaN(receptorId) || isNaN(emisorId)) {
            return res.status(400).json({ 
                success: false,
                message: 'IDs de usuario no válidos' 
            });
        }

        if (emisorId === receptorId) {
            return res.status(400).json({ 
                success: false,
                message: 'No puedes enviarte una solicitud a ti mismo' 
            });
        }

        // Verificar que el receptor existe
        const consultaReceptor = 'SELECT id_usuario, nombre FROM usuario WHERE id_usuario = ?';
        connection.query(consultaReceptor, [receptorId], (err, resultados) => {
            if (err) {
                console.error('Error al verificar receptor:', err);
                return res.status(500).json({ 
                    success: false,
                    message: 'Error en el servidor al verificar usuario' 
                });
            }

            if (resultados.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Usuario receptor no encontrado' 
                });
            }

            const receptor = resultados[0];

            // Verificar si ya existe una conexión
            const consultaExistente = `
                SELECT estado 
                FROM conexiones 
                WHERE ((usuario_solicitante = ? AND usuario_solicitado = ?) OR 
                       (usuario_solicitante = ? AND usuario_solicitado = ?))
            `;
            
            connection.query(consultaExistente, [
                emisorId, receptorId, receptorId, emisorId
            ], (err, relacionesExistentes) => {
                if (err) {
                    console.error('Error al verificar relaciones existentes:', err);
                    return res.status(500).json({ 
                        success: false,
                        message: 'Error en el servidor al verificar relaciones' 
                    });
                }

                if (relacionesExistentes.length > 0) {
                    const relacion = relacionesExistentes[0];
                    if (relacion.estado === 'aceptada') {
                        return res.status(400).json({ 
                            success: false,
                            message: 'Ya son amigos' 
                        });
                    } else if (relacion.estado === 'pendiente') {
                        return res.status(400).json({ 
                            success: false,
                            message: 'Ya existe una solicitud de amistad pendiente' 
                        });
                    }
                }

                // Crear la nueva solicitud de amistad
                const consultaInsertar = `
                    INSERT INTO conexiones (usuario_solicitante, usuario_solicitado, estado, fecha_solicitud) 
                    VALUES (?, ?, 'pendiente', NOW())
                `;

                connection.query(consultaInsertar, [emisorId, receptorId], (err, resultado) => {
                    if (err) {
                        console.error('Error al crear solicitud de amistad:', err);
                        
                        if (err.code === 'ER_DUP_ENTRY') {
                            return res.status(400).json({ 
                                success: false,
                                message: 'Ya existe una solicitud entre estos usuarios' 
                            });
                        }
                        
                        return res.status(500).json({ 
                            success: false,
                            message: 'Error al enviar la solicitud de amistad',
                            error: err.sqlMessage || err.message
                        });
                    }

                    res.status(201).json({
                        success: true,
                        message: `Solicitud de amistad enviada exitosamente a ${receptor.nombre}`,
                        data: {
                            id_conexion: resultado.insertId,
                            usuario_solicitante: emisorId,
                            usuario_solicitado: receptorId,
                            receptor_nombre: receptor.nombre,
                            estado: 'pendiente',
                            fecha_solicitud: new Date().toISOString()
                        }
                    });
                });
            });
        });

    } catch (error) {
        console.error('Error inesperado en solicitar-amistad:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// Obtener solicitudes recibidas
app.get('/mis-solicitudes-recibidas', verificarToken, (req, res) => {
    const id_usuario = req.usuario.id;

    try {
        const consulta = `
            SELECT 
                c.id_conexion,
                c.usuario_solicitante,
                c.estado,
                c.fecha_solicitud,
                u.nombre as emisor_nombre,
                u.email as emisor_email
            FROM conexiones c
            JOIN usuario u ON c.usuario_solicitante = u.id_usuario
            WHERE c.usuario_solicitado = ? AND c.estado = 'pendiente'
            ORDER BY c.fecha_solicitud DESC
        `;

        connection.query(consulta, [id_usuario], (err, resultados) => {
            if (err) {
                console.error('Error al obtener solicitudes recibidas:', err);
                return res.status(500).json({ 
                    success: false,
                    message: 'Error en el servidor' 
                });
            }

            res.json({
                success: true,
                message: 'Solicitudes obtenidas exitosamente',
                data: resultados,
                total: resultados.length
            });
        });

    } catch (error) {
        console.error('Error inesperado:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor' 
        });
    }
});

// Responder a solicitudes (aceptar/rechazar)
app.put('/responder-solicitud/:id_conexion', verificarToken, (req, res) => {
    const { id_conexion } = req.params;
    const { accion } = req.body;
    const id_usuario = req.usuario.id;

    try {
        if (!['aceptar', 'rechazar'].includes(accion)) {
            return res.status(400).json({ 
                success: false,
                message: 'Acción no válida. Use "aceptar" o "rechazar"' 
            });
        }

        const consultaVerificar = `
            SELECT c.usuario_solicitante, c.usuario_solicitado, c.estado, u.nombre as emisor_nombre
            FROM conexiones c
            JOIN usuario u ON c.usuario_solicitante = u.id_usuario
            WHERE c.id_conexion = ? AND c.usuario_solicitado = ?
        `;

        connection.query(consultaVerificar, [id_conexion, id_usuario], (err, resultados) => {
            if (err) {
                console.error('Error al verificar solicitud:', err);
                return res.status(500).json({ 
                    success: false,
                    message: 'Error en el servidor' 
                });
            }

            if (resultados.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Solicitud no encontrada o no tienes permisos para responderla' 
                });
            }

            const solicitud = resultados[0];

            if (solicitud.estado !== 'pendiente') {
                return res.status(400).json({ 
                    success: false,
                    message: 'Esta solicitud ya ha sido respondida' 
                });
            }

            const nuevoEstado = accion === 'aceptar' ? 'aceptada' : 'rechazada';
            const consultaActualizar = `
                UPDATE conexiones 
                SET estado = ?, fecha_respuesta = NOW() 
                WHERE id_conexion = ?
            `;

            connection.query(consultaActualizar, [nuevoEstado, id_conexion], (err, resultado) => {
                if (err) {
                    console.error('Error al actualizar solicitud:', err);
                    return res.status(500).json({ 
                        success: false,
                        message: 'Error al procesar la respuesta',
                        error: err.sqlMessage || err.message
                    });
                }

                const mensajeRespuesta = accion === 'aceptar' 
                    ? `¡Solicitud aceptada! Ahora eres amigo de ${solicitud.emisor_nombre}`
                    : `Solicitud de ${solicitud.emisor_nombre} rechazada`;

                res.json({
                    success: true,
                    message: mensajeRespuesta,
                    data: {
                        id_conexion: parseInt(id_conexion),
                        estado: nuevoEstado,
                        amigo_nombre: solicitud.emisor_nombre
                    }
                });
            });
        });

    } catch (error) {
        console.error('Error inesperado:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor' 
        });
    }
});

// Buscar usuarios
app.get('/buscar-usuarios', verificarToken, (req, res) => {
    const { busqueda } = req.query;
    const id_usuario = req.usuario.id;

    try {
        if (!busqueda || busqueda.trim().length < 2) {
            return res.status(400).json({ 
                success: false,
                message: 'Debe proporcionar al menos 2 caracteres para buscar' 
            });
        }

        const consulta = `
            SELECT 
                u.id_usuario,
                u.nombre,
                u.email,
                CASE 
                    WHEN c_enviada.id_conexion IS NOT NULL AND c_enviada.estado = 'pendiente' THEN 'solicitud_enviada'
                    WHEN c_recibida.id_conexion IS NOT NULL AND c_recibida.estado = 'pendiente' THEN 'solicitud_recibida'
                    WHEN c_aceptada.id_conexion IS NOT NULL THEN 'amigos'
                    ELSE 'ninguna'
                END as relacion_estado
            FROM usuario u
            LEFT JOIN conexiones c_enviada ON (
                c_enviada.usuario_solicitante = ? AND c_enviada.usuario_solicitado = u.id_usuario AND c_enviada.estado = 'pendiente'
            )
            LEFT JOIN conexiones c_recibida ON (
                c_recibida.usuario_solicitado = ? AND c_recibida.usuario_solicitante = u.id_usuario AND c_recibida.estado = 'pendiente'
            )
            LEFT JOIN conexiones c_aceptada ON (
                ((c_aceptada.usuario_solicitante = ? AND c_aceptada.usuario_solicitado = u.id_usuario) OR
                 (c_aceptada.usuario_solicitado = ? AND c_aceptada.usuario_solicitante = u.id_usuario)) AND
                c_aceptada.estado = 'aceptada'
            )
            WHERE u.id_usuario != ? 
            AND (u.nombre LIKE ? OR u.email LIKE ?)
            ORDER BY u.nombre
            LIMIT 20
        `;

        const terminoBusqueda = `%${busqueda.trim()}%`;

        connection.query(consulta, [
            id_usuario, id_usuario, id_usuario, id_usuario, id_usuario,
            terminoBusqueda, terminoBusqueda
        ], (err, resultados) => {
            if (err) {
                console.error('Error al buscar usuarios:', err);
                return res.status(500).json({ 
                    success: false,
                    message: 'Error en el servidor' 
                });
            }

            res.json({
                success: true,
                message: 'Búsqueda completada exitosamente',
                data: resultados,
                total: resultados.length
            });
        });

    } catch (error) {
        console.error('Error inesperado:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor' 
        });
    }
});

// ================== RESTO DE RUTAS EXISTENTES ==================

// Obtener publicaciones
app.get('/obtener-publicaciones', verificarToken, (req, res) => {
    try {
        const sql = `
            SELECT 
                p.id_publicacion,
                p.contenido,
                p.fecha,
                p.archivos,
                p.autor,
                u.nombre,
                u.id_usuario as autor_id
            FROM publicacion p 
            JOIN usuario u ON p.autor = u.id_usuario 
            ORDER BY p.fecha DESC
        `;
        
        connection.query(sql, (err, results) => {
            if (err) {
                console.error('Error al obtener publicaciones:', err);
                return res.status(500).json({ error: 'Error al obtener publicaciones' });
            }

            const publicaciones = results.map(pub => {
                const archivoProcessed = pub.archivos ? blobToBase64WithMime(pub.archivos) : null;
                
                return {
                    id_publicacion: pub.id_publicacion,
                    contenido: pub.contenido,
                    fecha: pub.fecha,
                    nombre: pub.nombre,
                    autor: pub.autor,
                    autor_id: pub.autor_id,
                    archivo: archivoProcessed
                };
            });

            res.json(publicaciones);
        });
    } catch (error) {
        console.error('Error inesperado:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// Crear publicaciones
app.post('/crear-publicacion', verificarToken, upload.single('archivo'), async (req, res) => {
    try {
        const { contenido } = req.body;
        const archivo = req.file;

        if (!contenido?.trim()) {
            return res.status(400).json({ error: 'El contenido es obligatorio' });
        }

        let archivoBuffer = null;
        if (archivo) {
            try {
                archivoBuffer = fs.readFileSync(archivo.path);
                fs.unlinkSync(archivo.path);
            } catch (error) {
                console.error('Error al procesar archivo:', error);
                return res.status(500).json({ error: 'Error al procesar el archivo' });
            }
        }

        const sql = 'INSERT INTO publicacion (contenido, archivos, autor, fecha) VALUES (?, ?, ?, NOW())';
        connection.query(sql, [contenido.trim(), archivoBuffer, req.usuario.id], (err, result) => {
            if (err) {
                console.error('Error al guardar publicación:', err);
                return res.status(500).json({ 
                    error: 'Error al guardar la publicación',
                    details: err.message 
                });
            }

            const sqlSelect = `
                SELECT 
                    p.id_publicacion,
                    p.contenido,
                    p.fecha,
                    p.archivos,
                    u.nombre,
                    u.id_usuario as autor_id
                FROM publicacion p 
                JOIN usuario u ON p.autor = u.id_usuario 
                WHERE p.id_publicacion = ?
            `;

            connection.query(sqlSelect, [result.insertId], (err, results) => {
                if (err) {
                    console.error('Error al obtener la publicación creada:', err);
                    return res.status(500).json({ error: 'Error al obtener la publicación creada' });
                }

                if (!results || results.length === 0) {
                    return res.status(404).json({ error: 'No se encontró la publicación creada' });
                }

                const publicacion = results[0];
                const archivoProcessed = publicacion.archivos ? blobToBase64WithMime(publicacion.archivos) : null;

                res.status(201).json({
                    message: 'Publicación creada exitosamente',
                    publicacion: {
                        id_publicacion: publicacion.id_publicacion,
                        contenido: publicacion.contenido,
                        fecha: publicacion.fecha,
                        nombre: publicacion.nombre,
                        autor_id: publicacion.autor_id,
                        archivo: archivoProcessed
                    }
                });
            });
        });
    } catch (error) {
        console.error('Error inesperado:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// Verificar token
app.get('/verificar-token', verificarToken, (req, res) => {
    res.json({ valid: true });
});

// Cerrar sesión
app.post('/logout', verificarToken, (req, res) => {
    try {
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
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Ruta raíz - servir index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`✅ Servidor ejecutándose en http://localhost:${port}`);
    // console.log(`🔧 Sistema de solicitudes de amistad activado`);
    //console.log(`🌐 WAMP Server MySQL configurado`);
    //console.log(`📁 Archivos estáticos en /public`);
    //console.log(`📝 Rutas disponibles:`);
    //console.log(`   - POST /solicitar-amistad`);
    //console.log(`   - GET /mis-solicitudes-recibidas`);
    //console.log(`   - PUT /responder-solicitud/:id`);
    //console.log(`   - GET /buscar-usuarios`);
    //console.log(`💡 Asegúrate de que WAMP server esté ejecutándose`);
});

module.exports = app;