import * as dotenv from 'dotenv';
import { createPool } from 'mysql2/promise';

dotenv.config();

const pool = process.env.NODE_ENV === 'production' 
  ? createPool({
      uri: 'mysql://root:HQvSVoeSQzKLJKgaIRVTwUgBNbrGStGF@junction.proxy.rlwy.net:22680/railway',
      waitForConnections: true,
      connectionLimit: 10,
    })
  : createPool({
      host: "junction.proxy.rlwy.net",
      user: "root",
      password: "HQvSVoeSQzKLJKgaIRVTwUgBNbrGStGF",
      database: "railway",
      port: 22680,
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