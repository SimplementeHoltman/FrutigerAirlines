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
        COUNT(r.reservacion_id) AS total_reservaciones,
        COUNT(CASE WHEN r.estado = 'ACTIVA' THEN 1 END) AS reservaciones_activas,
        (COUNT(CASE WHEN r.estado = 'ACTIVA' THEN 1 END) >= 5) AS es_vip
      FROM usuarios u
      LEFT JOIN reservaciones r ON u.usuario_id = r.usuario_id
      GROUP BY u.usuario_id
      ORDER BY u.nombre_completo
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al generar reporte de reservaciones por usuario.' });
  }
});

export default router;
