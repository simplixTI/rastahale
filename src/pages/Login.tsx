import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";
import { Eye, EyeOff } from "lucide-react";

// Netflix "ta-dum" style sound — short base64 encoded sine wave burst
const playNetflixSound = () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // First note
    osc.frequency.setValueAtTime(293.66, ctx.currentTime); // D4
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);

    // Second deeper note
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.setValueAtTime(146.83, ctx.currentTime + 0.15); // D3
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
    osc2.start(ctx.currentTime + 0.15);

    // Third chord
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.frequency.setValueAtTime(220, ctx.currentTime + 0.15); // A3
    gain3.gain.setValueAtTime(0, ctx.currentTime);
    gain3.gain.setValueAtTime(0.25, ctx.currentTime + 0.15);
    gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
    osc3.start(ctx.currentTime + 0.15);

    setTimeout(() => {
      osc.stop();
      osc2.stop();
      osc3.stop();
      ctx.close();
    }, 2000);
  } catch (e) {
    // Audio not available
  }
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const role = await login(email, password);
    if (role) {
      setShowSplash(true);
      playNetflixSound();
      // Show splash then redirect
      setTimeout(() => {
        navigate(role === "admin" ? "/admin" : "/");
      }, 2200);
    } else {
      setError("Email ou senha incorretos");
      setIsLoading(false);
    }

  };

  if (showSplash) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse">
          <img src={logo} alt="RastaHale" className="h-24 rounded-2xl shadow-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-[360px]">
        <div className="flex justify-center">
          <img src={logo} alt="RastaHale" className="h-20 rounded-2xl" />
        </div>

        <h1 className="mt-6 text-center text-2xl font-bold text-foreground">Entrar</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Acesse sua conta RastaHale</p>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border bg-card px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <p className="text-center text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {/* Test credentials */}
        <div className="mt-8 rounded-lg border border-border bg-card p-4">
          <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Credenciais de teste
          </p>
          <div className="space-y-2">
            <button
              onClick={() => { setEmail("aluno@rastahale.com"); setPassword("rasta123"); }}
              className="flex w-full items-center justify-between rounded-md bg-secondary px-3 py-2 text-left text-xs"
            >
              <div>
                <span className="font-semibold text-foreground">👤 Aluno</span>
                <span className="ml-2 text-muted-foreground">aluno@rastahale.com</span>
              </div>
              <span className="text-muted-foreground">rasta123</span>
            </button>
            <button
              onClick={() => { setEmail("admin@rastahale.com"); setPassword("admin123"); }}
              className="flex w-full items-center justify-between rounded-md bg-secondary px-3 py-2 text-left text-xs"
            >
              <div>
                <span className="font-semibold text-foreground">🔑 Admin</span>
                <span className="ml-2 text-muted-foreground">admin@rastahale.com</span>
              </div>
              <span className="text-muted-foreground">admin123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
