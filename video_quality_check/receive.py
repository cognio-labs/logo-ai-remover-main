from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path


DEST = Path(__file__).with_name("browser-output.mp4")


class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "http://localhost:5678")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > 30_000_000:
            self.send_error(413)
            return
        DEST.write_bytes(self.rfile.read(length))
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "http://localhost:5678")
        self.end_headers()
        self.wfile.write(str(DEST.stat().st_size).encode())


HTTPServer(("127.0.0.1", 8765), Handler).serve_forever()
