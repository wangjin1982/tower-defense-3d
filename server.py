#!/usr/bin/env python3
"""本地开发服务器：带 no-cache 头，避免改代码后浏览器用旧缓存。"""
import http.server
import socketserver

PORT = 8124


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


class ThreadedServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    with ThreadedServer(("", PORT), NoCacheHandler) as httpd:
        print(f"Serving on http://localhost:{PORT}")
        httpd.serve_forever()
