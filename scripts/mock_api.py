"""Local mock backend for frontend testing without a real new-api server.

Zero-dependency Python stdlib HTTP server on :8088 that returns well-shaped
responses for every endpoint the new-api web frontend calls. Includes a
working /api/setup flow so the setup wizard can be walked through end-to-end.

Endpoints are documented inline. Restart the script to reset in-memory state.
"""

import json
import re
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timezone
from threading import Lock


STATE = {
    "setup_status": False,         # becomes True after POST /api/setup
    "demo_site_enabled": False,
    "self_use_mode_enabled": False,
    "root_username": "root",
    "logins": {},                  # token -> {username, role}
    "users": {
        1: {"id": 1, "username": "admin", "display_name": "Admin",
            "role": 0, "status": 1, "email": "admin@example.com",
            "group": "default", "balance": 0.0, "used_quota": 0},
        2: {"id": 2, "username": "alice", "display_name": "Alice",
            "role": 1, "status": 1, "email": "alice@example.com",
            "group": "vip",   "balance": 12.34, "used_quota": 1024},
        3: {"id": 3, "username": "bob",   "display_name": "Bob",
            "role": 1, "status": 1, "email": "bob@example.com",
            "group": "default","balance": 0.0,    "used_quota": 0},
    },
    "channels": [],
    "tokens": [],
}
LOCK = Lock()


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def ok(handler, body):
    payload = json.dumps({"success": True, "data": body}).encode("utf-8")
    handler.send_response(200)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(payload)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Headers", "*")
    handler.end_headers()
    handler.wfile.write(payload)


def err(handler, code, msg):
    payload = json.dumps({"success": False, "message": msg, "data": None}).encode("utf-8")
    handler.send_response(code)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(payload)))
    handler.end_headers()
    handler.wfile.write(payload)


def read_json_body(handler):
    length = int(handler.headers.get("Content-Length", "0") or 0)
    if length <= 0:
        return {}
    raw = handler.rfile.read(length).decode("utf-8")
    try:
        return json.loads(raw)
    except Exception:
        return {}


# ---------------- Route handlers ----------------

def handle_setup_get(handler, params=None):
    with LOCK:
        if STATE["setup_status"]:
            return ok(handler, {
                "status": True,
                "root_init": True,
                "database_type": "sqlite",
                "Version": "0.0.0-mock",
                "SelfUseModeEnabled": STATE["self_use_mode_enabled"],
                "DemoSiteEnabled": STATE["demo_site_enabled"],
            })
        # Not yet initialized -> wizard shows full flow
        return ok(handler, {
            "status": False,
            "root_init": False,
            "database_type": "sqlite",
            "Version": "0.0.0-mock",
            "SelfUseModeEnabled": False,
            "DemoSiteEnabled": False,
        })


def handle_setup_post(handler, body):
    # Accept either raw fields or the new API's wrapped form
    username = body.get("username") or ""
    password = body.get("password") or ""
    confirm  = body.get("confirmPassword") or body.get("confirm_password") or ""
    if username and (not password or len(password) < 8 or password != confirm):
        return err(handler, 400, "Invalid administrator credentials (min 8 chars, both passwords must match)")
    with LOCK:
        STATE["setup_status"] = True
        STATE["demo_site_enabled"] = bool(body.get("DemoSiteEnabled"))
        STATE["self_use_mode_enabled"] = bool(body.get("SelfUseModeEnabled"))
        STATE["root_username"] = username or "root"
        # Pre-create the root user so /api/user/self can answer after init
        STATE["users"][1] = {
            "id": 1, "username": STATE["root_username"],
            "display_name": STATE["root_username"],
            "role": 0, "status": 1, "email": "root@example.com",
            "group": "default", "balance": 0.0, "used_quota": 0,
        }
        return ok(handler, {
            "status": True,
            "root_init": True,
            "database_type": "sqlite",
            "Version": "0.0.0-mock",
            "SelfUseModeEnabled": STATE["self_use_mode_enabled"],
            "DemoSiteEnabled": STATE["demo_site_enabled"],
        })


