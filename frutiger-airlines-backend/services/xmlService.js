import { create } from 'xmlbuilder2';
import pool, { query } from '../db.js';
import { parseStringPromise } from 'xml2js';
import bcrypt from 'bcryptjs';
// Marca de versión para depurar despliegue de servicio
console.log('[xmlService] Cargado módulo xmlService.js (versión: 2025-11-02T-DELETE-cleanup-v2)');

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
    const fmt = (d) => {
      if (!d) return '';
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? '' : dt.toLocaleString('es-GT');
    };
    for (const user of usuariosRes.rows) {
      // Nota: Postgres convierte alias no-quoted a minúsculas. "AS esVip" llega como user.esvip
      const esVipBool = Boolean(user.esvip ?? user.es_vip ?? user.esVip ?? false);
      usuariosNode
        .ele('Usuario', { email: user.email, esVip: esVipBool.toString() })
          .ele('nombreCompleto').txt(user.nombre_completo || '').up()
          .ele('fechaCreacion').txt(fmt(user.fecha_creacion)).up()
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
        .ele('nombreCompleto').txt(res.nombre_pasajero || '').up()
        .ele('cui').txt(res.cui_pasajero || '').up()
        .ele('tieneEquipaje').txt(Boolean(res.tiene_equipaje).toString()).up()
      .up();
      resNode.ele('detalles')
        .ele('fechaReservacion').txt(fmt(res.fecha_reservacion)).up()
        .ele('metodoSeleccion').txt(res.metodo_seleccion || '').up()
        .ele('precioBase').txt(res.precio_base != null ? String(res.precio_base) : '').up()
        .ele('precioTotal').txt(res.precio_total != null ? String(res.precio_total) : '').up()
      .up();

      // Modificaciones
      if (Array.isArray(res.modificaciones) && res.modificaciones.length > 0) {
        const modsNode = resNode.ele('Modificaciones');
        for (const mod of res.modificaciones) {
          modsNode.ele('Modificacion')
            .ele('fecha').txt(fmt(mod.fecha)).up()
            .ele('recargo').txt(mod.recargo != null ? String(mod.recargo) : '0').up()
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
    asientos_procesados: 0,
    asientos_fallidos: 0,
    reservaciones_procesadas: 0,
    reservaciones_fallidas: 0,
    errores: []
  };

  try {
    const data = await parseStringPromise(xmlBuffer.toString('utf-8'));
    const sistema = data && (data.SistemaReservasAvion || data["SistemaReservasAvion"]);

    if (!sistema) {
      throw new Error('XML inválido: nodo raíz <SistemaReservasAvion> no encontrado.');
    }

    // Utilidad para parsear fechas de forma robusta (ISO o dd/mm/yyyy HH:MM[:SS])
    const parseDateFlexible = (val) => {
      if (!val) return null;
      const s = String(val).trim().replace(',', '');
      const d1 = new Date(s);
      if (!isNaN(d1.getTime())) return d1; // ISO u otros formatos válidos
      // Intento dd/mm/yyyy HH:MM[:SS]
      const m = s.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (m) {
        const [_, dd, mm, yyyy, HH, MM, SS] = m;
        const dt = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(HH), Number(MM), Number(SS || 0));
        if (!isNaN(dt.getTime())) return dt;
      }
      return null;
    };

    // Conexión de cliente para transacción
    const client = await pool.connect();

    try {
  await client.query('BEGIN');
  console.log('[XML Import] Iniciando limpieza total de tablas...');

      // 0. Limpiar datos existentes según requerimiento (opción TRUNCATE CASCADE o DELETE)
      const cleanMode = 'DELETE';
      try {
        console.log('[XML Import] DELETE (hijo->padre) modificaciones,reservaciones,usuarios,asientos');
        await client.query('DELETE FROM modificaciones');
        await client.query('DELETE FROM reservaciones');
        await client.query('DELETE FROM usuarios');
        await client.query('DELETE FROM asientos');
      } catch (cleanErr) {
        throw new Error('LIMPIEZA_ERROR(' + cleanMode + '): ' + cleanErr.message);
      }

      // 1. Procesar Usuarios
      if (sistema.Usuarios && sistema.Usuarios[0] && sistema.Usuarios[0].Usuario) {
        for (const user of sistema.Usuarios[0].Usuario) {
          try {
            const email = user.$?.email;
            const nombre = user.nombreCompleto?.[0] ?? '';
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
            resultados.errores.push(`Usuario ${user?.$?.email || '[sin-email]'}: ${err.message}`);
          }
        }
      }

      // 2. Procesar Asientos (según XML)
      if (sistema.Asientos && sistema.Asientos[0] && sistema.Asientos[0].Asiento) {
        for (const as of sistema.Asientos[0].Asiento) {
          try {
            const numero = as.$?.numero;
            const clase = as.$?.clase;
            // Estado se deriva de reservaciones; no se persiste en tabla.
            await client.query(
              `INSERT INTO asientos (numero_asiento, clase_asiento)
               VALUES ($1, $2)`,
              [numero, clase]
            );
            resultados.asientos_procesados++;
          } catch (err) {
            resultados.asientos_fallidos++;
            resultados.errores.push(`Asiento ${as?.$?.numero || '[sin-numero]'}: ${err.message}`);
          }
        }
      }

      // 3. Procesar Reservaciones
      if (sistema.Reservaciones && sistema.Reservaciones[0] && sistema.Reservaciones[0].Reservacion) {
        for (const res of sistema.Reservaciones[0].Reservacion) {
          try {
            // Aislar errores por reservación sin abortar toda la transacción
            await client.query('SAVEPOINT sp_res');
            const usuarioEmail = res.usuario?.[0];
            const numeroAsiento = res.asiento?.[0];
            const estado = res.$?.estado || res.estado || 'ACTIVA';
            const pasajero = res.pasajero?.[0] || {};
            const detalles = res.detalles?.[0] || {};

            // Buscar IDs
            const userRes = await client.query('SELECT usuario_id FROM usuarios WHERE email = $1', [usuarioEmail]);
            const asientoRes = await client.query('SELECT asiento_id FROM asientos WHERE numero_asiento = $1', [numeroAsiento]);

            if (userRes.rows.length === 0 || asientoRes.rows.length === 0) {
              throw new Error(`Usuario o asiento no encontrado (${usuarioEmail} / ${numeroAsiento})`);
            }

            const usuario_id = userRes.rows[0].usuario_id;
            const asiento_id = asientoRes.rows[0].asiento_id;

            // Fecha de reservación (intenta respetar la del XML si es válida)
            const fechaXML = detalles.fechaReservacion?.[0];
            const fechaParsed = parseDateFlexible(fechaXML);

            // Insertar reservación (manejar duplicados)
            const insertRes = await client.query(
              `INSERT INTO reservaciones
               (usuario_id, asiento_id, nombre_pasajero, cui_pasajero, tiene_equipaje, estado, metodo_seleccion, precio_base, precio_total, fecha_reservacion)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, NOW()))
               ON CONFLICT DO NOTHING -- Evita fallos si ya existe (ej. por ID)
               RETURNING reservacion_id`,
              [
                usuario_id,
                asiento_id,
                pasajero.nombreCompleto?.[0] ?? '',
                pasajero.cui?.[0] ?? '',
                (pasajero.tieneEquipaje?.[0] ?? 'false') === 'true',
                estado,
                detalles.metodoSeleccion?.[0] ?? 'Manual',
                parseFloat(detalles.precioBase?.[0] ?? '0'),
                parseFloat(detalles.precioTotal?.[0] ?? '0'),
                fechaParsed
              ]
            );

            if(insertRes.rows.length > 0) {
                resultados.reservaciones_procesadas++;
                const newReservacionId = insertRes.rows[0].reservacion_id;

                // Procesar Modificaciones
                if (res.Modificaciones && res.Modificaciones[0] && res.Modificaciones[0].Modificacion) {
                    for(const mod of res.Modificaciones[0].Modificacion) {
                        try {
                          await client.query('SAVEPOINT sp_mod');
                          const recargoNum = parseFloat(mod.recargo?.[0] ?? '0');
                          await client.query(
                              `INSERT INTO modificaciones (reservacion_id, recargo_aplicado) VALUES ($1, $2)`,
                              [newReservacionId, isNaN(recargoNum) ? 0 : recargoNum]
                          );
                          await client.query('RELEASE SAVEPOINT sp_mod');
                        } catch (modErr) {
                          await client.query('ROLLBACK TO SAVEPOINT sp_mod');
                          resultados.errores.push(`Modificación reservación ${newReservacionId}: ${modErr.message}`);
                        }
                    }
                }
            } else {
                resultados.errores.push(`Reservación omitida (posible duplicado): Asiento ${numeroAsiento}`);
            }

            await client.query('RELEASE SAVEPOINT sp_res');
          } catch (err) {
            // Revertir solo lo de esta reservación
            try { await client.query('ROLLBACK TO SAVEPOINT sp_res'); } catch (_) {}
            resultados.reservaciones_fallidos++;
            resultados.errores.push(`Reservación ${res?.asiento?.[0] || '[sin-asiento]'}: ${err.message}`);
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
    tiempo_procesamiento: timeMs.toFixed(2),
    impl: 'importer:cleanup',
    clean_strategy: 'DELETE'
  };
};
