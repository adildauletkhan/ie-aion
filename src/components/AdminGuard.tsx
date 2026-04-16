import { type ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isAdmin } from "@/lib/auth";

/**
 * Защищает маршрут /admin:
 * - если роль не "admin" → редирект на главную с сообщением в консоли
 * - рендерит children только для администраторов
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  if (!isAdmin()) return null;

  return <>{children}</>;
}