def handle_status(handler, params=None):
    return ok(handler, {
        "system_name": "New API",
        "logo": "",
        "register_enabled": True,
        "self_use_mode_enabled": STATE["self_use_mode_enabled"],
        "demo_site_enabled": STATE["demo_site_enabled"],
        "display_token_stat_enabled": True,
        "HeaderNavModules": {
            "home": True,
            "console": True,
            "pricing": {"enabled": True, "requireAuth": False},
            "rankings": {"enabled": True, "requireAuth": False},
            "skillRanking": {"enabled": True, "requireAuth": True},
            "docs": True,
            "about": True,
        },
        "faq_enabled": True,
        "faq": [
            {"id": 1, "question": "How do I get an API key?",
             "answer": "Open the **API Keys** page and click \"Create Key\"."},
            {"id": 2, "question": "Where can I see my token usage?",
             "answer": "Dashboard **Consumption** panel."},
        ],
        "announcements_enabled": True,
        "announcements": [
            {"id": 1, "type": "success",
             "content": "Welcome to the local mock backend.",
             "publishDate": now_iso(), "extra": ""},
        ],
        "api_info_enabled": True,
        "api_info": [
            {"url": "https://api.example.com/v1",
             "route": "/v1/chat/completions",
             "description": "OpenAI-compatible chat completions."},
        ],
        "uptime_kuma_enabled": False,
        "user_agreement_enabled": False,
        "privacy_policy_enabled": False,
    })


def handle_user_self(handler, params=None):
    with LOCK:
        u = STATE["users"][1]
        return ok(handler, dict(u))


def handle_login_post(handler, body):
    username = body.get("username") or ""
    password = body.get("password") or ""
    if not STATE["setup_status"] and STATE["root_username"] == "root":
        return err(handler, 401, "System not initialized yet")
    if username and password:
        token = "mock-token-" + username
        with LOCK:
            STATE["logins"][token] = {"username": username, "role": 0}
        return ok(handler, {"token": token, "user": {"id": 1, "username": username, "role": 0}})
    return err(handler, 400, "username/password required")


def handle_users_list(handler, params):
    page = int(params.get("p", ["0"])[0] or 0)
    size = int(params.get("size", ["10"])[0] or 10)
    with LOCK:
        items = list(STATE["users"].values())
        total = len(items)
        sliced = items[page * size:(page + 1) * size]
    return ok(handler, {"items": sliced, "total": total, "page": page, "size": size})


def handle_announcement(handler, params):
    return ok(handler, [])


def handle_about(handler, params=None):
    return ok(handler, "# About\n\nMock backend for local frontend testing.")


def handle_privacy(handler, params=None):
    return ok(handler, "# Privacy\n\nNo real data, all responses are faked.")


def handle_home_page_content(handler, params=None):
    return ok(handler, "")


def handle_uptime_status(handler, params=None):
    return ok(handler, [])


def handle_404(handler, path):
    # Catch-all returns success+empty so unmapped pages don't 500 during preview
    return ok(handler, {})


# ---------------- Router ----------------

ROUTES = {
    ("GET",   "/api/setup"):                  handle_setup_get,
    ("POST",  "/api/setup"):                  handle_setup_post,
    ("GET",   "/api/status"):                 handle_status,
    ("GET",   "/api/user/self"):              handle_user_self,
    ("POST",  "/api/user/login"):             handle_login_post,
    ("GET",   "/api/user/?"):                 handle_users_list,
    ("GET",   "/api/announcement"):           handle_announcement,
    ("GET",   "/api/about"):                  handle_about,
    ("GET",   "/api/privacy"):                handle_privacy,
    ("GET",   "/api/home_page_content"):      handle_home_page_content,
    ("GET",   "/api/uptime/status"):          handle_uptime_status,
}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass  # silence default access log

    def _do(self, method):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        for (m, p), func in ROUTES.items():
            if method == m and (path == p.rstrip("?") or (p.endswith("?") and path == p.rstrip("?"))):
                if method in ("POST", "PUT", "PATCH"):
                    body = read_json_body(self)
                    return func(self, body)
                return func(self, params)

        # Try pattern-based matches
        if method == "GET" and re.match(r"^/api/user/?$", path):
            return handle_users_list(self, params)
        if method == "GET" and re.match(r"^/api/.*$", path):
            return handle_404(self, path)

        return handle_404(self, path)

    def do_GET(self):    return self._do("GET")
    def do_POST(self):   return self._do("POST")
    def do_PUT(self):    return self._do("PUT")
    def do_PATCH(self):  return self._do("PATCH")
    def do_DELETE(self): return self._do("DELETE")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()


if __name__ == "__main__":
    addr = ("127.0.0.1", 8088)
    httpd = HTTPServer(addr, Handler)
    print(f"[mock_api] listening on http://{addr[0]}:{addr[1]}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
