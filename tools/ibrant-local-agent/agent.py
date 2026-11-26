#!/usr/bin/env python3
"""Authenticated loopback runtime and HTTP preview proxy for IBRANT Studio."""
import argparse
import http.client
import json
import os
import secrets
import shutil
import signal
import socket
import subprocess
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

parser = argparse.ArgumentParser(description="Connect IBRANT Studio to a local project runtime")
parser.add_argument("--workspace", required=True, help="Absolute path to the local project workspace")
parser.add_argument("--port", type=int, default=4317)
args = parser.parse_args()
WORKSPACE = Path(args.workspace).expanduser().resolve()
if not WORKSPACE.is_dir():
    raise SystemExit(f"Workspace directory does not exist: {WORKSPACE}")
TOKEN = secrets.token_urlsafe(32)
PREVIEW_ROOT = WORKSPACE / ".ibrant-preview"
SESSIONS = {}
LOCK = threading.Lock()
ALLOWED_ORIGINS = {"https://ibrant.vercel.app"}

def safe_project_dir(name):
    clean = "".join(c for c in name if c.isalnum() or c in "-_")[:48] or "project"
    target = (PREVIEW_ROOT / clean).resolve()
    if PREVIEW_ROOT.resolve() not in target.parents:
        raise ValueError("Invalid project directory")
    return target

