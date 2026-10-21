/* =====================================================================
   SMART QUEUE - REACT CODE
   This file contains every page of the website (Dashboard, Queue, Book Token,
   Display Board, Track Token, Reports). It talks to the Java backend
   through /api/... requests. Colours and looks are in style.css.
   ===================================================================== */

const { useState, useEffect } = React;
// Services: [average minutes per visitor, chart colour]
const SV = {
  "General Checkup": [10, "#0e7c7b"],
  Consultation: [15, "#3b6ea5"],
  "Lab Tests": [12, "#d1495b"],
  Billing: [5, "#e9a23b"],
  Documentation: [8, "#8a6fb3"],
};

// Priority order: smaller number is served first
const RANK = { Emergency: 0, Senior: 1, Normal: 2 };

// Helper: send a POST request to the Java backend
const post = (u, d = {}) => fetch(u, { method: "POST", body: new URLSearchParams(d) });

// Helper: show a date/time nicely
const fmt = (s) =>
  s
    ? new Date(s).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Walk-in";

// Sidebar menu: [page id, label]
const NAV = [
  ["dash", "Dashboard"],
  ["queue", "Queue"],
  ["book", "Book Token"],
  ["board", "Display Board"],
  ["track", "Track Token"],
  ["report", "Reports"],
];

