import { processEmailQueue } from './emailCategorization.js';

let queueProcessor = null;
let isProcessing = false;

const PROCESS_INTERVAL = 30000;
const BATCH_SIZE = 5;

export function startQueueProcessor() {
  if (queueProcessor) {
    console.log('📬 Email queue processor already running');
    return;
  }

  console.log('🚀 Starting email queue processor...');

  queueProcessor = setInterval(async () => {
    if (isProcessing) {
      return;
    }

    try {
      isProcessing = true;
      const result = await processEmailQueue(BATCH_SIZE);
      
      if (result.processed > 0 || result.failed > 0) {
        console.log(`📊 Queue processor: ${result.processed} processed, ${result.failed} failed`);
      }
    } catch (error) {
      console.error('Queue processor error:', error);
    } finally {
      isProcessing = false;
    }
  }, PROCESS_INTERVAL);

  console.log(`✅ Email queue processor started (runs every ${PROCESS_INTERVAL / 1000}s)`);
}

export function stopQueueProcessor() {
  if (queueProcessor) {
    clearInterval(queueProcessor);
    queueProcessor = null;
    console.log('⏹️  Email queue processor stopped');
  }
}

export function getProcessorStatus() {
  return {
    running: queueProcessor !== null,
    processing: isProcessing,
    interval: PROCESS_INTERVAL,
    batchSize: BATCH_SIZE
  };
}

export default {
  startQueueProcessor,
  stopQueueProcessor,
  getProcessorStatus
};
