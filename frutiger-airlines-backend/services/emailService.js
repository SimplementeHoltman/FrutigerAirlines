import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configuración del transporte de Nodemailer con las credenciales de IONOS
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST,
  port: process.env.EMAIL_SMTP_PORT,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    ciphers:'SSLv3',
    rejectUnauthorized: false
  }
});

/**
 * Envía un correo electrónico.
 * @param {string} to - Email del destinatario.
 * @param {string} subject - Asunto del correo.
 * @param {string} html - Contenido HTML del correo.
 */
export const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `"FrutigerAirlines Admin" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado: ' + info.response);
    return true;
  } catch (error) {
    console.error('Error al enviar email:', error);
    return false;
  }
};

// Funciones de plantilla
export const getRegistrationEmail = (nombre) => {
    return `
        <div style="font-family: Arial, sans-serif; color: #31383B; line-height: 1.6;">
            <h1 style="color: #14C1FA;">¡Bienvenido a FrutigerAirlines, ${nombre}!</h1>
            <p>Tu cuenta ha sido creada exitosamente.</p>
            <p>Ya puedes iniciar sesión y comenzar a reservar tus vuelos.</p>
            <br>
            <p>Saludos,</p>
            <p>El equipo de FrutigerAirlines</p>
        </div>
    `;
};

export const getReservationEmail = (usuario, reservaciones, precioTotal) => {
    let asientosHtml = reservaciones.map(r => `
        <li>
            <b>Asiento:</b> ${r.numero_asiento} (${r.clase_asiento})<br>
            <b>Pasajero:</b> ${r.nombre_pasajero}<br>
            <b>CUI:</b> ${r.cui_pasajero}<br>
            <b>Equipaje:</b> ${r.tiene_equipaje ? 'Sí' : 'No'}<br>
            <b>Precio:</b> Q${r.precio_total}
        </li>
    `).join('');

    return `
        <div style="font-family: Arial, sans-serif; color: #31383B; line-height: 1.6;">
            <h1 style="color: #3D9BBA;">Confirmación de Reserva - FrutigerAirlines</h1>
            <p>Hola ${usuario.nombre_completo},</p>
            <p>Tu reserva ha sido confirmada. Aquí están los detalles:</p>
            <ul>
                ${asientosHtml}
            </ul>
            <hr>
            <h3 style="color: #476E7A;">Precio Total: Q${precioTotal}</h3>
            <p>Gracias por volar con nosotros.</p>
        </div>
    `;
};

export const getModificationEmail = (usuario, reservacion, recargo) => {
    return `
        <div style="font-family: Arial, sans-serif; color: #31383B; line-height: 1.6;">
            <h1 style="color: #3D9BBA;">Modificación de Reserva - FrutigerAirlines</h1>
            <p>Hola ${usuario.nombre_completo},</p>
            <p>Tu reserva (ID: ${reservacion.reservacion_id}) ha sido modificada exitosamente.</p>
            <p>Se aplicó un recargo de <b>Q${recargo}</b>.</p>
            <p>El nuevo precio total es <b>Q${reservacion.precio_total}</b>.</p>
            <p>Por favor, revisa los detalles actualizados en tu panel de usuario.</p>
        </div>
    `;
};

export const getCancellationEmail = (usuario, reservacion) => {
    return `
        <div style="font-family: Arial, sans-serif; color: #31383B; line-height: 1.6;">
            <h1 style="color: #476E7A;">Cancelación de Reserva - FrutigerAirlines</h1>
            <p>Hola ${usuario.nombre_completo},</p>
            <p>Tu reserva para el asiento <b>${reservacion.numero_asiento}</b> (Pasajero: ${reservacion.nombre_pasajero}) ha sido <b>CANCELADA</b> exitosamente.</p>
            <p>Lamentamos que no puedas volar con nosotros esta vez.</p>
        </div>
    `;
};
