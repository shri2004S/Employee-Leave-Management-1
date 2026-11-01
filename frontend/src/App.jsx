import { useState } from "react";
import ApplyLeave from "./components/ApplyLeave";
import MyLeaveRequests from "./components/MyLeaveRequests";
import AdminLeaveManagement from "./components/AdminLeaveManagement";
import illustration from "./assets/login.png";
import "./App.css";

const API_URL = "http://localhost:8080/api/auth";

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("EMPLOYEE"); // "EMPLOYEE" or "ADMIN"

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("leaveUser");
    return saved ? JSON.parse(saved) : null;
  });

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const endpoint = isLogin ? "login" : "register";

      const body = isLogin
        ? { email, password }
        : { name, email, password };

      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || data.detail || "Authentication failed. Check your credentials."
        );
      }

      localStorage.setItem("leaveToken", data.token);
      localStorage.setItem("leaveUser", JSON.stringify(data));
      setUser(data);
      if (data.role === "ADMIN") {
        setActiveTab("ADMIN");
      } else {
        setActiveTab("EMPLOYEE");
      }
      setMessage("Successfully logged in!");
    } catch (error) {
      setMessage(
        error.message === "Failed to fetch"
          ? "Cannot connect to backend. Ensure Spring Boot is running on port 8080."
          : error.message
      );
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("leaveToken");
    localStorage.removeItem("leaveUser");
    setUser(null);
    setPassword("");
    setMessage("");
    setActiveTab("EMPLOYEE");
  }

  function handleLeaveSubmitted() {
    setRefreshTrigger((prev) => prev + 1);
  }

  if (user) {
    const isAdmin = user.role === "ADMIN";

    return (
      <div className="dashboard">
        <header className="topbar">
          <div className="brand">
            <span className="brand-icon">L</span>
            <span>LeaveManagement</span>
            <span className="role-tag">{user.role}</span>
          </div>

          <div className="topbar-actions">
            {isAdmin && (
              <div className="portal-switcher">
                <button
                  className={`switch-tab ${activeTab === "ADMIN" ? "active" : ""}`}
                  onClick={() => setActiveTab("ADMIN")}
                >
                  🏢 Admin Portal
                </button>
                <button
                  className={`switch-tab ${activeTab === "EMPLOYEE" ? "active" : ""}`}
                  onClick={() => setActiveTab("EMPLOYEE")}
                >
                  👤 My Leave View
                </button>
              </div>
            )}
            <button className="logout-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        <main className="dashboard-content">
          <p className="eyebrow">
            {isAdmin && activeTab === "ADMIN"
              ? "ADMINISTRATION DASHBOARD"
              : "EMPLOYEE DASHBOARD"}
          </p>
          <h1>Welcome, {user.name || user.email}!</h1>
          <p className="subtitle">
            {isAdmin && activeTab === "ADMIN"
              ? "Manage and review organization-wide leave requests with approve/reject workflow."
              : "Submit new leave requests, monitor approvals, or update pending applications."}
          </p>

          {isAdmin && activeTab === "ADMIN" ? (
            <AdminLeaveManagement />
          ) : (
            <>
              <ApplyLeave onLeaveSubmitted={handleLeaveSubmitted} />
              <MyLeaveRequests refreshTrigger={refreshTrigger} />
            </>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="intro-panel">
        <div className="brand">
          <span className="brand-icon">L</span> LeaveManagement
        </div>
        <div className="intro-content">
          <span className="intro-tag">EMPLOYEE LEAVE MANAGEMENT SYSTEM</span>
          <h1> </h1>
          
          <img
  src={illustration}
  alt="Employee Leave Management Illustration"
  className="auth-illustration"
/>
         
        </div>
        
      </section>

      <section className="form-panel">
        <div className="auth-card">
          <div className="mobile-brand brand">
            <span className="brand-icon">L</span> LeaveManagement
          </div>

          <p className="eyebrow">{isLogin ? "WELCOME BACK" : "GET STARTED"}</p>
          <h2>{isLogin ? "Sign in to your account" : "Create your account"}</h2>
          <p className="form-subtitle">
            {isLogin
              ? "Enter your credentials to access the portal."
              : "Register as an employee to get started."}
          </p>

          <div className="auth-tabs">
            <button
              className={isLogin ? "active" : ""}
              onClick={() => {
                setIsLogin(true);
                setMessage("");
              }}
              type="button"
            >
              Login
            </button>
            <button
              className={!isLogin ? "active" : ""}
              onClick={() => {
                setIsLogin(false);
                setMessage("");
              }}
              type="button"
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <label>
                Full name
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                />
              </label>
            )}

            <label>
              Email address
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                maxLength={72}
                required
              />
            </label>

            {message && (
              <p className="message" role="alert">
                {message}
              </p>
            )}

            <button className="submit-btn" type="submit" disabled={loading}>
              {loading
                ? "Please wait..."
                : isLogin
                ? "Sign In →"
                : "Create Account →"}
            </button>
          </form>

          <p className="security-note">
            
          </p>
        </div>
      </section>
    </div>
  );
}

export default App;
