import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

// Middlewares
app.use(cors()); // Permitir peticiones de tu frontend Angular
app.use(express.json()); // para parsear application/json
app.use(express.urlencoded({ extended: true })); // para parsear application/x-www-form-urlencoded

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
  res.json({ message: 'Bienvenido a la API de FrutigerAirlines' });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Algo salió mal en el servidor!', details: err.message });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