// The whole application
function App() {
  // ---- STATE (data the page remembers): v = current page, t = all tickets, f = booking form ----
  const [v, setV] = useState("dash"),
    [t, setT] = useState([]),
    [q, setQ] = useState(""),
    [flt, setFlt] = useState("all");
  const [dark, setDark] = useState(localStorage.getItem("dark") === "1"),
    [tk, setTk] = useState(""),
    [slip, setSlip] = useState(null),
    [msg, setMsg] = useState(""),
    [now, setNow] = useState(new Date());
  const [f, setF] = useState({
    name: "",
    phone: "",
    service: "General Checkup",
    priority: "Normal",
    slot: "",
  });

  // ---- TALK TO THE BACKEND: load tickets, call next, book, export CSV ----
  const load = () =>
    fetch("/api/tickets")
      .then((r) => r.json())
      .then((d) => {
        setT(d);
        return d;
      });
  useEffect(() => {
    load();
    const a = setInterval(load, 3000),
      b = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, []);
  useEffect(() => {
    document.body.className = dark ? "dark" : "";
    localStorage.setItem("dark", dark ? 1 : 0);
  }, [dark]);
  const toast = (m) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 2500);
  };
  const act = async (u, d, m) => {
    await post(u, d);
    await load();
    m && toast(m);
  };
  const say = (s) => {
    speechSynthesis.cancel();
    speechSynthesis.speak(
      new SpeechSynthesisUtterance(
        "Token number " + s.id + ", " + s.name + ", please proceed to the counter",
      ),
    );
  };
  const callNext = async () => {
    await post("/api/next");
    const d = await load();
    const s = d.find((x) => x.status === "serving");
    if (s) {
      say(s);
      toast("Token #" + s.id + " called");
    } else toast("Queue is empty");
  };
  const csv = () => {
    const h =
      "Token,Name,Phone,Service,Priority,Slot,Status\n" +
      t
        .map((x) =>
          [x.id, x.name, x.phone, x.service, x.priority, x.slot, x.status]
            .map((c) => '"' + c + '"')
            .join(","),
        )
        .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([h], { type: "text/csv" }));
    a.download = "smartqueue-report.csv";
    a.click();
  };
  const add = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return toast("Please enter a name");
    await post("/api/add", f);
    const d = await load();
    setSlip(d[d.length - 1]);
    setF({ ...f, name: "", phone: "", slot: "", priority: "Normal" });
  };

  // ---- READY-MADE DATA: who is being served, who is waiting, estimated waiting time ----
  const serving = t.find((x) => x.status === "serving");
  const waiting = t
    .filter((x) => x.status === "waiting")
    .sort((a, b) => RANK[a.priority] - RANK[b.priority] || a.id - b.id);
  const done = t.filter((x) => x.status === "done").length;
  let acc = serving ? 5 : 0;
  const eta = {};
  waiting.forEach((x) => {
    eta[x.id] = acc;
    acc += SV[x.service] ? SV[x.service][0] : 10;
  });
  const mins = (s) => Math.max(0, Math.round((now - new Date(s)) / 60000));
  const rows = t.filter(
    (x) =>
      (flt === "all" || x.status === flt) &&
      (x.name + x.service + x.id).toLowerCase().includes(q.toLowerCase()),
  );
  const load2 = Object.keys(SV).map((k) => [k, t.filter((x) => x.service === k).length]),
    max = Math.max(1, ...load2.map((a) => a[1]));
  const Name = ({ x }) => (
    <>
      <b>{x.name}</b>
      <br />
      <small>{x.phone}</small>
    </>
  );
  const Svc = ({ x }) => (
    <>
      <span className="dot" style={{ background: SV[x.service] ? SV[x.service][1] : "#999" }} />
      {x.service}
    </>
  );

  // ---- WHAT APPEARS ON THE SCREEN ----
  return (
    <>
      {/* SIDEBAR */}
      <aside>
        <h1>
          Smart<span>Queue</span>
        </h1>
        {NAV.map(([k, l]) => (
          <a key={k} className={v === k ? "on" : ""} onClick={() => setV(k)}>
            {l}
          </a>
        ))}
        <small onClick={() => setDark(!dark)}>{dark ? "☀ Light mode" : "☾ Dark mode"}</small>
        <small
          onClick={() =>
            confirm("Reset to demo data?") && act("/api/reset", {}, "Demo data restored")
          }
        >
          ↺ Reset demo data
        </small>
      </aside>
      <div className="main">
        <div className="top">
          <h2>{NAV.find((n) => n[0] === v)[1]}</h2>
          <div>
            <span>
              {now.toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}{" "}
              · {now.toLocaleTimeString("en-IN")}
            </span>
            <button onClick={callNext}>Call Next ▶</button>
          </div>
        </div>

        {/* PAGE: dash */}

        {v === "dash" && (
          <>
            <div className="grid g4">
              {[
                ["In queue", waiting.length],
                ["Served today", done],
                ["Emergency / Senior", waiting.filter((x) => x.priority !== "Normal").length],
                ["Est. clear time", acc + " min"],
              ].map(([l, n]) => (
                <div key={l} className="card stat">
                  <span className="lbl">{l}</span>
                  <b>{n}</b>
                </div>
              ))}
            </div>
            <div className="grid g2">
              <div className="card now">
                <span className="lbl">Now serving</span>
                <div className="big">{serving ? "#" + serving.id : "—"}</div>
                <div>{serving ? serving.name + " · " + serving.service : "Counter is free"}</div>
                {serving && (
                  <>
                    <button
                      className="sm amb"
                      style={{ marginTop: 14, marginLeft: 0 }}
                      onClick={() =>
                        act("/api/status", { id: serving.id, status: "done" }, "Marked as done")
                      }
                    >
                      Mark done
                    </button>
                    <button
                      className="sm ghost"
                      style={{ marginTop: 14 }}
                      onClick={() => say(serving)}
                    >
                      Recall 🔊
                    </button>
                  </>
                )}
              </div>
              <div className="card">
                <h3>Next in line</h3>
                {waiting.length === 0 && <p>Queue is empty 🎉</p>}
                {waiting.slice(0, 5).map((x) => (
                  <div
                    key={x.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "8px 0",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <span className="tok">#{x.id}</span>
                    <span style={{ flex: 1 }}>{x.name}</span>
                    <span className={"tag " + x.priority}>{x.priority}</span>
                    <small>~{eta[x.id]}m</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h3>Load by service</h3>
              {load2.map(([k, n]) => (
                <div key={k}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{k}</span>
                    <b>{n}</b>
                  </div>
                  <div className="bar">
                    <i style={{ width: (n / max) * 100 + "%", background: SV[k][1] }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* PAGE: queue */}

        {v === "queue" && (
          <div className="card">
            <div className="tool">
              <input
                placeholder="Search name, service or token…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <div className="chips">
                {["all", "waiting", "serving", "done"].map((k) => (
                  <button key={k} className={flt === k ? "on" : ""} onClick={() => setFlt(k)}>
                    {k[0].toUpperCase() + k.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Name</th>
                  <th>Service</th>
                  <th>Priority</th>
                  <th>Slot</th>
                  <th>Status</th>
                  <th>Wait</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.id} className={x.status === "done" ? "done" : ""}>
                    <td className="tok">#{x.id}</td>
                    <td>
                      <Name x={x} />
                    </td>
                    <td>
                      <Svc x={x} />
                    </td>
                    <td>
                      <span className={"tag " + x.priority}>{x.priority}</span>
                    </td>
                    <td>{fmt(x.slot)}</td>
                    <td>
                      <span className={"tag " + x.status}>{x.status}</span>
                    </td>
                    <td>
                      {x.status === "waiting"
                        ? "~" + eta[x.id] + " min"
                        : x.status === "serving"
                          ? "now"
                          : "—"}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {x.status === "serving" && (
                        <button
                          className="sm"
                          onClick={() =>
                            act("/api/status", { id: x.id, status: "done" }, "Marked as done")
                          }
                        >
                          Done
                        </button>
                      )}
                      {x.status === "waiting" && (
                        <button
                          className="sm red"
                          onClick={() =>
                            act("/api/status", { id: x.id, status: "cancelled" }, "Token cancelled")
                          }
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p style={{ padding: 20, textAlign: "center", color: "var(--mut)" }}>
                No matching tokens
              </p>
            )}
          </div>
        )}

        {/* PAGE: book */}

        {v === "book" && (
          <div className="grid g2">
            <form className="card" onSubmit={add}>
              <h3>New appointment / walk-in</h3>
              <label className="lbl">Full name</label>
              <input
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
                placeholder="e.g. Aditi Sharma"
              />
              <label className="lbl">Phone</label>
              <input
                value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })}
                placeholder="98XXX XXXXX"
              />
              <label className="lbl">Service</label>
              <select value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })}>
                {Object.keys(SV).map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
              <label className="lbl">Priority</label>
              <select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
                <option>Normal</option>
                <option>Senior</option>
                <option>Emergency</option>
              </select>
              <label className="lbl">Appointment time (leave empty for walk-in)</label>
              <input
                type="datetime-local"
                value={f.slot}
                onChange={(e) => setF({ ...f, slot: e.target.value })}
              />
              <button>Generate Token</button>
            </form>
            <div className="card">
              <h3>How it works</h3>
              <p style={{ lineHeight: 1.8, color: "var(--mut)" }}>
                Tokens are served by priority first — <b>Emergency</b>, then <b>Senior</b>, then{" "}
                <b>Normal</b> — and in booking order within each group.
                <br />
                <br />
                Wait time is estimated from the average duration of each service ahead of you.
              </p>
            </div>
          </div>
        )}

        {v === "track" &&
          (() => {
            const x = t.find((a) => String(a.id) === tk.replace("#", "").trim());
            const pos = x ? waiting.findIndex((a) => a.id === x.id) + 1 : 0;
            return (
              <div className="card" style={{ maxWidth: 520 }}>
                <h3>Track my token</h3>
                <input
                  placeholder="Enter token number, e.g. 8"
                  value={tk}
                  onChange={(e) => setTk(e.target.value)}
                />
                {tk && !x && (
                  <p style={{ color: "var(--red)" }}>No active token found with that number.</p>
                )}
                {x && (
                  <div style={{ textAlign: "center" }}>
                    <div className="tok" style={{ fontSize: 56 }}>
                      #{x.id}
                    </div>
                    <h3>{x.name}</h3>
                    <p style={{ margin: "4px 0 10px" }}>
                      {x.service} · {fmt(x.slot)}
                    </p>
                    <span className={"tag " + x.status}>{x.status}</span>
                    {x.status === "waiting" && (
                      <>
                        <div className="bar" style={{ marginTop: 18 }}>
                          <i
                            style={{
                              width: Math.max(8, 100 - (pos / waiting.length) * 100) + "%",
                              background: "var(--acc)",
                            }}
                          />
                        </div>
                        <p>
                          <b>{pos}</b> in line · about <b>{eta[x.id]} min</b> to go
                        </p>
                      </>
                    )}
                    {x.status === "serving" && (
                      <p style={{ marginTop: 16 }}>It is your turn — please go to the counter.</p>
                    )}
                    {x.status === "done" && (
                      <p style={{ marginTop: 16 }}>This visit is complete. Thank you!</p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

        {/* PAGE: report */}

        {v === "report" && (
          <>
            <div className="grid g4">
              {[
                ["Total tokens", t.length],
                ["Completed", done],
                ["Completion rate", Math.round((done / Math.max(1, t.length)) * 100) + "%"],
                [
                  "Avg service time",
                  Math.round(t.reduce((a, x) => a + SV[x.service][0], 0) / Math.max(1, t.length)) +
                    " min",
                ],
              ].map(([l, n]) => (
                <div key={l} className="card stat">
                  <span className="lbl">{l}</span>
                  <b>{n}</b>
                </div>
              ))}
            </div>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h3>Service summary</h3>
                <button className="sm" onClick={csv}>
                  Export CSV
                </button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Total</th>
                    <th>Done</th>
                    <th>Waiting</th>
                    <th>Avg time</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(SV).map((k) => {
                    const a = t.filter((x) => x.service === k);
                    return (
                      <tr key={k}>
                        <td>
                          <span className="dot" style={{ background: SV[k][1] }} />
                          {k}
                        </td>
                        <td>{a.length}</td>
                        <td>{a.filter((x) => x.status === "done").length}</td>
                        <td>{a.filter((x) => x.status === "waiting").length}</td>
                        <td>{SV[k][0]} min</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* PAGE: board */}

        {v === "board" && (
          <div className="board">
            <div className="lbl" style={{ color: "#9cc" }}>
              NOW SERVING
            </div>
            <div className="big">{serving ? "#" + serving.id : "—"}</div>
            <h2 style={{ margin: "8px 0 30px" }}>{serving ? serving.name : "Please wait"}</h2>
            <div className="lbl" style={{ color: "#9cc", marginBottom: 8 }}>
              UP NEXT
            </div>
            {waiting.slice(0, 4).map((x) => (
              <span key={x.id} className="nx">
                <b>#{x.id}</b> {x.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* TOKEN SLIP POPUP */}

      {slip && (
        <div className="ov" onClick={() => setSlip(null)}>
          <div className="slip" onClick={(e) => e.stopPropagation()}>
            <div className="lbl">Your token</div>
            <div className="big">#{slip.id}</div>
            <h3>{slip.name}</h3>
            <p>
              {slip.service} · {slip.priority}
            </p>
            <p style={{ color: "var(--mut)", margin: "6px 0 18px" }}>
              Estimated wait: ~{eta[slip.id] || 0} min
            </p>
            <button onClick={() => window.print()}>Print</button>
            <button className="ghost sm" onClick={() => setSlip(null)}>
              Close
            </button>
          </div>
        </div>
      )}
      {/* MESSAGE TOAST */}
      {msg && <div className="toast">{msg}</div>}
    </>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
