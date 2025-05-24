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

// Función mejorada para convertir BLOB a base64 con tipo MIME
function blobToBase64WithMime(blob) {
    if (!blob) return null;
    try {
        // Convertir el BLOB a base64
        const base64 = Buffer.from(blob).toString('base64');
        
        // Detectar el tipo MIME basado en los primeros bytes
        const header = blob.slice(0, 8).toString('hex').toLowerCase();
        let mimeType = 'application/octet-stream';

        // Mapeo mejorado de firmas de archivo
        const signatures = {
            '89504e47': 'image/png',      // PNG
            'ffd8ff': 'image/jpeg',       // JPEG (cualquier variante)
            '47494638': 'image/gif',      // GIF
            '25504446': 'application/pdf', // PDF estándar
            '255044462d': 'application/pdf', // PDF con versión
        };

        // Detectar tipo MIME
        for (let [sig, mime] of Object.entries(signatures)) {
            if (header.startsWith(sig)) {
                mimeType = mime;
                break;
            }
        }

        // Verificación adicional para PDFs
        if (header.includes('pdf') || header.includes('2550') || base64.slice(0, 20).toLowerCase().includes('pdf')) {
            mimeType = 'application/pdf';
        }

        return {
            data: base64,
            mimeType: mimeType
        };
    } catch (error) {
        console.error('Error al convertir BLOB:', error);
        return null;
    }
}

// Ruta unificada para obtener publicaciones
app.get('/obtener-publicaciones', verificarToken, (req, res) => {
    const sql = 'SELECT p.id_publicacion, p.contenido, p.fecha, p.archivos, p.autor, u.nombre FROM publicacion p JOIN usuario u ON p.autor = u.id_usuario ORDER BY p.fecha DESC';
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error al obtener publicaciones:', err);
            return res.status(500).json({ error: 'Error al obtener publicaciones' });
        }

        // Procesar cada publicación y convertir los archivos BLOB
        const publicaciones = results.map(pub => {
            const archivoProcessed = pub.archivos ? blobToBase64WithMime(pub.archivos) : null;
            
            return {
                id_publicacion: pub.id_publicacion,
                contenido: pub.contenido,
                fecha: pub.fecha,
                nombre: pub.nombre,
                autor: pub.autor,
                archivo: archivoProcessed
            };
        });

        res.json(publicaciones);
    });
});

// Ruta unificada para crear publicaciones
app.post('/publicar', verificarToken, upload.single('archivo'), (req, res) => {
    const { contenido } = req.body;
    const archivo = req.file;

    if (!contenido?.trim()) {
        return res.status(400).json({ error: 'El contenido es obligatorio' });
    }

    let archivoBuffer = null;
    if (archivo) {
        try {
            archivoBuffer = fs.readFileSync(archivo.path);
            // Limpiar el archivo temporal
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
            return res.status(500).json({ error: 'Error al guardar la publicación' });
        }

        // Obtener la publicación recién creada con el nombre del autor
        const sqlSelect = 'SELECT p.id_publicacion, p.contenido, p.fecha, p.archivos, u.nombre FROM publicacion p JOIN usuario u ON p.autor = u.id_usuario WHERE p.id_publicacion = ?';
        connection.query(sqlSelect, [result.insertId], (err, results) => {
            if (err) {
                console.error('Error al obtener la publicación creada:', err);
                return res.status(500).json({ error: 'Error al obtener la publicación creada' });
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
                    archivo: archivoProcessed
                }
            });
        });
    });
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
            foto: blobToBase64WithMime(perfil.foto),
            publicacion: perfil.publicacion_contenido ? {
                contenido: perfil.publicacion_contenido,
                archivos: blobToBase64WithMime(perfil.publicacion_archivos)
            } : null,
            mensaje: perfil.mensaje_contenido ? {
                contenido: blobToBase64WithMime(perfil.mensaje_contenido)
            } : null,
            postulacion: {
                curriculum: blobToBase64WithMime(perfil.curriculum),
                carta_presentacion: blobToBase64WithMime(perfil.carta_presentacion)
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
            if (doc.contenido) docProcessed.contenido = blobToBase64WithMime(doc.contenido);
            if (doc.archivos) docProcessed.archivos = blobToBase64WithMime(doc.archivos);
            if (doc[tipo]) docProcessed[tipo] = blobToBase64WithMime(doc[tipo]);
            return docProcessed;
        });

        res.json(documentos);
    });
});

