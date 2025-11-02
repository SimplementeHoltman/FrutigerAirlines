import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { sendEmail, getRegistrationEmail } from '../services/emailService.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, contrasena, nombreCompleto } = req.body;

  // Validaciones
  if (!email || !contrasena || !nombreCompleto) {
    return res.fail('Todos los campos son obligatorios.', 'VALIDATION_ERROR', 400, {
      fieldErrors: {
        email: !email ? 'El email es obligatorio.' : undefined,
        contrasena: !contrasena ? 'La contraseña es obligatoria.' : undefined,
        nombreCompleto: !nombreCompleto ? 'El nombre es obligatorio.' : undefined
      }
    });
  }

  if (contrasena.length < 6) {
    return res.fail('La contraseña debe tener al menos 6 caracteres.', 'PASSWORD_TOO_SHORT', 400);
  }

  if (!email.endsWith('@gmail.com') && !email.endsWith('@outlook.com')) {
    return res.fail('Solo se permiten correos @gmail.com y @outlook.com.', 'EMAIL_DOMAIN_NOT_ALLOWED', 400);
  }

  try {
    // 1. Verificar si el usuario ya existe
    const userExists = await query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.fail('El usuario ya existe.', 'USER_ALREADY_EXISTS', 409);
    }

    // 2. Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contrasena, salt);

    // 3. Insertar usuario en BD
    const newUser = await query(
      'INSERT INTO usuarios (email, contrasena, nombre_completo) VALUES ($1, $2, $3) RETURNING usuario_id, email, nombre_completo, fecha_creacion',
      [email, hashedPassword, nombreCompleto]
    );

    // 4. Enviar email de confirmación (sin bloquear la respuesta)
    sendEmail(
      email,
      '¡Bienvenido a FrutigerAirlines!',
      getRegistrationEmail(nombreCompleto)
    ).catch(err => console.error('Fallo al enviar email de registro:', err));

    // 5. Responder
  res.ok('Usuario registrado exitosamente.', 'USER_REGISTERED', { usuario: newUser.rows[0] }, 201);

  } catch (error) {
    console.error(error);
    res.fail('Error en el servidor al registrar usuario.', 'REGISTER_SERVER_ERROR', 500);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, contrasena } = req.body;

  if (!email || !contrasena) {
    return res.fail('Email y contraseña son obligatorios.', 'VALIDATION_ERROR', 400, {
      fieldErrors: {
        email: !email ? 'El email es obligatorio.' : undefined,
        contrasena: !contrasena ? 'La contraseña es obligatoria.' : undefined
      }
    });
  }

  try {
    // 1. Buscar usuario
    const userRes = await query(`
      SELECT
        u.*,
        (SELECT COUNT(*) FROM reservaciones r WHERE r.usuario_id = u.usuario_id AND r.estado = 'ACTIVA') >= 5 AS esVip
      FROM usuarios u
      WHERE u.email = $1
    `, [email]);

    if (userRes.rows.length === 0) {
      return res.fail('Credenciales inválidas.', 'INVALID_CREDENTIALS', 401);
    }

    const usuario = userRes.rows[0];

    // 2. Comparar contraseña
    const isMatch = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!isMatch) {
      return res.fail('Credenciales inválidas.', 'INVALID_CREDENTIALS', 401);
    }

    // 3. Preparar respuesta (omitir contraseña)
    const { contrasena: _, ...usuarioSinPass } = usuario;

    // NOTA: Aquí iría la generación de JWT, pero omitida por instrucción de "no middleware"
    // const token = jwt.sign({ id: usuario.usuario_id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.ok('Login exitoso', 'LOGIN_SUCCESS', { usuario: usuarioSinPass }, 200);

  } catch (error) {
    console.error(error);
    res.fail('Error en el servidor al iniciar sesión.', 'LOGIN_SERVER_ERROR', 500);
  }
});

export default router;
