import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";

export function AuthGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/landing", { replace: true, state: { from: location.pathname } });
    }
  }, [navigate, location.pathname]);

  if (!isAuthenticated()) {
    return null;
  }

  return <>{children}</>;
}
