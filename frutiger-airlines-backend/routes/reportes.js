import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/reportes/diagrama-asientos
router.get('/diagrama-asientos', async (req, res) => {
  try {
    const asientosRes = await query(`
      SELECT
        a.asiento_id, a.numero_asiento, a.clase_asiento,
        CASE
          WHEN r.reservacion_id IS NOT NULL THEN 'Ocupado'
          ELSE 'Libre'
        END AS estado
      FROM asientos a
      LEFT JOIN reservaciones r ON a.asiento_id = r.asiento_id AND r.estado = 'ACTIVA'
      ORDER BY a.clase_asiento, a.numero_asiento
    `);

    const reporte = {
      asientos_negocios: asientosRes.rows.filter(a => a.clase_asiento === 'Negocios'),
      asientos_economica: asientosRes.rows.filter(a => a.clase_asiento === 'Economica'),
      total_ocupados: asientosRes.rows.filter(a => a.estado === 'Ocupado').length,
      total_libres: asientosRes.rows.filter(a => a.estado === 'Libre').length
    };

    res.json(reporte);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al generar diagrama.' });
  }
});

// GET /api/reportes/estadisticas
router.get('/estadisticas', async (req, res) => {
  try {
    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM usuarios) AS total_usuarios,
        (SELECT COUNT(*) FROM reservaciones) AS total_reservaciones,
        (SELECT COUNT(*) FROM reservaciones WHERE estado = 'ACTIVA') AS reservaciones_activas,
        (SELECT COUNT(*) FROM reservaciones WHERE estado = 'CANCELADA') AS reservaciones_canceladas,
        (SELECT COUNT(*) FROM modificaciones) AS modificaciones_realizadas,
        (SELECT COUNT(DISTINCT r.reservacion_id)
         FROM reservaciones r JOIN asientos a ON r.asiento_id = a.asiento_id
         WHERE r.estado = 'ACTIVA' AND a.clase_asiento = 'Negocios') AS asientos_ocupados_negocios,
        (SELECT COUNT(*) FROM asientos WHERE clase_asiento = 'Negocios') -
          (SELECT COUNT(DISTINCT r.reservacion_id)
           FROM reservaciones r JOIN asientos a ON r.asiento_id = a.asiento_id
           WHERE r.estado = 'ACTIVA' AND a.clase_asiento = 'Negocios') AS asientos_libres_negocios,
        (SELECT COUNT(DISTINCT r.reservacion_id)
         FROM reservaciones r JOIN asientos a ON r.asiento_id = a.asiento_id
         WHERE r.estado = 'ACTIVA' AND a.clase_asiento = 'Economica') AS asientos_ocupados_economica,
        (SELECT COUNT(*) FROM asientos WHERE clase_asiento = 'Economica') -
          (SELECT COUNT(DISTINCT r.reservacion_id)
           FROM reservaciones r JOIN asientos a ON r.asiento_id = a.asiento_id
           WHERE r.estado = 'ACTIVA' AND a.clase_asiento = 'Economica') AS asientos_libres_economica,
        (SELECT COUNT(*) FROM reservaciones WHERE metodo_seleccion = 'Manual') AS seleccion_manual,
        (SELECT COUNT(*) FROM reservaciones WHERE metodo_seleccion = 'Aleatorio') AS seleccion_aleatoria
    `;
    const { rows } = await query(statsQuery);
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al generar estadísticas.' });
  }
});

// GET /api/reportes/reservaciones-usuario
router.get('/reservaciones-usuario', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        u.usuario_id,
        u.email,
        u.nombre_completo,
        -- Compras totales (todas las filas, activas o no)
        COALESCE(
          (
            SELECT COUNT(DISTINCT COALESCE(r2.compra_id, to_char(date_trunc('second', r2.fecha_reservacion), 'YYYY-MM-DD"T"HH24:MI:SS')))
            FROM reservaciones r2
            WHERE r2.usuario_id = u.usuario_id
          ), 0
        ) AS total_reservaciones,
        -- Compras activas
        COALESCE(
          (
            SELECT COUNT(DISTINCT COALESCE(r3.compra_id, to_char(date_trunc('second', r3.fecha_reservacion), 'YYYY-MM-DD"T"HH24:MI:SS')))
            FROM reservaciones r3
            WHERE r3.usuario_id = u.usuario_id AND r3.estado = 'ACTIVA'
          ), 0
        ) AS reservaciones_activas,
        -- Asientos totales (informativo)
        COALESCE((SELECT COUNT(*) FROM reservaciones r4 WHERE r4.usuario_id = u.usuario_id), 0) AS total_asientos,
        -- Asientos activos (informativo)
        COALESCE((SELECT COUNT(*) FROM reservaciones r5 WHERE r5.usuario_id = u.usuario_id AND r5.estado = 'ACTIVA'), 0) AS asientos_activos,
        -- VIP por compras activas
        (
          COALESCE((
            SELECT COUNT(DISTINCT COALESCE(r6.compra_id, to_char(date_trunc('second', r6.fecha_reservacion), 'YYYY-MM-DD"T"HH24:MI:SS')))
            FROM reservaciones r6
            WHERE r6.usuario_id = u.usuario_id AND r6.estado = 'ACTIVA'
          ), 0) >= 5
        ) AS es_vip
      FROM usuarios u
      ORDER BY u.nombre_completo
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al generar reporte de reservaciones por usuario.' });
  }
});

export default router;
