import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "../stores/authStore";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const { login, register, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    clearError();
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch {}
  };

  const handleRegister = async () => {
    clearError();
    try {
      await register(email, password, name);
      navigate("/dashboard", { replace: true });
    } catch {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">ADD System</h1>
          <p className="text-sm mt-1 text-gray-500">Task Management System</p>
        </div>

        {isRegister && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", fontSize: "0.875rem", color: "#1a1d27", backgroundColor: "#ffffff", outline: "none" }}
              placeholder="Enter your name"
            />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", fontSize: "0.875rem", color: "#1a1d27", backgroundColor: "#ffffff", outline: "none" }}
              placeholder="a.smirnov@add.dev"
            />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", fontSize: "0.875rem", color: "#1a1d27", backgroundColor: "#ffffff", outline: "none" }}
              placeholder="password123"
            />
        </div>

        {error && (
          <div className="text-sm text-red-500 bg-red-50 p-2 rounded mb-4">{error}</div>
        )}

        <button
          onClick={isRegister ? handleRegister : handleLogin}
          className="w-full py-2 px-4 rounded-lg font-medium text-white text-sm bg-indigo-500 hover:bg-indigo-600"
        >
          {isRegister ? "Register" : "Login"}
        </button>

        <div className="mt-4 text-center">
          <button
            onClick={() => { setIsRegister(!isRegister); clearError(); }}
            className="text-sm text-indigo-500 hover:underline"
          >
            {isRegister ? "Already have an account? Login" : "Don't have an account? Register"}
          </button>
        </div>

        <div className="mt-6 p-3 rounded text-xs bg-gray-100 text-gray-600">
          <p className="font-medium mb-1">Demo accounts:</p>
          <p>a.smirnov@add.dev / password123 (admin)</p>
          <p>m.petrova@add.dev / password123 (lead)</p>
          <p>d.kozlov@add.dev / password123 (developer)</p>
        </div>
      </div>
    </div>
  );
}
