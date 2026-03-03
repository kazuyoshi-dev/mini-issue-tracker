from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import os
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

ALLOWED_STATUS = {"open", "done"}
DEFAULT_STATUS = "open"

app = Flask(__name__, static_folder="../frontend/dist", static_url_path="/")
CORS(app)

# SQLiteは絶対パスにしとくと迷子にならん
DB_PATH = os.path.abspath("issues.db")
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# ----- モデル定義（ここが先）-----
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Issue(db.Model):
    __tablename__ = "issue"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default="")
    status = db.Column(db.String(20), default="open")      # open/doing/done
    priority = db.Column(db.String(20), default="medium")  # low/medium/high
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "priority": self.priority,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

# ----- ここで初期化（モデル定義の後）-----
with app.app_context():
    db.create_all()

def require_token(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if auth != "Bearer demo-token":
            return {"error": "unauthorized"}, 401
        return f(*args, **kwargs)
    return wrapper

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/login")
def login():
    data = request.get_json() or {}
    username = data.get("username", "")
    password = data.get("password", "")

    if not username or not password:
        return {"error": "invalid credentials"}, 401

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        return {"error": "invalid credentials"}, 401

    # ここはシンプルに固定トークンでOK（デモ用途）
    return {"token": "demo-token"}, 200

@app.get("/api/issues")
@require_token
def list_issues():
    q = Issue.query
    kw = request.args.get("q", type=str)
    st = request.args.get("status", type=str)

    if kw:
        q = q.filter(Issue.title.contains(kw))
    if st in ALLOWED_STATUS:
        q = q.filter(Issue.status == st)
    # 不正な status は無視して全件にする（ここで return しない）

    items = q.order_by(Issue.created_at.desc()).all()
    return jsonify([i.to_dict() for i in items]), 200

@app.post("/api/issues")
@require_token
def create_issue():
    data = request.get_json() or {}
    status = data.get("status", DEFAULT_STATUS)
    if status not in ALLOWED_STATUS:
        status = DEFAULT_STATUS
    i = Issue(
        title=(data.get("title","") or "").strip(),
        description=(data.get("description","") or "").strip(),
        status=status,
        priority=data.get("priority","medium"),
    )
    if not i.title: return {"error":"title required"}, 400
    db.session.add(i); db.session.commit()
    return i.to_dict(), 201

@app.put("/api/issues/<int:iid>")
@require_token
def update_issue(iid):
    i = Issue.query.get_or_404(iid)
    data = request.get_json() or {}
    if "status" in data:
        s = data["status"]
        if s not in ALLOWED_STATUS:
            s = DEFAULT_STATUS
        i.status = s
    for k in ["title","description","priority"]:
        if k in data and data[k] is not None:
            setattr(i, k, data[k].strip() if isinstance(data[k], str) else data[k])
    db.session.commit()
    return i.to_dict()

@app.delete("/api/issues/<int:iid>")
@require_token
def delete_issue(iid):
    i = Issue.query.get_or_404(iid)
    db.session.delete(i)
    db.session.commit()
    return {"ok": True}

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def spa(path):
    dist = app.static_folder
    file = os.path.join(dist, path)
    if path and os.path.exists(file):
        return send_from_directory(dist, path)
    return send_from_directory(dist, "index.html")

if __name__ == "__main__":
    app.run(port=int(os.getenv("PORT", 5000)), debug=True)