class Handler(BaseHTTPRequestHandler):
    server_version = "IBRANTLocalAgent/2.0"

    def cors(self):
        origin = self.headers.get("Origin", "")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")

    def send_json(self, status, payload):
        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.cors()
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def authorized(self):
        return secrets.compare_digest(self.headers.get("Authorization", ""), "Bearer " + TOKEN)

    def body_json(self, limit=25 * 1024 * 1024):
        length = int(self.headers.get("Content-Length", "0"))
        if length < 2 or length > limit:
            raise ValueError("Request body is empty or exceeds the size limit")
        return json.loads(self.rfile.read(length))

    def do_GET(self):
        if self.path.startswith("/preview/"):
            return self.proxy_preview()
        if not self.authorized():
            return self.send_json(401, {"error": "Invalid local agent token"})
        if self.path == "/health":
            return self.send_json(200, {"ok": True, "runtime_version": 2, "workspace": WORKSPACE.name, "platform": os.name})
        if self.path.startswith("/ready/") or self.path.startswith("/output/"):
            route, sid = self.path.split("/", 2)[1:]
            with LOCK:
                session = SESSIONS.get(sid)
            if not session:
                return self.send_json(404, {"error": "Runtime session not found"})
            if route == "ready":
                ready = False
                try:
                    with socket.create_connection(("127.0.0.1", session["port"]), timeout=0.4):
                        ready = True
                except OSError:
                    pass
                return self.send_json(200, {"ready": ready, "running": session["process"].poll() is None})
            with LOCK:
                output = "".join(session["output"][-120:])
            return self.send_json(200, {"output": output, "running": session["process"].poll() is None})
        if self.path == "/sessions":
            with LOCK:
                items = [{"id": key, "port": item["port"], "running": item["process"].poll() is None,
                          "started_at": item["started_at"], "cwd": str(item["cwd"])}
                         for key, item in SESSIONS.items()]
            return self.send_json(200, {"sessions": items})
        return self.send_json(404, {"error": "Not found"})

    def do_POST(self):
        if self.path.startswith("/preview/"):
            return self.proxy_preview()
        if not self.authorized():
            return self.send_json(401, {"error": "Invalid local agent token"})
        try:
            if self.path == "/run":
                payload = self.body_json(8192)
                command = payload.get("command")
                if not isinstance(command, str) or not command.strip() or len(command) > 4096:
                    return self.send_json(422, {"error": "Provide a command (maximum 4096 characters)"})
                result = subprocess.run(command, shell=True, cwd=WORKSPACE, capture_output=True,
                                        text=True, timeout=120, env=os.environ.copy())
                return self.send_json(200, {"exit_code": result.returncode, "stdout": result.stdout[-30000:],
                                            "stderr": result.stderr[-30000:], "cwd": str(WORKSPACE)})
            if self.path == "/sync":
                payload = self.body_json()
                project = safe_project_dir(str(payload.get("project", "project")))
                files = payload.get("files")
                if not isinstance(files, dict) or not files or len(files) > 2000:
                    return self.send_json(422, {"error": "A non-empty project file map is required (maximum 2000 files)"})
                total = 0
                for rel, content in files.items():
                    if not isinstance(rel, str) or not isinstance(content, str) or len(rel) > 512:
                        return self.send_json(422, {"error": "Invalid project file entry"})
                    rel_path = Path(rel)
                    if rel_path.is_absolute() or any(part in ("..", "") for part in rel_path.parts):
                        return self.send_json(422, {"error": "Unsafe project path"})
                    if any(part in ("node_modules", ".git", ".next", "build", "dist") for part in rel_path.parts):
                        continue
                    encoded = content.encode("utf-8")
                    total += len(encoded)
                    if total > 20 * 1024 * 1024:
                        return self.send_json(413, {"error": "Project source exceeds 20 MB"})
                    dest = (project / rel_path).resolve()
                    if project.resolve() not in dest.parents:
                        return self.send_json(422, {"error": "Unsafe project path"})
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(encoded)
                return self.send_json(200, {"ok": True, "project_dir": str(project), "files_written": len(files)})
            if self.path == "/start":
                payload = self.body_json(8192)
                command, port = payload.get("command"), payload.get("port")
                project = safe_project_dir(str(payload.get("project", "project")))
                if not isinstance(command, str) or not command.strip() or len(command) > 4096:
                    return self.send_json(422, {"error": "A start command is required"})
                if not isinstance(port, int) or not 1024 <= port <= 65535:
                    return self.send_json(422, {"error": "A valid preview port is required"})
                if not project.is_dir():
                    return self.send_json(404, {"error": "Project files have not been synced"})
                try:
                    with socket.create_connection(("127.0.0.1", port), timeout=0.25):
                        return self.send_json(409, {"error": f"Port {port} is already in use. Stop the other server or choose another port."})
                except OSError:
                    pass
                sid = secrets.token_urlsafe(18)
                command = command.replace("__IBRANT_PREVIEW_BASE__", f"/preview/{sid}/")
                proc = subprocess.Popen(command, shell=True, cwd=project, stdout=subprocess.PIPE,
                                        stderr=subprocess.STDOUT, text=True, bufsize=1,
                                        env={**os.environ, "HOST": "0.0.0.0", "PORT": str(port)},
                                        start_new_session=True)
                with LOCK:
                    SESSIONS[sid] = {"process": proc, "port": port, "cwd": project,
                                     "started_at": time.time(), "output": []}
                def collect():
                    try:
                        for line in proc.stdout:
                            with LOCK:
                                SESSIONS.get(sid, {}).get("output", []).append(line[-2000:])
                                if len(SESSIONS.get(sid, {}).get("output", [])) > 500:
                                    SESSIONS[sid]["output"] = SESSIONS[sid]["output"][-500:]
                    except Exception:
                        pass
                threading.Thread(target=collect, daemon=True).start()
                return self.send_json(200, {"ok": True, "session_id": sid, "port": port,
                                            "preview_url": f"http://127.0.0.1:{args.port}/preview/{sid}/"})
            return self.send_json(404, {"error": "Not found"})
        except subprocess.TimeoutExpired:
            return self.send_json(408, {"error": "Command exceeded the 120-second execution limit"})
        except Exception as exc:
            return self.send_json(400, {"error": str(exc)})

    def do_HEAD(self):
        if self.path.startswith("/preview/"):
            return self.proxy_preview()
        return self.send_error(405)

    def do_PUT(self):
        if self.path.startswith("/preview/"):
            return self.proxy_preview()
        return self.send_error(405)

    def do_PATCH(self):
        if self.path.startswith("/preview/"):
            return self.proxy_preview()
        return self.send_error(405)

    def do_DELETE(self):
        if self.path.startswith("/preview/"):
            return self.proxy_preview()
        if not self.authorized():
            return self.send_json(401, {"error": "Invalid local agent token"})
        try:
            payload = self.body_json(8192)
            sid = payload.get("session_id")
            with LOCK:
                session = SESSIONS.get(sid)
            if not session:
                return self.send_json(404, {"error": "Runtime session not found"})
            proc = session["process"]
            if proc.poll() is None:
                try:
                    os.killpg(proc.pid, signal.SIGTERM)
                    proc.wait(timeout=4)
                except subprocess.TimeoutExpired:
                    os.killpg(proc.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
            return self.send_json(200, {"ok": True, "stopped": True})
        except Exception as exc:
            return self.send_json(400, {"error": str(exc)})

    def proxy_preview(self):
        parsed = urllib.parse.urlsplit(self.path)
        parts = parsed.path.split("/", 3)
        if len(parts) < 3:
            return self.send_error(404)
        sid = parts[2]
        relative = parts[3] if len(parts) > 3 else ""
        with LOCK:
            session = SESSIONS.get(sid)
        if not session or session["process"].poll() is not None:
            return self.send_error(502, "Preview process is not running")
        target = "/" + relative
        if parsed.query:
            target += "?" + parsed.query
        conn = http.client.HTTPConnection("127.0.0.1", session["port"], timeout=20)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length) if length else None
            headers = {k: v for k, v in self.headers.items()
                       if k.lower() not in ("host", "connection", "content-length", "origin", "accept-encoding")}
            conn.request(self.command, target, body=body, headers=headers)
            upstream = conn.getresponse()
            data = upstream.read(8 * 1024 * 1024 + 1)
            if len(data) > 8 * 1024 * 1024:
                return self.send_error(502, "Preview response exceeded 8 MB")
            content_type = upstream.getheader("Content-Type", "")
            if "text/html" in content_type and data:
                html = data.decode("utf-8", errors="replace")
                prefix = f"/preview/{sid}"
                for attribute in ("src", "href", "action"):
                    html = html.replace(f'{attribute}="/', f'{attribute}="{prefix}/')
                base = f'<base href="/preview/{sid}/">'
                if "<head" in html.lower():
                    import re
                    html = re.sub(r"(<head[^>]*>)", r"\1" + base, html, count=1, flags=re.IGNORECASE)
                else:
                    html = base + html
                data = html.encode("utf-8")
            self.send_response(upstream.status, upstream.reason)
            for key, value in upstream.getheaders():
                if key.lower() in ("transfer-encoding", "connection", "content-length", "content-encoding",
                                   "content-security-policy", "x-frame-options", "access-control-allow-origin"):
                    continue
                if key.lower() == "location" and value.startswith("/"):
                    value = f"/preview/{sid}{value}"
                self.send_header(key, value)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(data)
        except Exception as exc:
            self.send_error(502, f"Preview proxy error: {exc}")
        finally:
            conn.close()

    def log_message(self, fmt, *values):
        print("[IBRANT agent]", fmt % values)

server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
print("\nIBRANT local runtime agent is ready")
print(f"Workspace: {WORKSPACE}")
print(f"Endpoint: http://127.0.0.1:{args.port}")
print(f"One-time connection token: {TOKEN}")
print("Keep this terminal open. Press Ctrl+C to stop.\n", flush=True)
try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\nStopping IBRANT local runtime agent.")
finally:
    with LOCK:
        for item in SESSIONS.values():
            if item["process"].poll() is None:
                try:
                    os.killpg(item["process"].pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
    server.server_close()
