import { create } from 'xmlbuilder2';
import { query } from '../db.js';
import { parseStringPromise } from 'xml2js';
import bcrypt from 'bcryptjs';

/**
 * Exporta todos los datos del sistema a XML.
 */
export const exportarDatosXML = async () => {
  try {
    // 1. Obtener Usuarios
    const usuariosRes = await query(`
      SELECT
        u.email,
        u.nombre_completo,
        u.fecha_creacion,
        (SELECT COUNT(*) FROM reservaciones r WHERE r.usuario_id = u.usuario_id AND r.estado = 'ACTIVA') >= 5 AS esVip
      FROM usuarios u
    `);

    // 2. Obtener Asientos (con estado)
    const asientosRes = await query(`
      SELECT
        a.numero_asiento,
        a.clase_asiento,
        CASE
          WHEN r.reservacion_id IS NOT NULL THEN 'Ocupado'
          ELSE 'Libre'
        END AS estado
      FROM asientos a
      LEFT JOIN reservaciones r ON a.asiento_id = r.asiento_id AND r.estado = 'ACTIVA'
      ORDER BY a.numero_asiento
    `);

    // 3. Obtener Reservaciones (con modificaciones)
    const reservacionesRes = await query(`
      SELECT
        r.reservacion_id,
        r.estado,
        u.email AS usuario_email,
        a.numero_asiento,
        r.nombre_pasajero,
        r.cui_pasajero,
        r.tiene_equipaje,
        r.fecha_reservacion,
        r.metodo_seleccion,
        r.precio_base,
        r.precio_total,
        (
          SELECT json_agg(json_build_object(
            'fecha', m.fecha_modificacion,
            'recargo', m.recargo_aplicado
          ))
          FROM modificaciones m
          WHERE m.reservacion_id = r.reservacion_id
        ) AS modificaciones
      FROM reservaciones r
      JOIN usuarios u ON r.usuario_id = u.usuario_id
      JOIN asientos a ON r.asiento_id = a.asiento_id
    `);

    // Construir el XML
    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('SistemaReservasAvion');

    // <Usuarios>
    const usuariosNode = root.ele('Usuarios');
    for (const user of usuariosRes.rows) {
      usuariosNode.ele('Usuario', { email: user.email, esVip: user.esVip.toString() })
        .ele('nombreCompleto').txt(user.nombre_completo).up()
        .ele('fechaCreacion').txt(new Date(user.fecha_creacion).toLocaleString('es-GT')).up() // Formato DD/MM/YYYY:HH:MM:SS
      .up();
    }

    // <Asientos>
    const asientosNode = root.ele('Asientos');
    for (const asiento of asientosRes.rows) {
      asientosNode.ele('Asiento', {
        numero: asiento.numero_asiento,
        clase: asiento.clase_asiento,
        estado: asiento.estado
      });
    }

    // <Reservaciones>
    const reservacionesNode = root.ele('Reservaciones');
    for (const res of reservacionesRes.rows) {
      const resNode = reservacionesNode.ele('Reservacion', { id: res.reservacion_id, estado: res.estado });
      resNode.ele('usuario').txt(res.usuario_email).up();
      resNode.ele('asiento').txt(res.numero_asiento).up();
      resNode.ele('pasajero')
        .ele('nombreCompleto').txt(res.nombre_pasajero).up()
        .ele('cui').txt(res.cui_pasajero).up()
        .ele('tieneEquipaje').txt(res.tiene_equipaje.toString()).up()
      .up();
      resNode.ele('detalles')
        .ele('fechaReservacion').txt(new Date(res.fecha_reservacion).toLocaleString('es-GT')).up()
        .ele('metodoSeleccion').txt(res.metodo_seleccion).up()
        .ele('precioBase').txt(res.precio_base).up()
        .ele('precioTotal').txt(res.precio_total).up()
      .up();

      // Modificaciones
      if (res.modificaciones && res.modificaciones.length > 0) {
        const modsNode = resNode.ele('Modificaciones');
        for (const mod of res.modificaciones) {
          modsNode.ele('Modificacion')
            .ele('fecha').txt(new Date(mod.fecha).toLocaleString('es-GT')).up()
            .ele('recargo').txt(mod.recargo).up()
            .ele('descripcion').txt('Modificación registrada.').up() // El XML de ejemplo tenía descripción
          .up();
        }
      }
    }

    // Convertir a string XML
    const xml = root.end({ prettyPrint: true });
    return xml;

  } catch (error) {
    console.error('Error al exportar XML:', error);
    throw new Error('No se pudo generar el archivo XML.');
  }
};


/**
 * Importa datos desde un buffer de archivo XML.
 */
