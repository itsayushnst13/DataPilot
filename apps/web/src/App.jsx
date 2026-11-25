import { useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Bell, ChevronDown,
  CircleHelp, Clock3, Database, FileBarChart2, LayoutDashboard, Menu,
  MessageSquareText, MoreHorizontal, Plus, Search, Settings, ShieldCheck,
  Sparkles, Table2, Workflow, X
} from "lucide-react";

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "AI Analyst", icon: MessageSquareText },
  { label: "Data Sources", icon: Database },
  { label: "Database Explorer", icon: Table2 },
  { label: "SQL Playground", icon: BarChart3 },
  { label: "Investigations", icon: Workflow },
  { label: "Reports", icon: FileBarChart2 },
  { label: "Agent Monitor", icon: Activity }
];

const metrics = [
  { label: "Total revenue", value: "$284,592", change: "+12.8%", positive: true, note: "vs. previous 30 days" },
  { label: "Total orders", value: "8,549", change: "+8.2%", positive: true, note: "vs. previous 30 days" },
  { label: "Active customers", value: "5,284", change: "+4.6%", positive: true, note: "vs. previous 30 days" },
  { label: "Average order value", value: "$33.29", change: "-2.1%", positive: false, note: "vs. previous 30 days" }
];

const questions = [
  "Why did revenue change last month?",
  "Which products generate the most revenue?",
  "Compare monthly revenue over six months"
];

