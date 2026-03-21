import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { getAuthHeader } from "@/lib/auth";

const MODULE_NAMES: Record<string, string> = {
  "/": "AI Assistant",
  "/geology": "Geology",
  "/scenarios": "Scenarios",
  "/data": "Data",
  "/planning": "Planning",
  "/annual-planning": "Planning",
  "/crisis-response": "Crisis Response",
  "/master-data": "Master Data",
  "/digital-twin": "Digital Twin",
  "/models": "Models",
  "/back-allocation": "Back Allocation",
  "/well-logs": "Well Logs",
  "/integrations": "Integrations",
  "/admin": "Administration",
};

function trackEvent(action: string, details?: string) {
  const auth = getAuthHeader();
  if (!auth) return;
  try {
    fetch("/api/activity/track", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({ action, details }),
    }).catch(() => {});
  } catch {
    // fire-and-forget
  }
}

export function trackLogin() {
  trackEvent("login", new Date().toISOString());
}

export function trackLogout() {
  trackEvent("logout");
}

export function useActivityTracker() {
  const location = useLocation();
  const prevPath = useRef<string>("");

  useEffect(() => {
    const path = location.pathname;
    if (path === prevPath.current) return;
    prevPath.current = path;

    const moduleName = MODULE_NAMES[path];
    if (moduleName) {
      trackEvent("page_view", moduleName);
    }
  }, [location.pathname]);
}
