# IBRANT local runtime agent

This opt-in helper connects IBRANT Studio to a project workspace on your own computer. It binds only to `127.0.0.1`, authenticates requests with a random bearer token, and keeps preview traffic on the local machine.

**Security:** commands and development servers execute with your operating-system user's permissions. The agent is not a sandbox. Only connect it to your own trusted IBRANT session, and stop it when you finish.

## Start or upgrade

1. Stop any older agent process with Ctrl+C.
2. From the repository, run:

   ```bash
   python3 tools/ibrant-local-agent/agent.py --workspace "/absolute/path/to/project-workspace"
   ```

3. Copy the newly printed one-time token.
4. In IBRANT Studio select **Connect local runtime** and paste the token.
5. Keep this terminal open while previewing projects.

## Project preview workflow

For saved cloud projects, Studio syncs the project source into a dedicated `.ibrant-preview/<project-id>` folder under the selected workspace. It then starts the detected development server as a persistent process and displays it through the local preview proxy.

Current automatic adapters:
- Static HTML projects: Python HTTP server
- Vite projects: `npm install` then `npm run dev`
- Next.js projects: `npm install` then `npm run dev`
- Flutter: `flutter pub get` then Flutter Web server (Flutter Web must be installed/enabled)
- Django: `python manage.py runserver`
- FastAPI: assumes `main:app` and starts Uvicorn
- Flask: assumes `app.py` and starts Flask

The preview proxy supports ordinary HTTP requests. WebSocket-based hot-module reload is not currently proxied, so a development server may require a manual refresh after edits. CLI-only programs do not have a browser preview.

## Endpoints

- `GET /health`: agent health and runtime version
- `POST /run`: run a one-shot command in the selected workspace (120-second limit)
- `POST /sync`: sync saved project source (20 MB maximum)
- `POST /start`: start a persistent preview process
- `GET /ready/<session-id>`: check whether its port is accepting connections
- `GET /output/<session-id>`: retrieve recent process output
- `GET /preview/<session-id>/...`: proxy HTTP traffic to the preview process
- `DELETE /`: stop a preview process (JSON body with `session_id`)

The listener is local-only and is not a hosted multi-tenant execution service.
