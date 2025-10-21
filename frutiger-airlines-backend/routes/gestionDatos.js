import { Router } from 'express';
import multer from 'multer';
import { exportarDatosXML, importarDatosXML } from '../services/xmlService.js';

const router = Router();

// Configuración de Multer para recibir el archivo XML en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// GET /api/exportar/xml
router.get('/xml', async (req, res) => {
  try {
    const xmlData = await exportarDatosXML();
    res.header('Content-Type', 'application/xml');
    res.header('Content-Disposition', `attachment; filename="FrutigerAirlines_Export_${Date.now()}.xml"`);
    res.status(200).send(xmlData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al generar el XML.', error: error.message });
  }
});

// POST /api/importar/xml
// Usamos upload.single('archivo') - El frontend debe enviar el archivo en un campo 'archivo'
router.post('/xml', upload.single('archivo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se recibió ningún archivo XML.' });
  }

  try {
    const resultado = await importarDatosXML(req.file.buffer);
    res.status(200).json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al procesar el XML.', error: error.message });
  }
});

export default router;
