import * as dotenv from 'dotenv';
import app from './app';

dotenv.config();

const PORT = Number(process.env.PORT) || 3001; // Convertendo para número explicitamente

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});