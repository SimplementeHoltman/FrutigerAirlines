import { Router } from 'express';
import pool, { query } from '../db.js';
import { randomUUID } from 'crypto';
import { validarCUI } from '../services/cuiService.js';
import { sendEmail, getReservationEmail, getModificationEmail, getCancellationEmail } from '../services/emailService.js';

const router = Router();

// POST /api/reservaciones (Crear nueva)
router.post('/', async (req, res) => {
  const { usuario_id, asientos, metodo_seleccion } = req.body;

  if (!usuario_id || !asientos || !Array.isArray(asientos) || asientos.length === 0) {
    return res.fail('Datos de reservación inválidos.', 'RESERVATION_INVALID_PAYLOAD', 400);
  }

  const client = await pool.connect();
  const reservacionesCreadas = [];
  let precioTotalCompra = 0;
  const compraId = randomUUID();

  try {
    await client.query('BEGIN');

    // 1. Obtener datos del usuario y estado VIP
    // total_reservas debe contabilizar compras (no asientos): usamos COUNT DISTINCT por instante de creación
    const userRes = await client.query(
      `SELECT *,
        (SELECT COUNT(DISTINCT COALESCE(
             r.compra_id,
             to_char(date_trunc('second', r.fecha_reservacion), 'YYYY-MM-DD"T"HH24:MI:SS')
           ))
           FROM reservaciones r
          WHERE r.usuario_id = u.usuario_id AND r.estado = 'ACTIVA') AS total_reservas
       FROM usuarios u
      WHERE u.usuario_id = $1`,
      [usuario_id]
    );
    if (userRes.rows.length === 0) {
      throw new Error('Usuario no encontrado.');
    }
    const usuario = userRes.rows[0];
  // VIP si tiene 5 o más COMPRAS (reservaciones realizadas) antes de esta compra
  const esVip = Number(usuario.total_reservas) >= 5;

    for (const item of asientos) {
      const { asiento_id, nombre_pasajero, cui_pasajero, tiene_equipaje } = item;

      // 2. Validar CUI del pasajero
      const cuiCheck = await validarCUI(cui_pasajero);
      if (!cuiCheck.valido) {
        throw new Error(`CUI ${cui_pasajero} inválido: ${cuiCheck.mensaje}`);
      }

      // 3. Verificar disponibilidad y clase del asiento (¡con bloqueo de fila!)
      const asientoRes = await client.query(
        `SELECT
           a.asiento_id, a.clase_asiento,
           (SELECT r.reservacion_id FROM reservaciones r WHERE r.asiento_id = a.asiento_id AND r.estado = 'ACTIVA') AS reservado
         FROM asientos a
         WHERE a.asiento_id = $1
         FOR UPDATE`, // Bloquea la fila del asiento para esta transacción
        [asiento_id]
      );

      if (asientoRes.rows.length === 0) {
        throw new Error(`Asiento ID ${asiento_id} no existe.`);
      }
      if (asientoRes.rows[0].reservado) {
        throw new Error(`El asiento ${asiento_id} ya está ocupado.`);
      }

      const { clase_asiento } = asientoRes.rows[0];

      // 4. Calcular precios
      const precio_base = clase_asiento === 'Negocios' ? 550.00 : 250.00;
      const descuento = esVip ? precio_base * 0.10 : 0;
      const precio_total = precio_base - descuento;

      // 5. Insertar reservación
      const newRes = await client.query(
        `INSERT INTO reservaciones (usuario_id, asiento_id, nombre_pasajero, cui_pasajero, tiene_equipaje, metodo_seleccion, precio_base, precio_total, estado, compra_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVA', $9)
         RETURNING *, (SELECT numero_asiento FROM asientos WHERE asiento_id = $2) as numero_asiento`,
        [usuario_id, asiento_id, nombre_pasajero, cui_pasajero, tiene_equipaje, metodo_seleccion, precio_base, precio_total, compraId]
      );

      const reservacionInfo = { ...newRes.rows[0], clase_asiento };
      reservacionesCreadas.push(reservacionInfo);
      precioTotalCompra += parseFloat(precio_total);
    }

    // 6. Si todo salió bien, confirmar transacción
    await client.query('COMMIT');

    // 7. Enviar email de confirmación (asíncrono)
    sendEmail(
      usuario.email,
      'Confirmación de Reserva - FrutigerAirlines',
      getReservationEmail(usuario, reservacionesCreadas, precioTotalCompra.toFixed(2))
    ).catch(err => console.error('Fallo al enviar email de reserva:', err));

    // 8. Responder al cliente
    res.ok('Reservación(es) creada(s) exitosamente.', 'RESERVATION_CREATED', {
      reservaciones: reservacionesCreadas,
      precioTotal: precioTotalCompra.toFixed(2)
    }, 201);

  } catch (error) {
    await client.query('ROLLBACK'); // Revertir todo si algo falló
    console.error('Error en POST /reservaciones:', error);
  res.fail(error.message || 'Error al crear la reservación.', 'RESERVATION_CREATE_ERROR', 400);
  } finally {
    client.release(); // Liberar cliente de pool
  }
});

