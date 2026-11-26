# IBRANT AI Build — free-first setup

AI requests run on the FastAPI backend. Provider credentials belong only in the backend environment; never put a key in frontend code, a public environment variable, a project file, or Git.

## Recommended starting option: Groq free tier

1. Open [Groq Console API keys](https://console.groq.com/keys).
2. Sign in, create an API key, and copy it immediately.
3. Add these variables to the backend environment (do not send the key in chat):

```env
AI_PROVIDER=groq
AI_API_KEY=your_groq_api_key
AI_MODEL=openai/gpt-oss-120b
AI_BASE_URL=https://api.groq.com/openai/v1
AI_REQUEST_TIMEOUT_SECONDS=120
```

Groq offers a free tier, but it is not unlimited and cannot be promised free forever. Its published limits can change, and exceeding them returns rate-limit errors. For `openai/gpt-oss-120b`, the published free limits currently show 30 requests/minute, 1,000/day, 8K tokens/minute and 200K/day. Check your exact organization limits in Groq Console. API keys remain usable until revoked or otherwise disabled; that does not guarantee the service, model, or free quota will remain available indefinitely.

Avoid sending secrets or confidential customer data to any hosted AI provider.

## Other no-cost starting options

### Local Ollama

Ollama can serve an open model from the same machine as the backend. Install Ollama, pull a coding model that fits your RAM/VRAM, then use:

```env
AI_PROVIDER=ollama
AI_MODEL=qwen2.5-coder:7b
AI_BASE_URL=http://127.0.0.1:11434/v1
AI_REQUEST_TIMEOUT_SECONDS=180
```

No hosted inference tokens are billed for local inference, but your own computer/server supplies the electricity and hardware, and speed depends on its memory and GPU. For a remote IBRANT deployment, Ollama must run on the backend host or an accessible private inference server.

## Paid providers

OpenAI and other OpenAI-compatible services are supported by the adapter, but do not configure them for this free-first phase. No paid fallback is enabled automatically.

After changing backend environment variables, restart the backend. Never commit the real environment file or API key.

## Autopilot boundaries and monitoring

- A user approves the project plan once and can enable Auto-build. The worker then generates and saves bounded source-file batches until the plan completes, a human answer is needed, the task fails, or the user/admin pauses or stops it.
- Users can pause, resume, answer a question, or cancel. The task timeline persists in PostgreSQL.
- Admins can view tasks, users, project names, progress, events and errors under Admin → Build Tasks. Admins can pause, stop or retry a failed step. Task failures also create an in-app admin notification; this is not an email/SMS alert.
- The current task runner uses FastAPI background tasks in the API process. Closing the browser is fine while that process stays online; restarting/crashing the backend interrupts active work. Before public production use, move execution to a dedicated durable queue and worker (for example Redis + Celery/RQ), then add worker health monitoring.
- Autopilot does not execute generated code, run shell commands, install packages, apply database migrations, provision cloud services, alter Stripe/payment configuration, or deploy. Backend/database/native app code still needs a real environment and explicit setup. AI validation notes are model-generated; they are not evidence that a test suite, server or database was actually run.

The AI-task and project tables require the Alembic migrations. Do not assume the running database already has them.
