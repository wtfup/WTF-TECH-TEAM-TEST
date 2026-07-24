import "./Login.css";
import { API_BASE } from "../services/api";

function Login() {
  const handleLogin = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>TalentMatch</h1>

        <p>Candidate Matching Platform</p>

        <button onClick={handleLogin}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

export default Login;