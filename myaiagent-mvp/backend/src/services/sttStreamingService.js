import speech from '@google-cloud/speech';
import { query } from '../utils/database.js';
import { decryptSecret } from './secrets.js';
import monitoringService from './monitoringService.js';

class STTStreamingService {
  constructor() {
    this.client = null;
    this.initializeClient();
  }

  async initializeClient() {
    try {
      // Try to get credentials from database first (check both possible key names)
      const result = await query(
        `SELECT key_value FROM api_secrets 
         WHERE key_name IN ('GOOGLE_APPLICATION_CREDENTIALS', 'GOOGLE_APPLICATION_CREDENTIALS_JSON') 
         AND is_active = true
         ORDER BY created_at DESC
         LIMIT 1`
      );

      let credentials;
      if (result.rows.length > 0) {
        const encryptedCreds = result.rows[0].key_value;
        const decryptedCreds = decryptSecret(encryptedCreds);
        credentials = JSON.parse(decryptedCreds);
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // Fallback to environment variable (JSON string or file path)
        try {
          credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        } catch (e) {
          // If not JSON, assume it's a file path
          credentials = undefined; // Let SDK handle file path
        }
      }

      if (credentials) {
        this.client = new speech.SpeechClient({ credentials });
      } else {
        this.client = new speech.SpeechClient();
      }

      console.log('✅ Google Cloud STT client initialized');
    } catch (error) {
      console.error('Failed to initialize STT client:', error);
      this.client = new speech.SpeechClient(); // Fallback to default
    }
  }

  /**
   * Handle WebSocket connection for streaming STT
   * @param {WebSocket} ws - Client WebSocket connection
   * @param {Object} user - Authenticated user object
   */
  handleConnection(ws, user) {
    let recognizeStream = null;
    let sessionStartTime = Date.now();
    let firstPartialTime = null;
    let audioChunksReceived = 0;

    console.log(`🎤 STT streaming session started for user: ${user.email}`);

    // Configure streaming recognition request
    const request = {
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 16000,  // Optimized for speech (was 48000)
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        model: 'latest_short',  // Better for shorter utterances
        useEnhanced: true,
        // Enable voice activity detection
        enableWordTimeOffsets: false,
        maxAlternatives: 1,
        // Enable automatic end-of-speech detection
        enableSpeakerDiarization: false,
        // Metadata for better performance
        metadata: {
          interactionType: 'VOICE_COMMAND',
          microphoneDistance: 'NEARFIELD',
        },
      },
      interimResults: true, // Critical: Get partial results
    };

    // Handle incoming audio chunks from client
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'start') {
          // Initialize streaming recognition
          console.log('🔄 Starting STT stream');
          
          try {
            recognizeStream = this.client.streamingRecognize(request);
          } catch (error) {
            console.error('Failed to start STT stream:', error);
            
            // Track initialization error
            monitoringService.recordWebSocketError(
              '/stt-stream',
              'initialization_error',
              error.message,
              { userId: user.id, errorCode: error.code, credentialsMissing: true }
            ).catch(err => {
              console.error('Monitoring error (non-critical):', err.message);
            });
            
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Google Cloud STT credentials not configured. Please add GOOGLE_APPLICATION_CREDENTIALS secret.',
              error: error.message,
            }));
            return;
          }

          // Handle streaming data from Google STT
          recognizeStream.on('data', async (sttData) => {
            try {
              if (sttData.results && sttData.results.length > 0) {
                const result = sttData.results[0];
                if (result.alternatives && result.alternatives.length > 0) {
                  const transcript = result.alternatives[0].transcript;
                  const confidence = result.alternatives[0].confidence || 0;

                  // Track first partial result latency
                  if (!firstPartialTime) {
                    firstPartialTime = Date.now();
                    const latency = firstPartialTime - sessionStartTime;
                    
                    // Send telemetry (non-blocking, completely isolated)
                    try {
                      monitoringService.recordMetric({
                        userId: user.id,
                        metricType: 'latency',
                        metricName: 'stt_streaming_first_partial',
                        value: latency,
                        unit: 'ms',
                        endpoint: '/stt-stream',
                        method: 'WS',
                      }).catch(err => {
                        console.error('Failed to record STT telemetry (first partial - async):', err.message);
                      });
                    } catch (err) {
                      console.error('Failed to record STT telemetry (first partial - sync):', err.message);
                    }

                    console.log(`⚡ First partial result in ${latency}ms`);
                  }

                  // Send partial or final result to client
                  ws.send(JSON.stringify({
                    type: result.isFinal ? 'final' : 'partial',
                    transcript: transcript,
                    confidence: confidence,
                    isFinal: result.isFinal,
                  }));

                  // If final, track total session time
                  if (result.isFinal) {
                    const totalTime = Date.now() - sessionStartTime;
                    
                    // Send telemetry (non-blocking, completely isolated)
                    try {
                      monitoringService.recordMetric({
                        userId: user.id,
                        metricType: 'latency',
                        metricName: 'stt_streaming_total',
                        value: totalTime,
                        unit: 'ms',
                        endpoint: '/stt-stream',
                        method: 'WS',
                        tags: JSON.stringify({
                          audioChunks: audioChunksReceived,
                          transcriptLength: transcript.length,
                        }),
                      }).catch(err => {
                        console.error('Failed to record STT telemetry (total - async):', err.message);
                      });
                    } catch (err) {
                      console.error('Failed to record STT telemetry (total - sync):', err.message);
                    }

                    console.log(`✅ Final transcript (${totalTime}ms): "${transcript}"`);
                  }
                }
              }
            } catch (err) {
              console.error('Error processing STT data:', err);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to process transcription',
                error: err.message,
              }));
            }
          });

          // Handle STT stream errors
          recognizeStream.on('error', (error) => {
            console.error('STT stream error:', error);
            
            // Track stream error in monitoring system
            monitoringService.recordWebSocketError(
              '/stt-stream',
              'stream_error',
              error.message,
              { userId: user.id, errorCode: error.code }
            ).catch(err => {
              console.error('Monitoring error (non-critical):', err.message);
            });
            
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Speech recognition error',
              error: error.message,
            }));
          });

          // Handle STT stream end
          recognizeStream.on('end', () => {
            console.log('🔚 STT stream ended');
            ws.send(JSON.stringify({
              type: 'stream_ended',
            }));
          });

        } else if (message.type === 'audio') {
          // Receive audio chunk from client
          audioChunksReceived++;

          if (recognizeStream) {
            // Convert base64 audio to buffer and write to STT stream
            const audioBuffer = Buffer.from(message.data, 'base64');
            recognizeStream.write(audioBuffer);
          } else {
            console.warn('Received audio before stream was started');
          }

        } else if (message.type === 'stop') {
          // Client stopped recording - finalize stream
          console.log('🛑 Client stopped recording');
          if (recognizeStream) {
            recognizeStream.end();
          }
        }
      } catch (error) {
        console.error('Error handling STT message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process audio',
          error: error.message,
        }));
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      console.log(`🔌 STT session closed for user: ${user.email}`);
      if (recognizeStream) {
        recognizeStream.end();
        recognizeStream = null;
      }
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (recognizeStream) {
        recognizeStream.end();
        recognizeStream = null;
      }
    });

    // Send ready signal to client
    ws.send(JSON.stringify({
      type: 'ready',
      message: 'STT streaming service ready',
    }));
  }
}

export default new STTStreamingService();
