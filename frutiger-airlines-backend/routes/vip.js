import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/usuarios/:usuarioId/vip
router.get('/:usuarioId/vip', async (req, res) => {
  const { usuarioId } = req.params;
  const reservacionesRequeridas = 5;

  try {
    // Contar COMPRAS (veces que hizo una reservación), no asientos.
    // Aproximamos una compra como el conjunto de filas insertadas en el MISMO instante de fecha_reservacion.
    // Nota: si dos compras ocurren en el mismo segundo, podrían contarse como una (caso raro). Si se necesita exactitud absoluta, introducir un compra_id.
    const { rows } = await query(
      `SELECT COUNT(DISTINCT COALESCE(
           compra_id,
           to_char(date_trunc('second', fecha_reservacion), 'YYYY-MM-DD"T"HH24:MI:SS')
         )) AS total_compras
         FROM reservaciones
        WHERE usuario_id = $1 AND estado = 'ACTIVA'`,
      [usuarioId]
    );

    if (rows.length === 0) {
      // Aunque el conteo siempre devuelve 1 fila, esto es por si acaso
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const totalCompras = parseInt(rows[0].total_compras, 10);
    const esVip = totalCompras >= reservacionesRequeridas;

    res.json({
      es_vip: esVip,
      total_reservaciones: totalCompras,
      reservaciones_requeridas: reservacionesRequeridas,
      descuento_aplicable: esVip ? 0.10 : 0
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al verificar estado VIP.' });
  }
});

export default router;