// Ruta para eliminar una publicación
app.delete('/publicacion/:id', verificarToken, async (req, res) => {
    const id_publicacion = req.params.id;
    const id_usuario = req.usuario.id;

    try {
        // Primero verificar si el usuario es el autor de la publicación o es administrador
        const verificarAutor = 'SELECT autor, archivos FROM publicacion WHERE id_publicacion = ?';
        connection.query(verificarAutor, [id_publicacion], async (err, results) => {
            if (err) {
                console.error('Error al verificar autor:', err);
                return res.status(500).json({ message: 'Error al verificar la publicación' });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: 'Publicación no encontrada' });
            }

            const publicacion = results[0];
            if (publicacion.autor !== id_usuario && req.usuario.id_perfil !== 2) {
                return res.status(403).json({ message: 'No tienes permiso para eliminar esta publicación' });
            }

            // Eliminar la publicación
            const eliminarPublicacion = 'DELETE FROM publicacion WHERE id_publicacion = ?';
            connection.query(eliminarPublicacion, [id_publicacion], (err) => {
                if (err) {
                    console.error('Error al eliminar publicación:', err);
                    return res.status(500).json({ message: 'Error al eliminar la publicación' });
                }

                res.json({ 
                    message: 'Publicación eliminada exitosamente',
                    id_publicacion: id_publicacion
                });
            });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Ruta para obtener contactos
app.get('/obtener-contactos', verificarToken, (req, res) => {
    const userId = req.usuario.id;
    const query = `
        SELECT DISTINCT u.id_usuario, u.nombre, u.email,
        (SELECT mensaje 
         FROM mensajes 
         WHERE (emisor_id = u.id_usuario AND receptor_id = ?) 
            OR (emisor_id = ? AND receptor_id = u.id_usuario)
         ORDER BY fecha_envio DESC 
         LIMIT 1) as ultimo_mensaje
        FROM usuario u
        INNER JOIN conexiones c ON 
            ((c.usuario_solicitante = ? AND c.usuario_solicitado = u.id_usuario)
            OR (c.usuario_solicitante = u.id_usuario AND c.usuario_solicitado = ?))
        WHERE c.estado = 'aceptada'
        ORDER BY u.nombre
    `;
    
    connection.query(query, [userId, userId, userId, userId], (error, results) => {
        if (error) {
            console.error('Error al obtener contactos:', error);
            return res.status(500).json({ message: 'Error al obtener contactos' });
        }
        res.json(results);
    });
});

app.get('/obtener-mensajes/:contactId', verificarToken, (req, res) => {
    const userId = req.usuario.id;
    const contactId = req.params.contactId;
    
    const query = `
        SELECT m.*, 
               u_emisor.nombre as nombre_emisor,
               u_receptor.nombre as nombre_receptor
        FROM mensajes m
        JOIN usuario u_emisor ON m.emisor_id = u_emisor.id_usuario
        JOIN usuario u_receptor ON m.receptor_id = u_receptor.id_usuario
        WHERE (emisor_id = ? AND receptor_id = ?)
           OR (emisor_id = ? AND receptor_id = ?)
        ORDER BY fecha_envio ASC
    `;
    
    connection.query(query, [userId, contactId, contactId, userId], (error, results) => {
        if (error) {
            console.error('Error al obtener mensajes:', error);
            return res.status(500).json({ message: 'Error al obtener mensajes' });
        }
        res.json(results);
    });
});

app.post('/enviar-mensaje', verificarToken, (req, res) => {
    const emisorId = req.usuario.id;
    const { receptorId, mensaje } = req.body;
    
    if (!receptorId || !mensaje) {
        return res.status(400).json({ message: 'Receptor y mensaje son requeridos' });
    }
    
    const query = `
        INSERT INTO mensajes (emisor_id, receptor_id, mensaje, fecha_envio)
        VALUES (?, ?, ?, NOW())
    `;
    
    connection.query(query, [emisorId, receptorId, mensaje], (error, results) => {
        if (error) {
            console.error('Error al enviar mensaje:', error);
            return res.status(500).json({ message: 'Error al enviar mensaje' });
        }
        res.json({ message: 'Mensaje enviado exitosamente', id: results.insertId });
    });
});

// Ruta para buscar usuarios
app.get('/buscar-usuarios', verificarToken, (req, res) => {
    const { busqueda } = req.query;
    const userId = req.usuario.id;

    // Primero, obtener todos los usuarios que coincidan con la búsqueda
    const query = `
        SELECT 
            u.id_usuario,
            u.nombre,
            u.email,
            u.id_perfil,
            COALESCE(c.estado, 'ninguna') as estado_conexion
        FROM usuario u
        LEFT JOIN conexiones c ON 
            (c.usuario_solicitante = ? AND c.usuario_solicitado = u.id_usuario)
            OR (c.usuario_solicitante = u.id_usuario AND c.usuario_solicitado = ?)
        WHERE u.id_usuario != ?
        AND (
            LOWER(u.nombre) LIKE LOWER(?)
            OR LOWER(u.email) LIKE LOWER(?)
        )
        GROUP BY u.id_usuario
        ORDER BY u.nombre
    `;
    
    const searchTerm = `%${busqueda || ''}%`;
    
    connection.query(query, [userId, userId, userId, searchTerm, searchTerm], (error, results) => {
        if (error) {
            console.error('Error al buscar usuarios:', error);
            return res.status(500).json({ message: 'Error al buscar usuarios' });
        }

        // Procesar los resultados para determinar el estado correcto de la conexión
        const usuarios = results.map(usuario => ({
            ...usuario,
            estado_conexion: usuario.estado_conexion === 'ninguna' ? null : usuario.estado_conexion
        }));

        res.json(usuarios);
    });
});

// Ruta para enviar solicitud de amistad
app.post('/enviar-solicitud', verificarToken, (req, res) => {
    const solicitanteId = req.usuario.id;
    const { usuarioSolicitadoId } = req.body;

    if (!usuarioSolicitadoId) {
        return res.status(400).json({ message: 'ID de usuario solicitado es requerido' });
    }

    // Verificar si ya existe una solicitud
    const checkQuery = `
        SELECT * FROM conexiones 
        WHERE (usuario_solicitante = ? AND usuario_solicitado = ?)
           OR (usuario_solicitante = ? AND usuario_solicitado = ?)
    `;

    connection.query(checkQuery, [solicitanteId, usuarioSolicitadoId, usuarioSolicitadoId, solicitanteId], (error, results) => {
        if (error) {
            console.error('Error al verificar solicitud:', error);
            return res.status(500).json({ message: 'Error al procesar la solicitud' });
        }

        if (results.length > 0) {
            return res.status(400).json({ message: 'Ya existe una conexión o solicitud pendiente' });
        }

        // Crear nueva solicitud
        const insertQuery = `
            INSERT INTO conexiones (usuario_solicitante, usuario_solicitado)
            VALUES (?, ?)
        `;

        connection.query(insertQuery, [solicitanteId, usuarioSolicitadoId], (error, results) => {
            if (error) {
                console.error('Error al crear solicitud:', error);
                return res.status(500).json({ message: 'Error al crear la solicitud' });
            }
            res.json({ message: 'Solicitud enviada exitosamente' });
        });
    });
});

// Ruta para responder a solicitud de amistad
app.put('/responder-solicitud/:id', verificarToken, (req, res) => {
    const conexionId = req.params.id;
    const usuarioId = req.usuario.id;
    const { respuesta } = req.body;

    if (!['aceptada', 'rechazada'].includes(respuesta)) {
        return res.status(400).json({ message: 'Respuesta inválida' });
    }

    const query = `
        UPDATE conexiones 
        SET estado = ?, fecha_respuesta = NOW()
        WHERE id_conexion = ? 
        AND usuario_solicitado = ?
    `;

    connection.query(query, [respuesta, conexionId, usuarioId], (error, results) => {
        if (error) {
            console.error('Error al responder solicitud:', error);
            return res.status(500).json({ message: 'Error al procesar la respuesta' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }

        res.json({ message: `Solicitud ${respuesta} exitosamente` });
    });
});

// Ruta para obtener solicitudes pendientes
app.get('/solicitudes-pendientes', verificarToken, (req, res) => {
    const usuarioId = req.usuario.id;

    const query = `
        SELECT c.*, 
               u.nombre as nombre_solicitante,
               u.email as email_solicitante
        FROM conexiones c
        JOIN usuario u ON c.usuario_solicitante = u.id_usuario
        WHERE c.usuario_solicitado = ?
        AND c.estado = 'pendiente'
        ORDER BY c.fecha_solicitud DESC
    `;

    connection.query(query, [usuarioId], (error, results) => {
        if (error) {
            console.error('Error al obtener solicitudes:', error);
            return res.status(500).json({ message: 'Error al obtener solicitudes' });
        }
        res.json(results);
    });
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});