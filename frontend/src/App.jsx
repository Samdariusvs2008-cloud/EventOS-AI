import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, UserPlus, ChartNoAxesCombined,
  Sparkles, Search, Bell, ArrowUpRight, ArrowDownRight,
  CalendarDays, Armchair, CheckCircle2, Clock3, Menu,
  RefreshCw, X, GraduationCap, Activity
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid,
  XAxis, YAxis, Tooltip, PieChart, Pie, Cell
} from "recharts";
import "./App.css";

const API = "http://127.0.0.1:8000";

const navItems = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Register student", icon: UserPlus },
  { name: "Registrations", icon: Users },
  { name: "Analytics", icon: ChartNoAxesCombined },
  { name: "AI insights", icon: Sparkles },
];

function App() {
  const [page, setPage] = useState("Dashboard");
  const [registrations, setRegistrations] = useState([]);
  const [availability, setAvailability] = useState({
    capacity: 50, confirmed: 0, available_seats: 50, is_full: false
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", college_department: ""
  });

  async function refreshData() {
    setLoading(true);
    setError("");
    try {
      const [listResponse, seatResponse] = await Promise.all([
        fetch(`${API}/registrations`),
        fetch(`${API}/events/1/availability`)
      ]);
      if (!listResponse.ok || !seatResponse.ok) {
        throw new Error("The API returned an error.");
      }
      const list = await listResponse.json();
      const seats = await seatResponse.json();
      setRegistrations(list.items || []);
      setAvailability(seats);
    } catch {
      setError("Can't reach the backend. Make sure your FastAPI server is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  async function generateInsights() {
    setAiLoading(true);
    setAiError("");
    try {
      const response = await fetch(`${API}/ai/insights`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string" ? data.detail : `Request failed: ${response.status}`
        );
      }
      setAiData(data);
    } catch (err) {
      setAiError(err.message || "Unable to generate insights. Check that FastAPI and Ollama are running.");
    } finally {
      setAiLoading(false);
    }
  }

  async function submitRegistration(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          college_department: form.college_department.trim() || null
        })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : "Please check the information you entered."
        );
      }

      setNotice(`Successfully registered ${result.name}. Registration ID: ${result.id}`);
      setForm({ name: "", email: "", college_department: "" });
      await refreshData();
      setPage("Registrations");
    } catch (err) {
      setError(err.message || "Unable to register. Please try again.");
    }
  }

  const filtered = registrations.filter((student) =>
    `${student.name} ${student.email} ${student.college_department || ""}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const recent = [...registrations].reverse().slice(0, 5);
  const fillPercent = Math.min(
    100,
    Math.round((availability.confirmed / availability.capacity) * 100)
  );

  const chartData = registrations.reduce((acc, student) => {
    const date = student.registered_at
      ? new Date(student.registered_at).toLocaleDateString("en", {
          month: "short", day: "numeric"
        })
      : "Unknown";
    const existing = acc.find((item) => item.date === date);
    if (existing) existing.registrations += 1;
    else acc.push({ date, registrations: 1 });
    return acc;
  }, []).slice(-7);

  function navigate(name) {
    setPage(name);
    setMobileMenu(false);
    setError("");
    setNotice("");
    if (name === "Dashboard" || name === "Analytics" || name === "Registrations") {
      refreshData();
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Sparkles size={22} /></div>
          <div>
            <div className="brand-name">eventos<span>·</span></div>
            <div className="brand-subtitle">EVENT INTELLIGENCE</div>
          </div>
          <button className="mobile-close" onClick={() => setMobileMenu(false)}>
            <X size={19} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="navigation">
          {navItems.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${page === name ? "active" : ""}`}
              onClick={() => navigate(name)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{name}</span>
              {name === "AI insights" && <span className="nav-new">NEW</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="event-mini">
            <div className="event-mini-icon"><CalendarDays size={18} /></div>
            <div>
              <div className="event-mini-title">Backend Workshop</div>
              <div className="event-mini-sub">20 October 2026</div>
            </div>
          </div>
          <div className="profile">
            <div className="avatar">EO</div>
            <div className="profile-info">
              <div className="profile-name">EventOS Admin</div>
              <div className="profile-role">Workspace owner</div>
            </div>
            <Activity size={16} className="profile-status" />
          </div>
        </div>
      </aside>

      {mobileMenu && (
        <button
          className="mobile-overlay"
          aria-label="Close menu"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu-button" onClick={() => setMobileMenu(true)}>
            <Menu size={21} />
          </button>
          <div className="breadcrumbs">
            <span>Workspace</span><span className="crumb-slash">/</span>
            <strong>{page}</strong>
          </div>
          <div className="topbar-actions">
            <div className="live-status"><span /> API workspace</div>
            <button className="icon-button" title="Refresh data" onClick={refreshData}>
              <RefreshCw size={17} className={loading ? "spin" : ""} />
            </button>
            <div className="top-avatar">E</div>
          </div>
        </header>

        <div className="page-content">
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
              <button onClick={() => setError("")}><X size={16} /></button>
            </div>
          )}
          {notice && (
            <div className="alert alert-success">
              <CheckCircle2 size={18} /><span>{notice}</span>
              <button onClick={() => setNotice("")}><X size={16} /></button>
            </div>
          )}

          {page === "Dashboard" && (
            <>
              <section className="welcome-row">
                <div>
                  <div className="eyebrow"><span className="eyebrow-dot" /> EVENT OVERVIEW</div>
                  <h1>Your event, <span>in focus.</span></h1>
                  <p className="page-description">
                    A clear view of your registrations, capacity, and event activity.
                  </p>
                </div>
                <button className="primary-button" onClick={() => navigate("Register student")}>
                  <UserPlus size={17} /> Register student
                </button>
              </section>

              <section className="event-banner">
                <div className="banner-glow" />
                <div className="banner-content">
                  <div className="banner-label"><span /> UPCOMING EVENT</div>
                  <h2>Backend Development<br />Workshop</h2>
                  <div className="banner-meta">
                    <span><CalendarDays size={15} /> 20 October 2026</span>
                    <span><GraduationCap size={16} /> Student workshop</span>
                  </div>
                </div>
                <div className="banner-capacity">
                  <div className="capacity-ring" style={{ "--fill": `${fillPercent}%` }}>
                    <div className="capacity-ring-inner">
                      <strong>{fillPercent}%</strong>
                      <span>FILLED</span>
                    </div>
                  </div>
                  <div className="banner-capacity-caption">
                    <strong>{availability.available_seats}</strong>
                    <span>seats remaining</span>
                  </div>
                </div>
                <div className="banner-watermark"><CalendarDays /></div>
              </section>

              <section className="stats-grid">
                <StatCard
                  label="Total registrations"
                  value={availability.confirmed}
                  detail="Confirmed students"
                  icon={Users}
                  tone="violet"
                  footer={`${fillPercent}% of total capacity`}
                />
                <StatCard
                  label="Available seats"
                  value={availability.available_seats}
                  detail="Seats still open"
                  icon={Armchair}
                  tone="blue"
                  footer={availability.is_full ? "Event is full" : "Open for registration"}
                />
                <StatCard
                  label="Event capacity"
                  value={availability.capacity}
                  detail="Maximum attendees"
                  icon={ChartNoAxesCombined}
                  tone="amber"
                  footer="Capacity limit"
                />
                <StatCard
                  label="Latest registrations"
                  value={recent.length}
                  detail="Most recent records shown"
                  icon={Clock3}
                  tone="green"
                  footer="Live from your database"
                />
              </section>

              <section className="dashboard-grid">
                <div className="panel activity-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Registration activity</h3>
                      <p>Registrations by date</p>
                    </div>
                    <button className="subtle-button" onClick={() => navigate("Analytics")}>
                      View analytics <ArrowUpRight size={15} />
                    </button>
                  </div>
                  {chartData.length > 0 ? (
                    <div className="chart-wrap">
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -22, bottom: 0 }}>
                          <defs>
                            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#7965e8" stopOpacity={0.24} />
                              <stop offset="100%" stopColor="#7965e8" stopOpacity={0.01} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#eeedf4" strokeDasharray="4 5" vertical={false} />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#9291a3", fontSize: 11 }} />
                          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#9291a3", fontSize: 11 }} />
                          <Tooltip />
                          <Area type="monotone" dataKey="registrations" stroke="#7965e8" strokeWidth={2.5} fill="url(#areaFill)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyState icon={ChartNoAxesCombined} title="Your activity starts here" text="Registration activity will appear once students register." />
                  )}
                </div>

                <div className="panel capacity-panel">
                  <div className="panel-heading">
                    <div><h3>Capacity overview</h3><p>Live seat availability</p></div>
                    <span className="small-live"><span /> LIVE</span>
                  </div>
                  <div className="capacity-numbers">
                    <div><strong>{availability.confirmed}</strong><span>Registered</span></div>
                    <div><strong>{availability.available_seats}</strong><span>Available</span></div>
                  </div>
                  <div className="progress-track"><div style={{ width: `${fillPercent}%` }} /></div>
                  <div className="progress-labels"><span>0 seats</span><span>{availability.capacity} seats</span></div>
                  <div className="capacity-note">
                    <CheckCircle2 size={16} />
                    {availability.is_full ? "Registration capacity reached." : `${availability.available_seats} seats available for students.`}
                  </div>
                  <button className="outline-button full-button" onClick={() => navigate("Registrations")}>
                    View registrations <ArrowUpRight size={16} />
                  </button>
                </div>
              </section>

              <section className="panel recent-panel">
                <div className="panel-heading">
                  <div><h3>Recent registrations</h3><p>Latest students in your event</p></div>
                  <button className="subtle-button" onClick={() => navigate("Registrations")}>
                    View all <ArrowUpRight size={15} />
                  </button>
                </div>
                <RegistrationTable rows={recent} compact />
              </section>
            </>
          )}

          {page === "Register student" && (
            <section className="subpage">
              <div className="eyebrow"><span className="eyebrow-dot" /> STUDENT MANAGEMENT</div>
              <h1>Register a <span>student.</span></h1>
              <p className="page-description">Add a student to the Backend Development Workshop.</p>
              <div className="form-layout">
                <form className="panel registration-form" onSubmit={submitRegistration}>
                  <div className="form-title"><div className="form-icon"><UserPlus /></div><div><h3>Student details</h3><p>Fields marked with * are required.</p></div></div>
                  <label>Full name <span>*</span><input required minLength={2} maxLength={120} placeholder="e.g. Alex Smith" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
                  <label>Email address <span>*</span><input required type="email" placeholder="alex@university.edu" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                  <label>College / department <small>OPTIONAL</small><input placeholder="e.g. Computer Science" value={form.college_department} onChange={(e) => setForm({ ...form, college_department: e.target.value })} /></label>
                  <div className="form-footer"><span><Activity size={15} /> Saved to your EventOS database</span><button className="primary-button" disabled={availability.is_full}><UserPlus size={16} /> {availability.is_full ? "Event full" : "Complete registration"}</button></div>
                </form>
                <aside className="form-side panel">
                  <div className="side-art"><Users size={34} /></div>
                  <h3>One workshop.<br />Fifty opportunities.</h3>
                  <p>Each registration is validated and saved to your database. Duplicate email addresses are rejected automatically.</p>
                  <div className="side-seat"><div><span>Seats remaining</span><strong>{availability.available_seats}</strong></div><div className="mini-progress"><div style={{ width: `${fillPercent}%` }} /></div></div>
                  <div className="secure-note"><CheckCircle2 size={16} /> Server-side validation enabled</div>
                </aside>
              </div>
            </section>
          )}

          {page === "Registrations" && (
            <section className="subpage">
              <div className="eyebrow"><span className="eyebrow-dot" /> STUDENT MANAGEMENT</div>
              <div className="page-title-row"><div><h1>All <span>registrations.</span></h1><p className="page-description">Search and review registered students.</p></div><button className="primary-button" onClick={() => navigate("Register student")}><UserPlus size={16} /> Add student</button></div>
              <div className="table-summary"><div><strong>{registrations.length}</strong><span> total records</span></div><div className="search-box"><Search size={17} /><input placeholder="Search name, email, department..." value={search} onChange={(e) => setSearch(e.target.value)} /><kbd>⌘ K</kbd></div></div>
              <div className="panel full-table-panel"><RegistrationTable rows={filtered} /></div>
            </section>
          )}

          {page === "Analytics" && (
            <section className="subpage">
              <div className="eyebrow"><span className="eyebrow-dot" /> EVENT PERFORMANCE</div>
              <h1>Numbers with <span>meaning.</span></h1>
              <p className="page-description">An overview calculated from your saved registrations.</p>
              <section className="stats-grid analytics-stats">
                <StatCard label="Registered" value={availability.confirmed} detail="Confirmed students" icon={Users} tone="violet" />
                <StatCard label="Seats remaining" value={availability.available_seats} detail="Room left" icon={Armchair} tone="blue" />
                <StatCard label="Capacity used" value={`${fillPercent}%`} detail="Of event capacity" icon={ChartNoAxesCombined} tone="amber" />
                <StatCard label="Departments known" value={new Set(registrations.map((r) => r.college_department).filter(Boolean)).size} detail="Distinct non-empty entries" icon={GraduationCap} tone="green" />
              </section>
              <div className="analytics-grid">
                <div className="panel"><div className="panel-heading"><div><h3>Registration timeline</h3><p>Based on registration timestamps</p></div></div>
                  {chartData.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height={280}><AreaChart data={chartData}><CartesianGrid stroke="#eeedf4" strokeDasharray="4 5" vertical={false}/><XAxis dataKey="date" axisLine={false} tickLine={false}/><YAxis allowDecimals={false} axisLine={false} tickLine={false}/><Tooltip/><Area dataKey="registrations" type="monotone" stroke="#7965e8" fill="#e9e5ff"/></AreaChart></ResponsiveContainer></div> : <EmptyState icon={ChartNoAxesCombined} title="No data yet" text="Register students to generate your analytics."/>}
                </div>
                <div className="panel"><div className="panel-heading"><div><h3>Seat distribution</h3><p>Registered vs. available</p></div></div>
                  <div className="donut-wrap"><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={[{name:"Registered",value:availability.confirmed},{name:"Available",value:availability.available_seats}]} dataKey="value" innerRadius={68} outerRadius={92} paddingAngle={3}><Cell fill="#7965e8"/><Cell fill="#ebe9f3"/></Pie><Tooltip/></PieChart></ResponsiveContainer><div className="donut-center"><strong>{fillPercent}%</strong><span>FILLED</span></div></div>
                  <div className="legend-row"><span><i className="legend-violet"/>Registered ({availability.confirmed})</span><span><i className="legend-grey"/>Available ({availability.available_seats})</span></div>
                </div>
              </div>
            </section>
          )}

          {page === "AI insights" && (
            <section className="subpage">
              <div className="eyebrow"><span className="eyebrow-dot" /> INTELLIGENCE STUDIO</div>
              <div className="page-title-row">
                <div>
                  <h1>See beyond the <span>numbers.</span></h1>
                  <p className="page-description">Gemma analyses real registration data from your EventOS database.</p>
                </div>
                <button className="primary-button" onClick={generateInsights} disabled={aiLoading}>
                  <Sparkles size={17} /> {aiLoading ? "Analysing..." : aiData ? "Refresh AI insights" : "Generate AI insights"}
                </button>
              </div>

              <div className="ai-hero">
                <div className="ai-orb"><Sparkles size={28}/></div>
                <div>
                  <div className="banner-label"><span/> EVENTOS INTELLIGENCE</div>
                  <h2>Your event, understood.</h2>
                  <p>Local Gemma model · Grounded in your database · Suggestions labelled separately from facts</p>
                </div>
              </div>

              {aiError && <div className="alert alert-error"><span>{aiError}</span><button onClick={() => setAiError("")}><X size={16}/></button></div>}

              <div className="stats-grid analytics-stats">
                <StatCard label="Confirmed registrations" value={aiData?.measured_facts?.confirmed_registrations ?? availability.confirmed} detail="Measured from SQLite" icon={Users} tone="violet" />
                <StatCard label="Seats available" value={aiData?.measured_facts?.available_seats ?? availability.available_seats} detail="Capacity minus registrations" icon={Armchair} tone="blue" />
                <StatCard label="Event capacity" value={aiData?.measured_facts?.capacity ?? availability.capacity} detail="Configured limit" icon={ChartNoAxesCombined} tone="amber" />
                <StatCard label="Departments recorded" value={Object.keys(aiData?.measured_facts?.registrations_by_department || {}).length || new Set(registrations.map((r) => r.college_department).filter(Boolean)).size} detail="From registration records" icon={GraduationCap} tone="green" />
              </div>

              {aiLoading && <div className="panel" style={{ padding: 24, marginTop: 18 }}><p>Gemma is analysing your latest registration data. The first response can take a little while.</p></div>}

              {aiData && !aiLoading && (
                <>
                  <div className="panel" style={{ padding: 24, marginTop: 18 }}>
                    <div className="panel-heading"><div><h3><CheckCircle2 size={18} style={{ display: "inline", verticalAlign: "-3px", marginRight: 8 }}/>Measured facts</h3><p>Returned by the backend from SQLite</p></div><span className="small-live"><span/> DATA</span></div>
                    <div className="insights-grid">
                      {Object.entries(aiData.measured_facts || {}).map(([key, value]) => (
                        <div className="panel insight-card" key={key}>
                          <span className="insight-tag">DATABASE FACT</span>
                          <h3>{key.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase())}</h3>
                          <p>{typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="panel" style={{ padding: 24, marginTop: 18 }}>
                    <div className="panel-heading"><div><h3><Sparkles size={18} style={{ display: "inline", verticalAlign: "-3px", marginRight: 8 }}/>Gemma's analysis</h3><p>AI-generated interpretations and suggestions</p></div><span className="insight-tag">{aiData.model || "LOCAL MODEL"}</span></div>
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.75 }}>{aiData.analysis}</div>
                  </div>
                </>
              )}

              {!aiData && !aiLoading && !aiError && (
                <div className="panel" style={{ padding: 24, marginTop: 18 }}>
                  <div className="honesty-note"><Sparkles size={18}/><p><strong>Ready to analyse.</strong> Select Generate AI insights to send current database facts to Gemma. AI interpretations are suggestions, not measured facts.</p></div>
                </div>
              )}
            </section>
          )}

          <footer className="footer"><span>© 2026 EventOS AI</span><span><span className="footer-dot"/> Built for clearer event management</span></footer>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, detail, icon: Icon, tone, footer }) {
  return (
    <div className="stat-card">
      <div className="stat-top"><span>{label}</span><div className={`stat-icon ${tone}`}><Icon size={19}/></div></div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">{detail}</div>
      {footer && <div className="stat-footer"><span className={`footer-mark ${tone}`}>↗</span>{footer}</div>}
    </div>
  );
}

function RegistrationTable({ rows, compact = false }) {
  if (!rows.length) {
    return <EmptyState icon={Users} title="No registrations found" text="When students register, their records will appear here." />;
  }

  return (
    <div className="table-scroll">
      <table className="registration-table">
        <thead><tr><th>STUDENT</th><th>DEPARTMENT</th><th>REGISTERED</th><th>STATUS</th></tr></thead>
        <tbody>
          {rows.map((student) => (
            <tr key={student.id}>
              <td><div className="student-cell"><div className="student-avatar">{student.name?.trim()?.charAt(0)?.toUpperCase() || "S"}</div><div><strong>{student.name}</strong><span>{student.email}</span></div></div></td>
              <td>{student.college_department || <span className="muted">Not provided</span>}</td>
              <td>{student.registered_at ? new Date(student.registered_at).toLocaleString() : "—"}</td>
              <td><span className="status-pill"><span/> Registered</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }) {
  return <div className="empty-state"><div><Icon size={24}/></div><strong>{title}</strong><p>{text}</p></div>;
}

export default App;

