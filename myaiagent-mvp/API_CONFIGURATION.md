# API Configuration Guide

## Gemini API Key Setup

The AI eligibility analysis feature requires a Google Gemini API key to function. Here's how to set it up:

### 1. Get Your Google API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Generative AI API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Generative Language API"
   - Click "Enable"
4. Create an API key:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key

### 2. Configure for Local Development

For local development, add the API key to the `.env` file in `myaiagent-mvp/backend/`:

```bash
GOOGLE_API_KEY=your_api_key_here
```

### 3. Configure for Production (Fly.io)

If your application is deployed on Fly.io, set the environment variable using the Fly CLI:

```bash
flyctl secrets set GOOGLE_API_KEY=your_api_key_here
```

Or through the Fly.io dashboard:
1. Go to your app dashboard
2. Navigate to "Secrets"
3. Add `GOOGLE_API_KEY` with your API key value

### 4. Verify Configuration

The backend will automatically detect the GOOGLE_API_KEY when:
- The `POST /api/company/ai-eligibility-analysis` endpoint is called
- The system will check for the key in this order:
  1. Environment variable `GOOGLE_API_KEY`
  2. Environment variable `GEMINI_API_KEY`
  3. Database-stored API key (if configured via the secrets endpoint)

### Troubleshooting

#### Error: "Gemini API key not configured"
- Verify the API key is set in your environment
- Restart your backend server after setting the environment variable
- For Fly.io deployments, redeploy after setting secrets: `flyctl deploy`

#### Error: "Response blocked by Gemini safety filters"
- The prompt may have triggered Gemini's safety filters
- Try running the analysis again with different company data
- Contact support if this persists

#### Error: "No response from Gemini"
- Check your API key is valid and hasn't expired
- Verify the Generative Language API is enabled in Google Cloud Console
- Check your quota limits at Google Cloud Console

## Other API Keys

While GOOGLE_API_KEY is required for the AI eligibility analysis feature, other optional API keys include:

- `OPENAI_API_KEY`: For OpenAI models (optional)
- `ELEVENLABS_API_KEY`: For text-to-speech (optional)
- `SAM_GOV_API_KEY`: For SAM.gov integration (optional)

These can be configured similarly through environment variables or the database secrets system.
