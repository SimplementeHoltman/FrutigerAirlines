import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Corrección de la variable de entorno para la contraseña
const dbPassword = process.env.DB_PASSWORD || 'tu_contraseña_de_postgres';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: dbPassword,
  port: process.env.DB_PORT,
});

pool.on('connect', () => {
  console.log('Conectado a la base de datos PostgreSQL.');
});

// Función para hacer consultas
export const query = (text, params) => pool.query(text, params);

export default pool;
