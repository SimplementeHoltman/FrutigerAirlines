import { Router } from 'express';
import { query } from '../db.js';
import { validarCUI } from '../services/cuiService.js';

const router = Router();

// GET /api/departamentos
router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM departamentos ORDER BY nombre');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener departamentos.' });
  }
});

// GET /api/departamentos/:codigoDepartamento/municipios
router.get('/:codigoDepartamento/municipios', async (req, res) => {
  const { codigoDepartamento } = req.params;
  try {
    const { rows } = await query(
      `SELECT m.* FROM municipios m
       JOIN departamentos d ON m.departamento_id = d.departamento_id
       WHERE d.codigo = $1
       ORDER BY m.nombre`,
      [codigoDepartamento]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener municipios.' });
  }
});

// POST /api/validar-cui
router.post('/', async (req, res) => {
  const { cui } = req.body;
  if (!cui) {
    return res.status(400).json({ valido: false, message: 'CUI es requerido.' });
  }

  try {
    const resultado = await validarCUI(cui);

    if (!resultado.valido) {
      return res.status(400).json(resultado);
    }

    res.status(200).json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ valido: false, message: 'Error interno del servidor.' });
  }
});

export default router;
