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
  console.log('[gestionDatos] POST /api/importar/xml recibido');
  if (!req.file) {
    return res.status(400).json({ message: 'No se recibió ningún archivo XML.' });
  }

  try {
    console.log('[gestionDatos] Llamando a importarDatosXML...');
  const resultado = await importarDatosXML(req.file.buffer);
  console.log('[gestionDatos] Importación finalizada. exitoso=%s, totales: U%s/A%s/R%s', resultado?.exitoso, resultado?.usuarios_procesados, resultado?.asientos_procesados, resultado?.reservaciones_procesadas);
  res.status(200).json({ ...resultado, route: 'gestionDatos-v2' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al procesar el XML.', error: error.message });
  }
});

// Alias nuevos: /api/xml/export y /api/xml/import
// GET /api/xml/export
router.get('/export', async (req, res) => {
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

// POST /api/xml/import
router.post('/import', upload.single('archivo'), async (req, res) => {
  console.log('[gestionDatos] POST /api/xml/import recibido');
  if (!req.file) {
    return res.status(400).json({ message: 'No se recibió ningún archivo XML.' });
  }
  try {
    console.log('[gestionDatos] Llamando a importarDatosXML (alias /api/xml/import)...');
    const resultado = await importarDatosXML(req.file.buffer);
    res.status(200).json({ ...resultado, route: 'gestionDatos-alias-xml' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al procesar el XML.', error: error.message });
  }
});

export default router;
