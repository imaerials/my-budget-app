import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { getDb } from './db/schema.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Init DB on startup
getDb();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Budget API running on http://localhost:${PORT}`);
});
