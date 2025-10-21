import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

const getAsientosQuery = `
  SELECT
    a.asiento_id,
    a.numero_asiento,
    a.clase_asiento,
    CASE
      WHEN r.reservacion_id IS NOT NULL THEN 'Ocupado'
      ELSE 'Libre'
    END AS estado,
    r.reservacion_id
  FROM asientos a
  LEFT JOIN reservaciones r ON a.asiento_id = r.asiento_id AND r.estado = 'ACTIVA'
`;

// GET /api/asientos
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(getAsientosQuery + ' ORDER BY a.numero_asiento');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener asientos.' });
  }
});

// GET /api/asientos/:clase (Negocios o Economica)
router.get('/:clase', async (req, res) => {
  const { clase } = req.params;

  if (clase !== 'Negocios' && clase !== 'Economica') {
    return res.status(400).json({ message: 'Clase inválida. Debe ser "Negocios" o "Economica".' });
  }

  try {
    const { rows } = await query(
      getAsientosQuery + ' WHERE a.clase_asiento = $1 ORDER BY a.numero_asiento',
      [clase]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener asientos por clase.' });
  }
});

// GET /api/asientos/estado/:numeroAsiento
router.get('/estado/:numeroAsiento', async (req, res) => {
  const { numeroAsiento } = req.params;

  try {
    const { rows } = await query(
      getAsientosQuery + ' WHERE a.numero_asiento = $1',
      [numeroAsiento]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Asiento no encontrado.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al verificar estado del asiento.' });
  }
});

export default router;
