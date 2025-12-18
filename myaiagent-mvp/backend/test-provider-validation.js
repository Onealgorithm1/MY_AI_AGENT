
const allowedProviders = ['openai', 'elevenlabs', 'gemini', 'anthropic', 'stripe', 'google'];
const provider = 'gemini';

if (!allowedProviders.includes(provider)) {
    console.log('FAIL: gemini not allowed');
    process.exit(1);
} else {
    console.log('SUCCESS: gemini is allowed');
}
