-- Add TTS preferences to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS tts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tts_voice_id VARCHAR(255) DEFAULT 'EXAVITQu4vr4xnSDxMaL';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_tts 
ON user_preferences(user_id, tts_enabled);

-- Add comment for documentation
COMMENT ON COLUMN user_preferences.tts_enabled IS 'Whether text-to-speech is enabled for this user';
COMMENT ON COLUMN user_preferences.tts_voice_id IS 'Selected ElevenLabs voice ID for TTS playback';
