import app from './app';
import { materialsQueue } from './queues/queue';
import { structureWorker } from './workers/worker';
// import { materialGenerationWorker } from '@/workers/worker';
import logger from '@/utils/logger';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  
  console.log(`Listening on http://localhost:${PORT}`);
});

// Initialize workers
structureWorker.on('ready', () => {
  logger.info('Material generation worker is ready');
});

logger.info('Worker initialized for material generation');