export const importarDatosXML = async (xmlBuffer) => {
  const startTime = process.hrtime.bigint();
  const resultados = {
    usuarios_procesados: 0,
    usuarios_fallidos: 0,
    asientos_procesados: 0, // Generalmente no se importan asientos
    asientos_fallidos: 0,
    reservaciones_procesadas: 0,
    reservaciones_fallidas: 0,
    errores: []
  };

  try {
    const data = await parseStringPromise(xmlBuffer.toString('utf-8'));
    const sistema = data.SistemaReservasAvion;

    // Conexión de cliente para transacción
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Procesar Usuarios
      if (sistema.Usuarios && sistema.Usuarios[0].Usuario) {
        for (const user of sistema.Usuarios[0].Usuario) {
          try {
            const email = user.$.email;
            const nombre = user.nombreCompleto[0];
            // Asumir contraseña genérica o no importar
            const tempPassword = await bcrypt.hash('import123', 10);

            // Usar ON CONFLICT para evitar duplicados
            await client.query(
              `INSERT INTO usuarios (email, contrasena, nombre_completo)
               VALUES ($1, $2, $3)
               ON CONFLICT (email) DO NOTHING`,
              [email, tempPassword, nombre]
            );
            resultados.usuarios_procesados++;
          } catch (err) {
            resultados.usuarios_fallidos++;
            resultados.errores.push(`Usuario ${user.$.email}: ${err.message}`);
          }
        }
      }

      // 2. Procesar Asientos (Opcional, generalmente ya existen)
      // Omitido, ya que los asientos se pueblan con setup_data.sql.
      // Se podría actualizar el estado, pero es mejor hacerlo vía reservaciones.

      // 3. Procesar Reservaciones
      if (sistema.Reservaciones && sistema.Reservaciones[0].Reservacion) {
        for (const res of sistema.Reservaciones[0].Reservacion) {
          try {
            const usuarioEmail = res.usuario[0];
            const numeroAsiento = res.asiento[0];
            const estado = res.estado;
            const pasajero = res.pasajero[0];
            const detalles = res.detalles[0];

            // Buscar IDs
            const userRes = await client.query('SELECT usuario_id FROM usuarios WHERE email = $1', [usuarioEmail]);
            const asientoRes = await client.query('SELECT asiento_id FROM asientos WHERE numero_asiento = $1', [numeroAsiento]);

            if (userRes.rows.length === 0 || asientoRes.rows.length === 0) {
              throw new Error(`Usuario o asiento no encontrado (${usuarioEmail} / ${numeroAsiento})`);
            }

            const usuario_id = userRes.rows[0].usuario_id;
            const asiento_id = asientoRes.rows[0].asiento_id;

            // Insertar reservación (manejar duplicados)
            const insertRes = await client.query(
              `INSERT INTO reservaciones
               (usuario_id, asiento_id, nombre_pasajero, cui_pasajero, tiene_equipaje, estado, metodo_seleccion, precio_base, precio_total)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               ON CONFLICT DO NOTHING -- Evita fallos si ya existe (ej. por ID)
               RETURNING reservacion_id`,
              [
                usuario_id,
                asiento_id,
                pasajero.nombreCompleto[0],
                pasajero.cui[0],
                pasajero.tieneEquipaje[0] === 'true',
                estado,
                detalles.metodoSeleccion[0],
                parseFloat(detalles.precioBase[0]),
                parseFloat(detalles.precioTotal[0])
              ]
            );

            if(insertRes.rows.length > 0) {
                resultados.reservaciones_procesadas++;
                const newReservacionId = insertRes.rows[0].reservacion_id;

                // Procesar Modificaciones
                if (res.Modificaciones && res.Modificaciones[0].Modificacion) {
                    for(const mod of res.Modificaciones[0].Modificacion) {
                        await client.query(
                            `INSERT INTO modificaciones (reservacion_id, recargo_aplicado) VALUES ($1, $2)`,
                            [newReservacionId, parseFloat(mod.recargo[0])]
                        );
                    }
                }
            } else {
                resultados.errores.push(`Reservación omitida (posible duplicado): Asiento ${numeroAsiento}`);
            }

          } catch (err) {
            resultados.reservaciones_fallidos++;
            resultados.errores.push(`Reservación ${res.asiento[0]}: ${err.message}`);
          }
        }
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e; // Lanzar el error de transacción
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error fatal al importar XML:', error);
    resultados.errores.push(`Error fatal de parseo o DB: ${error.message}`);
  }

  const endTime = process.hrtime.bigint();
  const timeMs = Number(endTime - startTime) / 1_000_000; // Convertir nanosegundos a milisegundos

  return {
    exitoso: resultados.errores.length === 0,
    ...resultados,
    tiempo_procesamiento: timeMs.toFixed(2)
  };
};
