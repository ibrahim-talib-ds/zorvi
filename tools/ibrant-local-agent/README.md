# IBRANT local runtime agent

This opt-in helper lets IBRANT Studio send shell commands to **your own computer**. It binds only to `127.0.0.1`, uses a random bearer token, and confines the working directory to the project folder you select at startup. Commands still execute with your operating-system user permissions; only connect to your own trusted IBRANT session.

## Start

1. Download and extract the project's ZIP to a folder on your computer.
2. Open a terminal in the repository and run:

   ```bash
   python3 tools/ibrant-local-agent/agent.py --workspace "/absolute/path/to/extracted/project"
   ```

3. Copy the one-time token printed by the agent.
4. In IBRANT Playground choose **Connect local runtime**, paste the token, and verify the connected workspace name.
5. Keep the agent terminal open while using Studio. Stop it with Ctrl+C.

The agent supports `GET /health` and `POST /run`, requires the bearer token for both, and allows commands up to 120 seconds. It does not expose a public network listener. The agent is a developer tool, not a multi-tenant hosted execution service.
