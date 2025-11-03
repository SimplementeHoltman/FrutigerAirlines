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
            <div style="margin:0;padding:0;background:#f5f7fa;font-family: Arial, Helvetica, sans-serif;color:#1f2937;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:24px 12px;">
                    <tr>
                        <td align="center">
                            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
                                <tr>
                                    <td style="background:#14C1FA;padding:16px; text-align:center;">
                                        <img src="https://finanzas.devnode.online/Gemini_Generated_Image_1ooch1ooch1ooch1-removebg-preview.png" alt="FrutigerAirlines" width="160" style="display:block;margin:0 auto;">
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:28px 24px;">
                                        <h1 style="margin:0 0 8px 0;font-size:22px;line-height:1.3;color:#0f172a;">¡Bienvenido a FrutigerAirlines, ${nombre}!</h1>
                                        <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#334155;">
                                            Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión y comenzar a reservar tus vuelos.
                                        </p>
                                        <p style="margin:16px 0 0 0;font-size:14px;color:#334155;">Saludos cordiales,</p>
                                        <p style="margin:4px 0 0 0;font-size:14px;color:#334155;">Equipo de FrutigerAirlines</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:16px 24px;border-top:1px solid #e5e7eb;background:#fafafa;">
                                        <p style="margin:0;text-align:center;font-size:12px;color:#6b7280;">Este es un mensaje automático, por favor no respondas a este correo.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
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
            <div style="margin:0;padding:0;background:#f5f7fa;font-family: Arial, Helvetica, sans-serif;color:#1f2937;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:24px 12px;">
                    <tr>
                        <td align="center">
                            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
                                <tr>
                                    <td style="background:#14C1FA;padding:16px; text-align:center;">
                                        <img src="https://finanzas.devnode.online/Gemini_Generated_Image_1ooch1ooch1ooch1-removebg-preview.png" alt="FrutigerAirlines" width="160" style="display:block;margin:0 auto;">
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:28px 24px;">
                                        <h1 style="margin:0 0 8px 0;font-size:22px;line-height:1.3;color:#0f172a;">Confirmación de Reserva</h1>
                                        <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#334155;">Hola ${usuario.nombre_completo},</p>
                                        <p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;color:#334155;">Tu reserva ha sido confirmada. A continuación, los detalles:</p>
                                        <div style="margin:12px 0 0 0;">
                                            <ul style="padding-left:18px;margin:0;">
                                                ${asientosHtml}
                                            </ul>
                                        </div>
                                        <div style="margin:16px 0 0 0;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;">
                                            <p style="margin:0;font-size:15px;color:#0f172a;"><b>Precio Total:</b> Q${precioTotal}</p>
                                        </div>
                                        <p style="margin:16px 0 0 0;font-size:14px;color:#334155;">Gracias por volar con nosotros.</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:16px 24px;border-top:1px solid #e5e7eb;background:#fafafa;">
                                        <p style="margin:0;text-align:center;font-size:12px;color:#6b7280;">Este es un mensaje automático, por favor no respondas a este correo.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </div>
        `;
};

export const getModificationEmail = (usuario, reservacion, recargo) => {
        return `
            <div style="margin:0;padding:0;background:#f5f7fa;font-family: Arial, Helvetica, sans-serif;color:#1f2937;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:24px 12px;">
                    <tr>
                        <td align="center">
                            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
                                <tr>
                                    <td style="background:#14C1FA;padding:16px; text-align:center;">
                                        <img src="https://finanzas.devnode.online/Gemini_Generated_Image_1ooch1ooch1ooch1-removebg-preview.png" alt="FrutigerAirlines" width="160" style="display:block;margin:0 auto;">
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:28px 24px;">
                                        <h1 style="margin:0 0 8px 0;font-size:22px;line-height:1.3;color:#0f172a;">Modificación de Reserva</h1>
                                        <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#334155;">Hola ${usuario.nombre_completo},</p>
                                        <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#334155;">Tu reserva (ID: ${reservacion.reservacion_id}) ha sido modificada exitosamente.</p>
                                        <div style="margin:12px 0 0 0;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;">
                                            <p style="margin:0 0 6px 0;font-size:14px;color:#334155;"><b>Recargo aplicado:</b> Q${recargo}</p>
                                            <p style="margin:0;font-size:14px;color:#334155;"><b>Nuevo precio total:</b> Q${reservacion.precio_total}</p>
                                        </div>
                                        <p style="margin:16px 0 0 0;font-size:14px;color:#334155;">Por favor, revisa los detalles actualizados en tu panel de usuario.</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:16px 24px;border-top:1px solid #e5e7eb;background:#fafafa;">
                                        <p style="margin:0;text-align:center;font-size:12px;color:#6b7280;">Este es un mensaje automático, por favor no respondas a este correo.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </div>
        `;
};

export const getCancellationEmail = (usuario, reservacion) => {
        return `
            <div style="margin:0;padding:0;background:#f5f7fa;font-family: Arial, Helvetica, sans-serif;color:#1f2937;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:24px 12px;">
                    <tr>
                        <td align="center">
                            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
                                <tr>
                                    <td style="background:#14C1FA;padding:16px; text-align:center;">
                                        <img src="https://finanzas.devnode.online/Gemini_Generated_Image_1ooch1ooch1ooch1-removebg-preview.png" alt="FrutigerAirlines" width="160" style="display:block;margin:0 auto;">
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:28px 24px;">
                                        <h1 style="margin:0 0 8px 0;font-size:22px;line-height:1.3;color:#0f172a;">Cancelación de Reserva</h1>
                                        <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#334155;">Hola ${usuario.nombre_completo},</p>
                                        <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#334155;">Tu reserva para el asiento <b>${reservacion.numero_asiento}</b> (Pasajero: ${reservacion.nombre_pasajero}) ha sido <b style="color:#dc2626;">CANCELADA</b> exitosamente.</p>
                                        <p style="margin:0 0 0 0;font-size:14px;line-height:1.7;color:#334155;">Lamentamos que no puedas volar con nosotros esta vez. Esperamos verte pronto a bordo.</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:16px 24px;border-top:1px solid #e5e7eb;background:#fafafa;">
                                        <p style="margin:0;text-align:center;font-size:12px;color:#6b7280;">Este es un mensaje automático, por favor no respondas a este correo.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </div>
        `;
};