function App() {
  const [active, setActive] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [question, setQuestion] = useState("");

  const submitQuestion = (event) => {
    event.preventDefault();
    if (!question.trim()) return;
    setActive("AI Analyst");
  };

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><BarChart3 size={20} /></div>
          <div><strong>DataPilot</strong><span>INTELLIGENCE PLATFORM</span></div>
          <button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar"><X size={18} /></button>
        </div>
        <button className="workspace-switch">
          <div className="workspace-avatar">A</div>
          <div className="workspace-copy"><strong>Acme Corporation</strong><span>Free workspace</span></div>
          <ChevronDown size={15} />
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="Main navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${active === label ? "active" : ""}`} onClick={() => { setActive(label); setSidebarOpen(false); }}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {label === "Agent Monitor" && <span className="live-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="usage-card">
          <div className="usage-heading"><span>Monthly usage</span><span>72%</span></div>
          <div className="usage-track"><span /></div>
          <p>72 of 100 AI investigations used</p>
          <button onClick={() => setActive("Settings")}>Manage plan <ArrowUpRight size={13} /></button>
        </div>
        <button className={`nav-item settings-link ${active === "Settings" ? "active" : ""}`} onClick={() => setActive("Settings")}><Settings size={18} /><span>Settings</span></button>
        <div className="profile">
          <div className="profile-avatar">AG</div>
          <div className="profile-copy"><strong>Ayush Gupta</strong><span>Administrator</span></div>
          <MoreHorizontal size={18} />
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><button className="icon-button menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={19} /></button><span>Workspace</span><span className="crumb-slash">/</span><strong>{active}</strong></div>
          <div className="topbar-actions">
            <div className="connection-status"><span /> Demo data connected</div>
            <button className="icon-button" aria-label="Search"><Search size={18} /></button>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button>
            <div className="top-avatar">AG</div>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div><div className="eyebrow"><span className="eyebrow-line" /> MONDAY, NOVEMBER 25, 2026</div><h1>{active === "Overview" ? "Good evening, Ayush" : active}</h1><p>{active === "Overview" ? "Here's what's happening across your business today." : "Explore your business intelligence workspace."}</p></div>
            <button className="primary-button" onClick={() => setActive("AI Analyst")}><Plus size={17} /> New investigation</button>
          </section>

          {active === "Overview" ? (
            <>
              <section className="metric-grid">
                {metrics.map((metric) => <article className="metric-card" key={metric.label}><div className="metric-top"><span>{metric.label}</span><button aria-label={`More about ${metric.label}`}><MoreHorizontal size={18} /></button></div><div className="metric-value">{metric.value}</div><div className="metric-foot"><span className={metric.positive ? "change positive" : "change negative"}>{metric.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{metric.change}</span><span>{metric.note}</span></div></article>)}
              </section>

              <section className="content-grid">
                <article className="panel revenue-panel">
                  <div className="panel-header"><div><h2>Revenue overview</h2><p>Revenue performance over the last 6 months</p></div><button className="select-button">Last 6 months <ChevronDown size={14} /></button></div>
                  <div className="chart-legend"><span><i className="legend-dot revenue-dot" /> Revenue</span><span><i className="legend-dot orders-dot" /> Orders</span></div>
                  <div className="chart-wrap">
                    <div className="y-labels"><span>$60k</span><span>$45k</span><span>$30k</span><span>$15k</span><span>$0</span></div>
                    <div className="chart-main">
                      <div className="grid-lines"><i /><i /><i /><i /><i /></div>
                      <svg viewBox="0 0 700 220" preserveAspectRatio="none" role="img" aria-label="Illustrative demo revenue trend chart">
                        <defs><linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6d7df4" stopOpacity=".22" /><stop offset="100%" stopColor="#6d7df4" stopOpacity="0" /></linearGradient></defs>
                        <path d="M0 166 C45 150 55 154 95 137 S160 145 190 113 S260 125 285 98 S350 115 380 83 S445 100 475 65 S540 85 570 54 S640 65 700 24 L700 220 L0 220Z" fill="url(#revenueFill)" />
                        <path d="M0 166 C45 150 55 154 95 137 S160 145 190 113 S260 125 285 98 S350 115 380 83 S445 100 475 65 S540 85 570 54 S640 65 700 24" fill="none" stroke="#7182f5" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                        <path d="M0 188 C50 183 60 175 95 181 S150 168 190 176 S250 162 285 169 S340 154 380 163 S440 148 475 154 S540 137 570 145 S640 130 700 126" fill="none" stroke="#9aa5b5" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
                      </svg>
                      <div className="x-labels"><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span></div>
                    </div>
                  </div>
                  <div className="demo-note"><span /> Demo visualization · Connect a database to view live metrics</div>
                </article>

                <article className="panel activity-panel">
                  <div className="panel-header"><div><h2>Recent investigations</h2><p>Latest AI-powered analyses</p></div><button className="text-button" onClick={() => setActive("Investigations")}>View all <ArrowUpRight size={14} /></button></div>
                  <div className="investigation-list">
                    <div className="investigation-item"><div className="investigation-icon purple"><Sparkles size={16} /></div><div className="investigation-copy"><strong>Revenue performance analysis</strong><span><Clock3 size={12} /> 12 minutes ago</span></div><span className="status-pill completed">Completed</span></div>
                    <div className="investigation-item"><div className="investigation-icon blue"><BarChart3 size={16} /></div><div className="investigation-copy"><strong>Top product categories</strong><span><Clock3 size={12} /> 1 hour ago</span></div><span className="status-pill completed">Completed</span></div>
                    <div className="investigation-item"><div className="investigation-icon amber"><Activity size={16} /></div><div className="investigation-copy"><strong>Customer retention trends</strong><span><Clock3 size={12} /> Yesterday</span></div><span className="status-pill review">In review</span></div>
                  </div>
                </article>
              </section>

              <section className="ask-panel">
                <div className="ask-icon"><Sparkles size={19} /></div>
                <div className="ask-content"><h2>Ask your data anything</h2><p>Your AI analyst can investigate trends, uncover insights, and explain what's driving your business.</p>
                  <form className="ask-form" onSubmit={submitQuestion}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="e.g. Why did revenue decline last month?" aria-label="Ask your data" /><button type="submit" disabled={!question.trim()}>Start analysis <ArrowUpRight size={15} /></button></form>
                  <div className="suggestions">{questions.map((item) => <button key={item} onClick={() => { setQuestion(item); setActive("AI Analyst"); }}>{item} <ArrowUpRight size={12} /></button>)}</div>
                </div>
              </section>
              <footer className="page-footer"><span><ShieldCheck size={14} /> Your data stays secure and private</span><span><CircleHelp size={14} /> DataPilot v0.1.0 · Phase 1</span></footer>
            </>
          ) : (
            <section className="panel placeholder-panel"><div className="placeholder-icon"><Sparkles size={24} /></div><h2>{active}</h2><p>This workspace section is part of the DataPilot roadmap. Its functionality will be implemented in upcoming phases.</p><button className="secondary-button" onClick={() => setActive("Overview")}>Back to overview</button></section>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
