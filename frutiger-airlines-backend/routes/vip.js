import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/usuarios/:usuarioId/vip
router.get('/:usuarioId/vip', async (req, res) => {
  const { usuarioId } = req.params;
  const reservacionesRequeridas = 5;

  try {
    const { rows } = await query(
      "SELECT COUNT(*) AS total_reservaciones FROM reservaciones WHERE usuario_id = $1 AND estado = 'ACTIVA'",
      [usuarioId]
    );

    if (rows.length === 0) {
      // Aunque el conteo siempre devuelve 1 fila, esto es por si acaso
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const total = parseInt(rows[0].total_reservaciones, 10);
    const esVip = total >= reservacionesRequeridas;

    res.json({
      es_vip: esVip,
      total_reservaciones: total,
      reservaciones_requeridas: reservacionesRequeridas,
      descuento_aplicable: esVip ? 0.10 : 0
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al verificar estado VIP.' });
  }
});

export default router;
