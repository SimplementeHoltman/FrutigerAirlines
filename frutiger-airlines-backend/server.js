import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import responseFormatter from './utils/response.js';
// Swagger UI (documentación)
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';

// Importar rutas
import authRoutes from './routes/auth.js';
import asientosRoutes from './routes/asientos.js';
import validacionRoutes from './routes/validaciones.js';
import reservacionRoutes from './routes/reservaciones.js';
import gestionDatosRoutes from './routes/gestionDatos.js';
import reporteRoutes from './routes/reportes.js';
import vipRoutes from './routes/vip.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Resolver __dirname en entorno ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(cors()); // Permitir peticiones de tu frontend Angular
app.use(express.json()); // para parsear application/json
app.use(express.urlencoded({ extended: true })); // para parsear application/x-www-form-urlencoded
// Formateador de respuestas (agrega res.ok y res.fail)
app.use(responseFormatter);

// Documentación Swagger (sirviendo YAML externo)
try {
  const swaggerDocument = YAML.load(path.join(__dirname, 'docs', 'openapi.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  // Compatibilidad explícita para responder en la raíz exacta y con barra final
  app.get('/api-docs', swaggerUi.setup(swaggerDocument));
  app.get('/api-docs/', swaggerUi.setup(swaggerDocument));
  app.get('/swagger', swaggerUi.setup(swaggerDocument));
  app.get('/swagger/', swaggerUi.setup(swaggerDocument));
  app.get('/api/docs', swaggerUi.setup(swaggerDocument));
  app.get('/api/docs/', swaggerUi.setup(swaggerDocument));
  console.log('Swagger UI disponible en /api-docs');
} catch (e) {
  console.warn('No se pudo cargar la documentación Swagger:', e?.message);
}

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/asientos', asientosRoutes);
app.use('/api/departamentos', validacionRoutes); // Nota: anidado por /api
app.use('/api/validar-cui', validacionRoutes); // Nota: anidado por /api
app.use('/api/reservaciones', reservacionRoutes);
app.use('/api/exportar', gestionDatosRoutes);
app.use('/api/importar', gestionDatosRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/usuarios', vipRoutes); // Para /api/usuarios/{id}/vip

// Ruta de bienvenida
app.get('/api', (req, res) => {
  res.ok('Bienvenido a la API de FrutigerAirlines', 'WELCOME');
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.fail('Algo salió mal en el servidor!', 'INTERNAL_ERROR', 500, { details: err.message });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
