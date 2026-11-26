#!/usr/bin/env python3
"""IBRANT local runtime bridge. Binds loopback only; commands run in one chosen workspace."""
import argparse, json, os, secrets, subprocess, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

parser = argparse.ArgumentParser(description='Connect IBRANT Studio to a local project runtime')
parser.add_argument('--workspace', required=True, help='Absolute path to the extracted project folder')
parser.add_argument('--port', type=int, default=4317)
args = parser.parse_args()
WORKSPACE = Path(args.workspace).expanduser().resolve()
if not WORKSPACE.is_dir():
    raise SystemExit(f'Workspace directory does not exist: {WORKSPACE}')
TOKEN = secrets.token_urlsafe(32)

class Handler(BaseHTTPRequestHandler):
    server_version = 'IBRANTLocalAgent/1.0'
    def send_json(self, status, payload):
        data = json.dumps(payload).encode()
        self.send_response(status); self.send_header('Content-Type','application/json')
        self.send_header('Content-Length',str(len(data)))
        self.send_header('Access-Control-Allow-Origin','https://ibrant.vercel.app')
        self.send_header('Vary','Origin'); self.end_headers(); self.wfile.write(data)
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin','https://ibrant.vercel.app')
        self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers','Authorization, Content-Type')
        self.send_header('Access-Control-Allow-Private-Network','true')
        self.send_header('Access-Control-Max-Age','600'); self.end_headers()
    def authorized(self):
        return secrets.compare_digest(self.headers.get('Authorization',''), 'Bearer '+TOKEN)
    def do_GET(self):
        if self.path != '/health': return self.send_json(404, {'error':'Not found'})
        if not self.authorized(): return self.send_json(401, {'error':'Invalid local agent token'})
        self.send_json(200, {'ok':True,'workspace':WORKSPACE.name,'platform':os.name})
    def do_POST(self):
        if self.path != '/run': return self.send_json(404, {'error':'Not found'})
        if not self.authorized(): return self.send_json(401, {'error':'Invalid local agent token'})
        try:
            length = int(self.headers.get('Content-Length','0'))
            if length < 2 or length > 8192: return self.send_json(413, {'error':'Command payload must be 1–8192 bytes'})
            payload = json.loads(self.rfile.read(length))
            command = payload.get('command')
            if not isinstance(command,str) or not command.strip() or len(command)>4096:
                return self.send_json(422, {'error':'Provide a command (maximum 4096 characters)'})
            result = subprocess.run(command, shell=True, cwd=WORKSPACE, capture_output=True, text=True, timeout=120, env=os.environ.copy())
            self.send_json(200, {'exit_code':result.returncode,'stdout':result.stdout[-30000:],'stderr':result.stderr[-30000:],'cwd':str(WORKSPACE)})
        except subprocess.TimeoutExpired:
            self.send_json(408, {'error':'Command exceeded the 120-second execution limit'})
        except Exception as exc:
            self.send_json(400, {'error':str(exc)})
    def log_message(self, fmt, *values): print('[IBRANT agent]', fmt % values)

server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
print('\nIBRANT local runtime agent is ready')
print(f'Workspace: {WORKSPACE}')
print(f'Endpoint: http://127.0.0.1:{args.port}')
print(f'One-time connection token: {TOKEN}')
print('Keep this terminal open. Press Ctrl+C to stop.\n', flush=True)
try: server.serve_forever()
except KeyboardInterrupt: print('\nStopping IBRANT local runtime agent.')
finally: server.server_close()