// GET /api/reservaciones/usuario/:usuarioId
router.get('/usuario/:usuarioId', async (req, res) => {
    const { usuarioId } = req.params;
  try {
        const { rows } = await query(
            `SELECT r.*, a.numero_asiento, a.clase_asiento
             FROM reservaciones r
             JOIN asientos a ON r.asiento_id = a.asiento_id
             WHERE r.usuario_id = $1
             ORDER BY r.fecha_reservacion DESC`,
            [usuarioId]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener reservaciones del usuario.' });
    }
});

// PUT /api/reservaciones/:reservacionId (Modificar)
router.put('/:reservacionId', async (req, res) => {
  const { reservacionId } = req.params;
  const { nuevo_asiento_id, cui_pasajero } = req.body;

    if (!nuevo_asiento_id || !cui_pasajero) {
    return res.fail('Se requiere nuevo_asiento_id y cui_pasajero.', 'RESERVATION_MODIFY_VALIDATION', 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Validar reserva original y pasajero
    const oldRes = await client.query(
      "SELECT r.*, a.clase_asiento FROM reservaciones r JOIN asientos a ON r.asiento_id = a.asiento_id WHERE r.reservacion_id = $1 AND r.cui_pasajero = $2 AND r.estado = 'ACTIVA'",
      [reservacionId, cui_pasajero]
    );
    if (oldRes.rows.length === 0) {
      throw new Error('Reservación activa no encontrada o CUI no coincide.');
    }
    const reservacionActual = oldRes.rows[0];

    // 2. Validar nuevo asiento (disponible y misma clase)
    const newAsientoRes = await client.query(
      `SELECT
         a.asiento_id, a.clase_asiento,
         (SELECT r.reservacion_id FROM reservaciones r WHERE r.asiento_id = a.asiento_id AND r.estado = 'ACTIVA') AS reservado
       FROM asientos a
       WHERE a.asiento_id = $1
       FOR UPDATE`,
      [nuevo_asiento_id]
    );

    if (newAsientoRes.rows.length === 0) {
      throw new Error('El nuevo asiento no existe.');
    }
    const nuevoAsiento = newAsientoRes.rows[0];

    if (nuevoAsiento.reservado) {
      throw new Error('El nuevo asiento ya está ocupado.');
    }
    if (nuevoAsiento.clase_asiento !== reservacionActual.clase_asiento) {
      throw new Error('Solo se puede modificar por un asiento de la misma clase.');
    }

    // 3. Calcular recargo y nuevo total
    const recargo = parseFloat(reservacionActual.precio_base) * 0.10;
    const nuevoPrecioTotal = parseFloat(reservacionActual.precio_total) + recargo;

    // 4. Registrar la modificación
    await client.query(
      'INSERT INTO modificaciones (reservacion_id, recargo_aplicado) VALUES ($1, $2)',
      [reservacionId, recargo]
    );

    // 5. Actualizar la reservación
    const updatedRes = await client.query(
      "UPDATE reservaciones SET asiento_id = $1, precio_total = $2, fecha_reservacion = NOW() WHERE reservacion_id = $3 RETURNING *",
      [nuevo_asiento_id, nuevoPrecioTotal, reservacionId]
    );

    await client.query('COMMIT');

    // 6. Enviar email (asíncrono)
    const usuario = await query('SELECT * FROM usuarios WHERE usuario_id = $1', [reservacionActual.usuario_id]);
    sendEmail(
        usuario.rows[0].email,
        'Modificación de Reserva Confirmada',
        getModificationEmail(usuario.rows[0], updatedRes.rows[0], recargo.toFixed(2))
    ).catch(err => console.error('Fallo al enviar email de modificación:', err));

    res.ok('Reservación modificada exitosamente.', 'RESERVATION_MODIFIED', {
      reservacion: updatedRes.rows[0],
      recargoAplicado: recargo.toFixed(2)
    }, 200);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en PUT /reservaciones:', error);
  res.fail(error.message || 'Error al modificar la reservación.', 'RESERVATION_MODIFY_ERROR', 400);
  } finally {
    client.release();
  }
});

// DELETE /api/reservaciones/:reservacionId (Cancelar)
router.delete('/:reservacionId', async (req, res) => {
  const { reservacionId } = req.params;
  const { cui_pasajero } = req.body; // Validación por CUI

  if (!cui_pasajero) {
    return res.fail('El CUI del pasajero es requerido para cancelar.', 'RESERVATION_CANCEL_VALIDATION', 400);
  }

  try {
    // 1. Buscar y actualizar la reservación
    const cancelRes = await query(
      `UPDATE reservaciones
       SET estado = 'CANCELADA'
       WHERE reservacion_id = $1 AND cui_pasajero = $2 AND estado = 'ACTIVA'
       RETURNING *`,
      [reservacionId, cui_pasajero]
    );

    if (cancelRes.rows.length === 0) {
      return res.fail('Reservación activa no encontrada o CUI no coincide.', 'RESERVATION_NOT_FOUND_OR_CUI_MISMATCH', 404);
    }

    const reservacionCancelada = cancelRes.rows[0];

    // 2. Enviar email (asíncrono)
    const usuario = await query('SELECT * FROM usuarios WHERE usuario_id = $1', [reservacionCancelada.usuario_id]);
    const asiento = await query('SELECT numero_asiento FROM asientos WHERE asiento_id = $1', [reservacionCancelada.asiento_id]);

    sendEmail(
        usuario.rows[0].email,
        'Cancelación de Reserva Confirmada',
        getCancellationEmail(usuario.rows[0], { ...reservacionCancelada, numero_asiento: asiento.rows[0].numero_asiento })
    ).catch(err => console.error('Fallo al enviar email de cancelación:', err));

    res.ok('Reservación cancelada exitosamente.', 'RESERVATION_CANCELLED', { reservacion: reservacionCancelada }, 200);

  } catch (error) {
    console.error('Error en DELETE /reservaciones:', error);
    res.fail('Error al cancelar la reservación.', 'RESERVATION_CANCEL_ERROR', 500);
  }
});

export default router;
