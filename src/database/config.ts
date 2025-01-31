import * as dotenv from 'dotenv';
import { createPool } from 'mysql2/promise';

dotenv.config();

const pool = process.env.NODE_ENV === 'production' 
  ? createPool({
      uri: 'mysql://root:naTOSrkCcndmdAcNkEwXmwnrsZIarmMU@roundhouse.proxy.rlwy.net:57541/railway',
      waitForConnections: true,
      connectionLimit: 10,
    })
  : createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: Number(process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 10,
    });

pool.getConnection()
  .then(connection => {
    console.log('Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('Error connecting to the database:', err);
  });

export default pool;