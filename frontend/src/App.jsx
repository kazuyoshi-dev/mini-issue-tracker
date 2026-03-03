import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = "/api";

// token を引数にとる API ラッパ
function createApi(token) {
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  return {
    list: async (q = "", status = "") => {
      const u = new URL(`${API_BASE}/issues`, window.location.origin);
      if (q) u.searchParams.set("q", q);
      if (status) u.searchParams.set("status", status);
      const r = await fetch(u.toString(), {
        headers: authHeader,
      });
      if (!r.ok) throw new Error("list failed");
      return r.json();
    },
    create: async (payload) => {
      const r = await fetch(`${API_BASE}/issues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("create failed");
      return r.json();
    },
    update: async (id, payload) => {
      const r = await fetch(`${API_BASE}/issues/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("update failed");
      return r.json();
    },
    remove: async (id) => {
      const r = await fetch(`${API_BASE}/issues/${id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (!r.ok) throw new Error("delete failed");
    },
    login: async (username, password) => {
      const r = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!r.ok) throw new Error("login failed");
      return r.json(); // { token: "..." }
    },
  };
}

// ログイン画面コンポーネント
function LoginScreen({ onLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const api = createApi("");
      const res = await api.login(username, password);
      onLoggedIn(res.token);
    } catch (e) {
      setError("Invalid credentials. Try again or use the demo account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrapper">
      <div className="header">
        <div className="title">Mini Issue Tracker</div>
      </div>

      <form className="create" onSubmit={handleSubmit}>
        <input
          className="input"
          required
          placeholder="Username (demo)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="input"
          type="password"
          required
          placeholder="Password (demo123)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div style={{ color: "#f66", marginTop: 8 }}>{error}</div>}
        <div className="row">
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  // localStorage から token + exp を読む（期限切れなら破棄）
  const [token, setToken] = useState(() => {
    try {
      const raw = window.localStorage.getItem("authToken");
      if (!raw) return "";
      const data = JSON.parse(raw);

      if (!data.token || !data.exp) {
        window.localStorage.removeItem("authToken");
        return "";
      }
      if (Date.now() > data.exp) {
        window.localStorage.removeItem("authToken");
        return "";
      }
      return data.token;
    } catch {
      window.localStorage.removeItem("authToken");
      return "";
    }
  });

  const api = useMemo(() => createApi(token), [token]);

  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await api.list(q, status));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // ログインしたら一覧ロード

  const loggedIn = !!token;

  async function onCreate(e) {
    e.preventDefault();
    await api.create({ title, description, priority });
    setTitle("");
    setDescription("");
    setPriority("medium");
    await load();
  }

  async function onToggle(i) {
    const next = i.status === "done" ? "open" : "done";
    await api.update(i.id, { status: next });
    await load();
  }

  async function onDelete(id) {
    await api.remove(id);
    await load();
  }

  async function onSearch(e) {
    e.preventDefault();
    await load();
  }

  // ログイン成功時：token + exp(1時間) を保存
  function handleLoggedIn(tok) {
    const ttlMs = 1000 * 60 * 60; // 1 hour
    const payload = {
      token: tok,
      exp: Date.now() + ttlMs,
    };
    window.localStorage.setItem("authToken", JSON.stringify(payload));
    setToken(tok);
  }

  function handleLogout() {
    window.localStorage.removeItem("authToken");
    setToken("");
    setItems([]);
  }

  if (!loggedIn) {
    return <LoginScreen onLoggedIn={handleLoggedIn} />;
  }

  return (
    <div className="wrapper">
      <div className="header">
        <div className="title">Mini Issue Tracker</div>
        <button className="btn btn--ghost" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <form className="toolbar" onSubmit={onSearch}>
        <input
          className="input"
          placeholder="Search title..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">all</option>
          <option value="open">open</option>
          <option value="done">done</option>
        </select>
        <button className="btn" type="submit" disabled={loading}>
          Search
        </button>
      </form>

      <form className="create" onSubmit={onCreate}>
        <input
          className="input"
          required
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="row">
          <select
            className="select"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option>low</option>
            <option>medium</option>
            <option>high</option>
          </select>
          <button className="btn" type="submit" disabled={loading}>
            Create Issue
          </button>
          <div className="count">Count: {items.length}</div>
        </div>
      </form>

      <div className="list">
        {items.map((i) => (
          <div key={i.id} className="card">
            <div className="card__top">
              <div className="card__title">
                [{i.priority}] {i.title}
              </div>
              <span className="badge">{i.status}</span>
            </div>
            {i.description && (
              <div style={{ fontSize: 14, color: "#333" }}>{i.description}</div>
            )}
            <div className="actions">
              <button className="btn" onClick={() => onToggle(i)}>
                {i.status === "done" ? "Reopen" : "Done"}
              </button>
              <button
                className="btn btn--ghost"
                onClick={() => onDelete(i.id)}
              >
                Delete
              </button>
            </div>
            <div className="meta">id: {i.id}</div>
          </div>
        ))}
      </div>
    </div>
  );
}