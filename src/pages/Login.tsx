import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/useLanguage";
import { getStoredUser, isAuthenticated, saveAuthCredentials, setDisplayName, setStoredEmail } from "@/lib/auth";
import { trackLogin } from "@/hooks/useActivityTracker";
import { ArrowRight, ArrowLeft, Eye, EyeOff } from "lucide-react";
export default function Login() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState(getStoredUser());

  useEffect(() => {
    if (isAuthenticated()) {
      const from = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(from, { replace: true });
    }
  }, [navigate, location.state]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError(t("loginErrorRequired"));
      return;
    }
    setIsSubmitting(true);
    // Use relative /api - nginx will proxy to backend via Railway internal network
    const apiBase = "/api";
    const authHeader = `Basic ${btoa(`${username.trim()}:${password}`)}`;
    try {
      const res = await fetch(`${apiBase}/master-data/processing-plants`, {
        headers: { Authorization: authHeader },
      });
      if (res.status === 401) {
        setError(t("loginInvalidCredentials"));
        setIsSubmitting(false);
        return;
      }
      if (!res.ok) {
        setError(t("loginErrorRequired"));
        setIsSubmitting(false);
        return;
      }
      saveAuthCredentials(username.trim(), password);
      setPassword("");
      trackLogin();
      try {
        const meRes = await fetch(`${apiBase}/me`, { headers: { Authorization: authHeader } });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.display_name != null) setDisplayName(meData.display_name);
          if (meData.email != null) setStoredEmail(meData.email);
        }
      } catch {
        /* ignore */
      }
      const from = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(from, { replace: true });
    } catch {
      setError(t("loginInvalidCredentials"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0f1419] text-white">
      {/* Левая панель — брендинг */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 xl:p-16 border-r border-white/10">
        <div>
          <Link to="/landing" className="flex items-center gap-3 mb-12 hover:opacity-80 transition-opacity">
            <img src="/logo.svg" alt="" className="h-10 w-10 shrink-0" />
            <span className="text-xl font-semibold tracking-tight">
              {import.meta.env.VITE_APP_TITLE || "Integrated Enterprise"}
            </span>
          </Link>
          <h1 className="text-2xl xl:text-3xl font-bold leading-tight mb-4">
            Интегрированное управление
            <br />
            <span className="text-[#3b82f6]">нефтегазовыми активами</span>
          </h1>
          <p className="text-white/80 text-base max-w-md">
            Аналитика цепочки поставок, сценарии и кризисное реагирование в единой платформе.
          </p>
        </div>
        <p className="text-sm text-white/50">
          © {new Date().getFullYear()} Integrated Enterprise. All rights reserved.
        </p>
      </div>

      {/* Правая панель — форма входа */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px]">
          <h2 className="text-2xl xl:text-3xl font-bold mb-2">{t("loginWelcome")}</h2>
          <p className="text-white/70 text-sm mb-8">{t("loginContinue")}</p>
          {(location.state as { from?: string } | null)?.from === "/admin" && (
            <p className="text-white/60 text-xs mb-4 p-3 rounded-md bg-white/5 border border-white/10">
              {t("loginAdminHint")}
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium text-white/90">
                {t("loginUsernameOrEmail")}
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("loginUsernamePlaceholder")}
                className="h-11 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-[#3b82f6] focus-visible:border-[#3b82f6]"
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-white/90">
                  {t("loginPassword")}
                </label>
                <button
                  type="button"
                  className="text-sm text-[#3b82f6] hover:underline"
                  onClick={() => {}}
                >
                  {t("loginForgotPassword")}
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("loginPasswordPlaceholder")}
                  className="h-11 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-[#3b82f6] focus-visible:border-[#3b82f6] pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium gap-2"
            >
              {isSubmitting ? "..." : t("loginAction")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-xs text-white/50 text-center">
            {t("loginDisclaimer")}
          </p>
          <Link
            to="/landing"
            className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            {t("loginBackToLanding")}
          </Link>
        </div>
      </div>
    </div>
  );
}
