import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { getAuthHeader, clearAuthCredentials } from "@/lib/auth";
import {
  Users,
  Shield,
  Building2,
  History,
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  Ban,
  CheckCircle,
  KeyRound,
  Star,
  Globe,
  Building,
  Lock,
  Save,
  RefreshCw,
  LogIn,
  LogOut,
  Eye,
  MousePointer,
  Activity,
  Calendar,
  Filter,
  TrendingUp,
  Clock,
  Search,
} from "lucide-react";

function getApiBase(): string {
  // Use relative /api - nginx will proxy to backend
  return "/api";
}

interface UserRow {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
  display_name: string | null;
  email: string | null;
  company_id: number | null;
  company_name: string | null;
}

interface RoleRow {
  id: number;
  name: string;
}

interface CompanyRow {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

interface WorkspaceRow {
  id: number;
  name: string;
  code: string;
  shortName: string | null;
  workspaceScope: string;
}

interface WorkspaceAssignment {
  extraction_company_id: number;
  is_default: boolean;
}

interface ActivityLogRow {
  id: number;
  user_id: number;
  action: string;
  details: string | null;
  created_at: string;
  username: string | null;
}

interface SystemStats {
  db_size_mb: number;
  users_count: number;
  roles_count: number;
  companies_count: number;
  activity_logs_count: number;
}

interface ActivityStats {
  total: number;
  today: number;
  week: number;
  unique_users_today: number;
  logins_today: number;
  top_modules: { module: string; count: number }[];
  top_users: { user_id: number; username: string; count: number }[];
  daily: { date: string; count: number }[];
}

export default function AdminPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [logFilterUser, setLogFilterUser] = useState("");
  const [logFilterAction, setLogFilterAction] = useState("");
  const [logFilterDate, setLogFilterDate] = useState("");
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<401 | 403 | null>(null);

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userForm, setUserForm] = useState({ username: "", password: "", role: "viewer", display_name: "", email: "", company_id: null as number | null });
  const [userEditDialogOpen, setUserEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [userEditForm, setUserEditForm] = useState({ display_name: "", email: "", company_id: null as number | null });
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState({ name: "", code: "" });
  const [editingCompany, setEditingCompany] = useState<CompanyRow | null>(null);

  // Workspace access dialog
  const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceRow[]>([]);
  const [wsDialogOpen, setWsDialogOpen] = useState(false);
  const [wsDialogUser, setWsDialogUser] = useState<UserRow | null>(null);
  const [wsAssignments, setWsAssignments] = useState<WorkspaceAssignment[]>([]);
  const [wsSaving, setWsSaving] = useState(false);

  // Change password dialog
  const [changePwDialogOpen, setChangePwDialogOpen] = useState(false);
  const [changePwUser, setChangePwUser] = useState<UserRow | null>(null);
  const [changePwForm, setChangePwForm] = useState({ password: "", confirm: "" });
  const [changePwError, setChangePwError] = useState<string | null>(null);
  const [changePwLoading, setChangePwLoading] = useState(false);

  // Workspace matrix tab
  // map: userId -> list of assignments
  const [matrixData, setMatrixData] = useState<Record<number, WorkspaceAssignment[]>>({});
  const [matrixSaving, setMatrixSaving] = useState<Record<number, boolean>>({});
  const [matrixLoaded, setMatrixLoaded] = useState(false);

  const authHeader = getAuthHeader();
  const headers = {
    "Content-Type": "application/json",
    ...(authHeader ? { Authorization: authHeader } : {}),
  };

  const setLoadError = async (res: Response, fallback: string) => {
    if (res.status === 401) {
      setAuthError(401);
      setError(t("adminErrorUnauthorized"));
      return;
    }
    if (res.status === 403) {
      setAuthError(403);
      setError(t("adminErrorForbidden"));
      return;
    }
    try {
      const d = await res.json();
      setError(d?.detail || fallback);
    } catch {
      setError(fallback);
    }
  };

  const handleLoginAgain = () => {
    clearAuthCredentials();
    navigate("/login", { state: { from: "/admin" }, replace: true });
  };

  const loadUsers = async () => {
    const res = await fetch(`${getApiBase()}/admin/users`, { headers });
    if (res.ok) setUsers(await res.json());
    else await setLoadError(res, t("adminErrorLoad"));
  };
  const loadRoles = async () => {
    const res = await fetch(`${getApiBase()}/admin/roles`, { headers });
    if (res.ok) setRoles(await res.json());
    else await setLoadError(res, t("adminErrorLoad"));
  };
  const loadCompanies = async () => {
    const res = await fetch(`${getApiBase()}/admin/companies`, { headers });
    if (res.ok) setCompanies(await res.json());
    else await setLoadError(res, t("adminErrorLoad"));
  };
  const loadActivityLogs = async () => {
    const res = await fetch(`${getApiBase()}/activity/logs?limit=500`, { headers });
    if (res.ok) setActivityLogs(await res.json());
    else await setLoadError(res, t("adminErrorLoad"));
  };
  const loadActivityStats = async () => {
    try {
      const res = await fetch(`${getApiBase()}/activity/stats`, { headers });
      if (res.ok) setActivityStats(await res.json());
    } catch { /* ignore */ }
  };
  const loadSystemStats = async () => {
    const res = await fetch(`${getApiBase()}/admin/system-stats`, { headers });
    if (res.ok) setSystemStats(await res.json());
    else await setLoadError(res, t("adminErrorLoad"));
  };

  const loadAllWorkspaces = async () => {
    const res = await fetch(`${getApiBase()}/admin/workspaces`, { headers });
    if (res.ok) setAllWorkspaces(await res.json());
  };

  const loadMatrixData = async (userList: UserRow[], wsList: WorkspaceRow[]) => {
    if (!userList.length || !wsList.length) return;
    const entries = await Promise.all(
      userList.map(async (u) => {
        const res = await fetch(`${getApiBase()}/admin/users/${u.id}/workspaces`, { headers });
        const data: WorkspaceAssignment[] = res.ok ? await res.json() : [];
        return [u.id, data] as [number, WorkspaceAssignment[]];
      })
    );
    setMatrixData(Object.fromEntries(entries));
    setMatrixLoaded(true);
  };

  const handleMatrixToggle = (userId: number, wsId: number) => {
    setMatrixData((prev) => {
      const current = prev[userId] ?? [];
      const exists = current.find((a) => a.extraction_company_id === wsId);
      if (exists) {
        const filtered = current.filter((a) => a.extraction_company_id !== wsId);
        if (exists.is_default && filtered.length > 0) {
          return { ...prev, [userId]: filtered.map((a, i) => ({ ...a, is_default: i === 0 })) };
        }
        return { ...prev, [userId]: filtered };
      } else {
        const isFirst = current.length === 0;
        return { ...prev, [userId]: [...current, { extraction_company_id: wsId, is_default: isFirst }] };
      }
    });
  };

  const handleMatrixSetDefault = (userId: number, wsId: number) => {
    setMatrixData((prev) => ({
      ...prev,
      [userId]: (prev[userId] ?? []).map((a) => ({ ...a, is_default: a.extraction_company_id === wsId })),
    }));
  };

  const handleMatrixSaveUser = async (userId: number) => {
    setMatrixSaving((p) => ({ ...p, [userId]: true }));
    const assignments = matrixData[userId] ?? [];
    await fetch(`${getApiBase()}/admin/users/${userId}/workspaces`, {
      method: "PUT",
      headers,
      body: JSON.stringify(assignments),
    });
    setMatrixSaving((p) => ({ ...p, [userId]: false }));
  };

  const handleOpenWsDialog = async (u: UserRow) => {
    setWsDialogUser(u);
    setWsDialogOpen(true);
    // Load all workspaces if not yet loaded
    if (allWorkspaces.length === 0) {
      const res = await fetch(`${getApiBase()}/admin/workspaces`, { headers });
      if (res.ok) setAllWorkspaces(await res.json());
    }
    // Load current assignments for this user
    const res2 = await fetch(`${getApiBase()}/admin/users/${u.id}/workspaces`, { headers });
    if (res2.ok) {
      setWsAssignments(await res2.json());
    } else {
      setWsAssignments([]);
    }
  };

  const toggleWsAssignment = (wsId: number) => {
    setWsAssignments((prev) => {
      const exists = prev.find((a) => a.extraction_company_id === wsId);
      if (exists) {
        const filtered = prev.filter((a) => a.extraction_company_id !== wsId);
        // If we removed the default, make first remaining the default
        if (exists.is_default && filtered.length > 0) {
          return filtered.map((a, i) => ({ ...a, is_default: i === 0 }));
        }
        return filtered;
      } else {
        const isFirst = prev.length === 0;
        return [...prev, { extraction_company_id: wsId, is_default: isFirst }];
      }
    });
  };

  const setWsDefault = (wsId: number) => {
    setWsAssignments((prev) =>
      prev.map((a) => ({ ...a, is_default: a.extraction_company_id === wsId }))
    );
  };

  const handleSaveWsAssignments = async () => {
    if (!wsDialogUser) return;
    setWsSaving(true);
    const res = await fetch(`${getApiBase()}/admin/users/${wsDialogUser.id}/workspaces`, {
      method: "PUT",
      headers,
      body: JSON.stringify(wsAssignments),
    });
    setWsSaving(false);
    if (res.ok) {
      setWsDialogOpen(false);
      setWsDialogUser(null);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.detail || "Ошибка сохранения доступа");
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    setAuthError(null);
    Promise.all([
      loadUsers(),
      loadRoles(),
      loadCompanies(),
      loadActivityLogs(),
      loadActivityStats(),
      loadSystemStats(),
      loadAllWorkspaces(),
    ])
      .catch(() => setError(t("adminErrorLoad")))
      .finally(() => setLoading(false));
  }, []);

  // Load matrix when switching to access tab
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "access" && !matrixLoaded) {
      loadMatrixData(users, allWorkspaces);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${getApiBase()}/admin/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        username: userForm.username,
        password: userForm.password,
        role: userForm.role,
        display_name: userForm.display_name || null,
        email: userForm.email || null,
        company_id: userForm.company_id,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || "Ошибка создания пользователя");
      return;
    }
    setUserDialogOpen(false);
    setUserForm({ username: "", password: "", role: "viewer", display_name: "", email: "", company_id: null });
    loadUsers();
    loadSystemStats();
  };

  const handleOpenChangePw = (u: UserRow) => {
    setChangePwUser(u);
    setChangePwForm({ password: "", confirm: "" });
    setChangePwError(null);
    setChangePwDialogOpen(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changePwForm.password.length < 6) {
      setChangePwError("Пароль должен содержать минимум 6 символов");
      return;
    }
    if (changePwForm.password !== changePwForm.confirm) {
      setChangePwError("Пароли не совпадают");
      return;
    }
    if (!changePwUser) return;
    setChangePwLoading(true);
    setChangePwError(null);
    const res = await fetch(`${getApiBase()}/admin/users/${changePwUser.id}/change-password`, {
      method: "POST",
      headers,
      body: JSON.stringify({ new_password: changePwForm.password }),
    });
    setChangePwLoading(false);
    if (res.ok) {
      setChangePwDialogOpen(false);
      setChangePwUser(null);
    } else {
      const d = await res.json().catch(() => ({}));
      setChangePwError(d.detail || "Ошибка смены пароля");
    }
  };

  const handleOpenEditUser = (u: UserRow) => {
    setEditingUser(u);
    setUserEditForm({
      display_name: u.display_name ?? "",
      email: u.email ?? "",
      company_id: u.company_id,
    });
    setUserEditDialogOpen(true);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const res = await fetch(`${getApiBase()}/admin/users/${editingUser.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        displayName: userEditForm.display_name || null,
        email: userEditForm.email || null,
        companyId: userEditForm.company_id,
      }),
    });
    if (!res.ok) return;
    setUserEditDialogOpen(false);
    setEditingUser(null);
    loadUsers();
  };

  const handleToggleUserActive = async (u: UserRow) => {
    const res = await fetch(`${getApiBase()}/admin/users/${u.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ isActive: !u.is_active }),
    });
    if (res.ok) {
      loadUsers();
    }
  };

  const handleAssignRole = async (userId: number, role: string) => {
    const res = await fetch(`${getApiBase()}/admin/users/${userId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ role }),
    });
    if (res.ok) loadUsers();
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${getApiBase()}/admin/roles`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: roleName.trim() }),
    });
    if (!res.ok) {
      setError(t("adminRoleExists"));
      return;
    }
    setRoleDialogOpen(false);
    setRoleName("");
    loadRoles();
    loadSystemStats();
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!window.confirm(t("adminDeleteConfirmRole"))) return;
    const res = await fetch(`${getApiBase()}/admin/roles/${roleId}`, { method: "DELETE", headers });
    if (res.ok) loadRoles();
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCompany) {
      const res = await fetch(`${getApiBase()}/admin/companies/${editingCompany.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ name: companyForm.name, code: companyForm.code }),
      });
      if (res.ok) {
        setCompanyDialogOpen(false);
        setEditingCompany(null);
        setCompanyForm({ name: "", code: "" });
        loadCompanies();
        loadSystemStats();
      }
    } else {
      const res = await fetch(`${getApiBase()}/admin/companies`, {
        method: "POST",
        headers,
        body: JSON.stringify(companyForm),
      });
      if (!res.ok) {
        setError(t("adminCodeExists"));
        return;
      }
      setCompanyDialogOpen(false);
      setCompanyForm({ name: "", code: "" });
      loadCompanies();
      loadSystemStats();
    }
  };

  const handleDeleteCompany = async (id: number) => {
    if (!window.confirm(t("adminDeleteConfirmCompany"))) return;
    const res = await fetch(`${getApiBase()}/admin/companies/${id}`, { method: "DELETE", headers });
    if (res.ok) loadCompanies();
  };

  const KZ_TZ = "Asia/Almaty";
  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleString("ru", { timeZone: KZ_TZ });
    } catch {
      return s;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("navAdmin")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("adminSubtitle")}
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm flex flex-col gap-2">
          <span>{error}</span>
          {(authError === 401 || authError === 403) && (
            <Button variant="outline" size="sm" className="w-fit" onClick={handleLoginAgain}>
              {t("adminLoginAgain")}
            </Button>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-4 w-4" /> {t("adminTabUsers")}
          </TabsTrigger>
          <TabsTrigger value="access" className="gap-1.5">
            <Lock className="h-4 w-4" /> Доступ
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5">
            <Shield className="h-4 w-4" /> {t("adminTabRoles")}
          </TabsTrigger>
          <TabsTrigger value="companies" className="gap-1.5">
            <Building2 className="h-4 w-4" /> {t("adminTabCompanies")}
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <History className="h-4 w-4" /> {t("adminTabHistory")}
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> {t("adminTabSystem")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t("adminUserAccounts")}</CardTitle>
              <Button size="sm" onClick={() => setUserDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> {t("adminCreate")}
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">{t("adminLoading")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-3 px-2 font-medium">{t("adminId")}</th>
                        <th className="text-left py-3 px-2 font-medium">{t("adminLogin")}</th>
                        <th className="text-left py-3 px-2 font-medium">{t("adminName")}</th>
                        <th className="text-left py-3 px-2 font-medium">{t("adminEmail")}</th>
                        <th className="text-left py-3 px-2 font-medium">{t("adminCompany")}</th>
                        <th className="text-left py-3 px-2 font-medium">{t("adminRole")}</th>
                        <th className="text-left py-3 px-2 font-medium">{t("adminStatus")}</th>
                        <th className="text-right py-3 px-2 font-medium">{t("adminActions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2.5 px-2 font-mono text-xs">{u.id}</td>
                          <td className="py-2.5 px-2 font-medium">{u.username}</td>
                          <td className="py-2.5 px-2 text-muted-foreground">{u.display_name || "—"}</td>
                          <td className="py-2.5 px-2 text-muted-foreground text-xs">{u.email || "—"}</td>
                          <td className="py-2.5 px-2 text-muted-foreground text-xs">{u.company_name || "—"}</td>
                          <td className="py-2.5 px-2">
                            <select
                              className="h-8 rounded border bg-background px-2 text-xs"
                              value={u.role}
                              onChange={(e) => handleAssignRole(u.id, e.target.value)}
                            >
                              {roles.map((r) => (
                                <option key={r.id} value={r.name}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-2">
                            {u.is_active ? (
                              <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-400">
                                {t("adminActive")}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-red-500/20 text-red-700 dark:text-red-400">
                                {t("adminBlocked")}
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button size="icon" variant="ghost" onClick={() => handleOpenEditUser(u)} title={t("adminEdit")}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleOpenChangePw(u)}
                                title="Сменить пароль"
                              >
                                <Lock className="h-4 w-4 text-amber-500" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleOpenWsDialog(u)}
                                title="Настроить доступ к рабочим пространствам"
                              >
                                <KeyRound className="h-4 w-4 text-primary" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleToggleUserActive(u)}
                                title={u.is_active ? t("adminBlock") : t("adminUnblock")}
                              >
                                {u.is_active ? <Ban className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Workspace Access Matrix ── */}
        <TabsContent value="access" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  Доступ к рабочим пространствам
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Настройте какие рабочие пространства доступны каждому пользователю. ★ — по умолчанию.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setMatrixLoaded(false); loadMatrixData(users, allWorkspaces); }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Обновить
              </Button>
            </CardHeader>
            <CardContent>
              {!matrixLoaded ? (
                <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground text-sm">
                  <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  Загрузка матрицы доступа...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground sticky left-0 bg-card z-10 min-w-[160px]">
                          Пользователь
                        </th>
                        {allWorkspaces.map((ws) => (
                          <th key={ws.id} className="py-3 px-2 font-medium text-center min-w-[110px]">
                            <div className="flex flex-col items-center gap-1">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                                ws.workspaceScope === "all"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              }`}>
                                {ws.workspaceScope === "all" ? <Globe className="h-3.5 w-3.5" /> : <Building className="h-3.5 w-3.5" />}
                              </div>
                              <span className="text-xs font-semibold leading-tight text-center">{ws.shortName || ws.code}</span>
                              <span className="text-[10px] text-muted-foreground leading-none">{ws.workspaceScope === "all" ? "Полный" : "Собств."}</span>
                            </div>
                          </th>
                        ))}
                        <th className="py-3 px-2 text-center text-muted-foreground font-medium min-w-[80px]">
                          Сохранить
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const userAssignments = matrixData[u.id] ?? [];
                        const isSaving = matrixSaving[u.id] ?? false;
                        return (
                          <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                            {/* User info */}
                            <td className="py-3 px-3 sticky left-0 bg-card">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                  {(u.display_name || u.username).charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{u.display_name || u.username}</p>
                                  <p className="text-[11px] text-muted-foreground truncate">{u.role}</p>
                                </div>
                              </div>
                            </td>
                            {/* Workspace checkboxes */}
                            {allWorkspaces.map((ws) => {
                              const assignment = userAssignments.find((a) => a.extraction_company_id === ws.id);
                              const isChecked  = !!assignment;
                              const isDefault  = assignment?.is_default ?? false;
                              return (
                                <td key={ws.id} className="py-3 px-2 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    {/* Checkbox */}
                                    <button
                                      onClick={() => handleMatrixToggle(u.id, ws.id)}
                                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                        isChecked
                                          ? "border-primary bg-primary"
                                          : "border-muted-foreground/30 hover:border-primary/50"
                                      }`}
                                    >
                                      {isChecked && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                                    </button>
                                    {/* Default star */}
                                    {isChecked && (
                                      <button
                                        onClick={() => handleMatrixSetDefault(u.id, ws.id)}
                                        title={isDefault ? "По умолчанию" : "Сделать по умолчанию"}
                                        className={`transition-colors ${isDefault ? "text-amber-500" : "text-muted-foreground/25 hover:text-amber-400"}`}
                                      >
                                        <Star className={`h-3 w-3 ${isDefault ? "fill-amber-500" : ""}`} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                            {/* Save button */}
                            <td className="py-3 px-2 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                disabled={isSaving}
                                onClick={() => handleMatrixSaveUser(u.id)}
                              >
                                {isSaving
                                  ? <div className="w-3 h-3 rounded-full border border-primary border-t-transparent animate-spin" />
                                  : <Save className="h-3 w-3" />
                                }
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded border-2 border-primary bg-primary flex items-center justify-center">
                        <CheckCircle className="h-2.5 w-2.5 text-primary-foreground" />
                      </div>
                      Доступ разрешён
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      По умолчанию при входе
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-blue-500" />
                      Полный доступ (все данные)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-emerald-500" />
                      Только собственные активы
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t("adminTabRoles")}</CardTitle>
              <Button size="sm" onClick={() => setRoleDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> {t("adminCreateRole")}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-3 px-2 font-medium">{t("adminId")}</th>
                      <th className="text-left py-3 px-2 font-medium">{t("adminRoleName")}</th>
                      <th className="text-right py-3 px-2 font-medium">{t("adminActions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((r) => (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2.5 px-2 font-mono text-xs">{r.id}</td>
                        <td className="py-2.5 px-2 font-medium">{r.name}</td>
                        <td className="py-2.5 px-2 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteRole(r.id)}
                            disabled={r.name === "admin"}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t("adminCompaniesClients")}</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setEditingCompany(null);
                  setCompanyForm({ name: "", code: "" });
                  setCompanyDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> {t("adminCreate")}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-3 px-2 font-medium">{t("adminId")}</th>
                      <th className="text-left py-3 px-2 font-medium">{t("adminCompanyName")}</th>
                      <th className="text-left py-3 px-2 font-medium">{t("adminCode")}</th>
                      <th className="text-left py-3 px-2 font-medium">{t("adminStatus")}</th>
                      <th className="text-right py-3 px-2 font-medium">{t("adminActions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((c) => (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2.5 px-2 font-mono text-xs">{c.id}</td>
                        <td className="py-2.5 px-2 font-medium">{c.name}</td>
                        <td className="py-2.5 px-2 font-mono text-xs">{c.code}</td>
                        <td className="py-2.5 px-2">
                          <Badge variant={c.is_active ? "secondary" : "outline"}>
                            {c.is_active ? t("adminStatusActive") : t("adminStatusInactive")}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingCompany(c);
                              setCompanyForm({ name: c.name, code: c.code });
                              setCompanyDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteCompany(c.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-6 space-y-4">
          {/* ── Stats cards ── */}
          {activityStats && (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-blue-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">Всего событий</span>
                </div>
                <p className="text-2xl font-bold">{activityStats.total.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">Сегодня</span>
                </div>
                <p className="text-2xl font-bold">{activityStats.today}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-amber-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">За неделю</span>
                </div>
                <p className="text-2xl font-bold">{activityStats.week}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-purple-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">Пользователей сегодня</span>
                </div>
                <p className="text-2xl font-bold">{activityStats.unique_users_today}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <LogIn className="h-4 w-4 text-cyan-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">Входов сегодня</span>
                </div>
                <p className="text-2xl font-bold">{activityStats.logins_today}</p>
              </div>
            </div>
          )}

          {/* ── Activity chart + top modules/users ── */}
          {activityStats && (
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Daily activity sparkline */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Активность за 14 дней</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1 h-24">
                    {activityStats.daily.map((d) => {
                      const max = Math.max(...activityStats.daily.map(x => x.count), 1);
                      const pct = (d.count / max) * 100;
                      return (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div
                            className="w-full rounded-t bg-primary/70 hover:bg-primary transition-colors min-h-[2px]"
                            style={{ height: `${Math.max(pct, 3)}%` }}
                          />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border rounded px-1.5 py-0.5 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {d.date.slice(5)}: {d.count}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>{activityStats.daily[0]?.date.slice(5) ?? ""}</span>
                    <span>{activityStats.daily[activityStats.daily.length - 1]?.date.slice(5) ?? ""}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Top modules */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Популярные модули (30д)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {activityStats.top_modules.slice(0, 6).map((m) => {
                    const max = activityStats.top_modules[0]?.count || 1;
                    return (
                      <div key={m.module} className="flex items-center gap-2">
                        <Eye className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs flex-1 truncate">{m.module}</span>
                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary/60" style={{ width: `${(m.count / max) * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground w-8 text-right">{m.count}</span>
                      </div>
                    );
                  })}
                  {activityStats.top_modules.length === 0 && (
                    <p className="text-xs text-muted-foreground">Нет данных</p>
                  )}
                </CardContent>
              </Card>

              {/* Top users */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Активные пользователи (30д)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {activityStats.top_users.slice(0, 6).map((u) => {
                    const max = activityStats.top_users[0]?.count || 1;
                    return (
                      <div key={u.user_id} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                          {(u.username || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs flex-1 truncate">{u.username}</span>
                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-purple-500/60" style={{ width: `${(u.count / max) * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground w-8 text-right">{u.count}</span>
                      </div>
                    );
                  })}
                  {activityStats.top_users.length === 0 && (
                    <p className="text-xs text-muted-foreground">Нет данных</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Filters ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" /> {t("adminHistoryTitle")}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => { loadActivityLogs(); loadActivityStats(); }}>
                    <RefreshCw className="h-3 w-3 mr-1" /> Обновить
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filter bar */}
              <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Фильтры:</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Пользователь..."
                    value={logFilterUser}
                    onChange={(e) => setLogFilterUser(e.target.value)}
                    className="h-7 text-xs pl-7 w-36"
                  />
                </div>
                <select
                  value={logFilterAction}
                  onChange={(e) => setLogFilterAction(e.target.value)}
                  className="h-7 text-xs rounded-md border bg-background px-2"
                >
                  <option value="">Все действия</option>
                  <option value="login">Вход</option>
                  <option value="logout">Выход</option>
                  <option value="page_view">Просмотр модуля</option>
                  <option value="create_user">Создание пользователя</option>
                  <option value="update_user">Обновление пользователя</option>
                  <option value="create_role">Создание роли</option>
                  <option value="create_company">Создание компании</option>
                </select>
                <Input
                  type="date"
                  value={logFilterDate}
                  onChange={(e) => setLogFilterDate(e.target.value)}
                  className="h-7 text-xs w-36"
                />
                {(logFilterUser || logFilterAction || logFilterDate) && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs"
                    onClick={() => { setLogFilterUser(""); setLogFilterAction(""); setLogFilterDate(""); }}>
                    Сбросить
                  </Button>
                )}
              </div>

              {/* Logs table */}
              <div className="overflow-x-auto max-h-[55vh] overflow-y-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground sticky top-0 z-10">
                      <th className="text-left py-2.5 px-3 font-medium text-xs w-[180px]">
                        <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Время</div>
                      </th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs w-[140px]">
                        <div className="flex items-center gap-1.5"><Users className="h-3 w-3" /> Пользователь</div>
                      </th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs w-[160px]">
                        <div className="flex items-center gap-1.5"><MousePointer className="h-3 w-3" /> Действие</div>
                      </th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Детали</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogs
                      .filter((log) => {
                        if (logFilterUser && !(log.username || "").toLowerCase().includes(logFilterUser.toLowerCase())) return false;
                        if (logFilterAction && log.action !== logFilterAction) return false;
                        if (logFilterDate && !log.created_at.startsWith(logFilterDate)) return false;
                        return true;
                      })
                      .map((log) => {
                        const actionConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
                          login:          { icon: LogIn,       color: "text-green-500 bg-green-500/10", label: "Вход" },
                          logout:         { icon: LogOut,      color: "text-red-400 bg-red-400/10",     label: "Выход" },
                          page_view:      { icon: Eye,         color: "text-blue-500 bg-blue-500/10",   label: "Просмотр" },
                          create_user:    { icon: Plus,        color: "text-emerald-500 bg-emerald-500/10", label: "Создание пользователя" },
                          update_user:    { icon: Pencil,      color: "text-amber-500 bg-amber-500/10", label: "Обновление пользователя" },
                          create_role:    { icon: Shield,      color: "text-purple-500 bg-purple-500/10", label: "Создание роли" },
                          delete_role:    { icon: Trash2,      color: "text-red-500 bg-red-500/10",     label: "Удаление роли" },
                          create_company: { icon: Building2,   color: "text-cyan-500 bg-cyan-500/10",   label: "Создание компании" },
                          update_company: { icon: Pencil,      color: "text-cyan-500 bg-cyan-500/10",   label: "Обновление компании" },
                        };
                        const cfg = actionConfig[log.action] || { icon: Activity, color: "text-muted-foreground bg-muted", label: log.action };
                        const ActionIcon = cfg.icon;
                        const dt = new Date(log.created_at);
                        const kzNow = new Date().toLocaleDateString("ru", { timeZone: KZ_TZ });
                        const kzDt = dt.toLocaleDateString("ru", { timeZone: KZ_TZ });
                        const isToday = kzNow === kzDt;
                        const timeStr = isToday
                          ? `Сегодня, ${dt.toLocaleTimeString("ru", { timeZone: KZ_TZ, hour: "2-digit", minute: "2-digit" })}`
                          : dt.toLocaleString("ru", { timeZone: KZ_TZ, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

                        return (
                          <tr key={log.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                            <td className="py-2 px-3">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{timeStr}</span>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                  {(log.username || "?").charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-medium truncate">{log.username ?? `#${log.user_id}`}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-5 h-5 rounded flex items-center justify-center ${cfg.color}`}>
                                  <ActionIcon className="h-3 w-3" />
                                </div>
                                <span className="text-xs font-medium">{cfg.label}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-xs text-muted-foreground max-w-xs truncate block">
                                {log.details ?? "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    {activityLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">
                          Нет записей в журнале
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>
                  Показано: {activityLogs.filter((log) => {
                    if (logFilterUser && !(log.username || "").toLowerCase().includes(logFilterUser.toLowerCase())) return false;
                    if (logFilterAction && log.action !== logFilterAction) return false;
                    if (logFilterDate && !log.created_at.startsWith(logFilterDate)) return false;
                    return true;
                  }).length} из {activityLogs.length}
                </span>
                <span>Последнее обновление: {new Date().toLocaleTimeString("ru", { timeZone: KZ_TZ, hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("adminSystemStats")}</CardTitle>
            </CardHeader>
            <CardContent>
              {systemStats ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground">{t("adminDbSize")}</p>
                    <p className="text-2xl font-semibold">{systemStats.db_size_mb} MB</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground">{t("adminUsersCount")}</p>
                    <p className="text-2xl font-semibold">{systemStats.users_count}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground">{t("adminRolesCount")}</p>
                    <p className="text-2xl font-semibold">{systemStats.roles_count}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground">{t("adminCompaniesCount")}</p>
                    <p className="text-2xl font-semibold">{systemStats.companies_count}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground">{t("adminLogEntries")}</p>
                    <p className="text-2xl font-semibold">{systemStats.activity_logs_count}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("adminLoading")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create user dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateUser}>
            <DialogHeader>
              <DialogTitle>{t("adminCreateUser")}</DialogTitle>
              <DialogDescription>Заполните данные для создания нового пользователя.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t("adminLoginLabel")}</Label>
                <Input
                  value={userForm.username}
                  onChange={(e) => setUserForm((p) => ({ ...p, username: e.target.value }))}
                  placeholder="username"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("adminPassword")}</Label>
                <Input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("adminDisplayName")}</Label>
                <Input
                  value={userForm.display_name}
                  onChange={(e) => setUserForm((p) => ({ ...p, display_name: e.target.value }))}
                  placeholder="Иван Иванов"
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("adminEmail")}</Label>
                <Input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="user@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("adminCompanyLabel")}</Label>
                <select
                  className="h-9 rounded-md border bg-background px-2"
                  value={userForm.company_id ?? ""}
                  onChange={(e) => setUserForm((p) => ({ ...p, company_id: e.target.value ? Number(e.target.value) : null }))}
                >
                  <option value="">{t("adminNoCompany")}</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>{t("adminRole")}</Label>
                <select
                  className="h-9 rounded-md border bg-background px-2"
                  value={userForm.role}
                  onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)}>
                {t("adminCancel")}
              </Button>
              <Button type="submit">{t("adminCreate")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={userEditDialogOpen} onOpenChange={setUserEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSaveEditUser}>
            <DialogHeader>
              <DialogTitle>{t("adminEditAccount")}</DialogTitle>
              <DialogDescription>
                {editingUser ? `${t("adminLoginLabel")}: ${editingUser.username}` : "Редактирование профиля пользователя."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t("adminDisplayName")}</Label>
                <Input
                  value={userEditForm.display_name}
                  onChange={(e) => setUserEditForm((p) => ({ ...p, display_name: e.target.value }))}
                  placeholder="Иван Иванов"
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("adminEmail")}</Label>
                <Input
                  type="email"
                  value={userEditForm.email}
                  onChange={(e) => setUserEditForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="user@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("adminCompanyLabel")}</Label>
                <select
                  className="h-9 rounded-md border bg-background px-2"
                  value={userEditForm.company_id ?? ""}
                  onChange={(e) => setUserEditForm((p) => ({ ...p, company_id: e.target.value ? Number(e.target.value) : null }))}
                >
                  <option value="">{t("adminNoCompany")}</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUserEditDialogOpen(false)}>
                {t("adminCancel")}
              </Button>
              <Button type="submit">{t("adminSave")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create role dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateRole}>
            <DialogHeader>
              <DialogTitle>{t("adminCreateRole")}</DialogTitle>
              <DialogDescription>Введите название новой роли.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t("adminRoleName")}</Label>
                <Input
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="manager"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRoleDialogOpen(false)}>
                {t("adminCancel")}
              </Button>
              <Button type="submit">{t("adminCreate")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Workspace Access dialog */}
      <Dialog open={wsDialogOpen} onOpenChange={(open) => { if (!open) { setWsDialogOpen(false); setWsDialogUser(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Доступ к рабочим пространствам
            </DialogTitle>
            <DialogDescription>
              {wsDialogUser
                ? `Пользователь: ${wsDialogUser.display_name || wsDialogUser.username}`
                : "Настройте доступ к рабочим пространствам."}
            </DialogDescription>
            {wsDialogUser && (
              <p className="text-sm text-muted-foreground">
                Пользователь: <span className="font-semibold text-foreground">{wsDialogUser.display_name || wsDialogUser.username}</span>
              </p>
            )}
          </DialogHeader>

          <div className="py-2 space-y-2 max-h-[60vh] overflow-y-auto">
            {allWorkspaces.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Загрузка рабочих пространств...</p>
            ) : (
              allWorkspaces.map((ws) => {
                const assigned = wsAssignments.find((a) => a.extraction_company_id === ws.id);
                const isAssigned = !!assigned;
                const isDefault = assigned?.is_default ?? false;
                return (
                  <div
                    key={ws.id}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors cursor-pointer ${
                      isAssigned
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:bg-muted/40"
                    }`}
                    onClick={() => toggleWsAssignment(ws.id)}
                  >
                    {/* Scope icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                      ws.workspaceScope === "all"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    }`}>
                      {ws.workspaceScope === "all"
                        ? <Globe className="h-4 w-4" />
                        : <Building className="h-4 w-4" />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ws.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ws.code}
                        {ws.workspaceScope === "all" ? " · Полный доступ (КМГ)" : " · Собственные активы"}
                      </p>
                    </div>

                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                      isAssigned
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    }`}>
                      {isAssigned && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                    </div>

                    {/* Default star — only shown if assigned */}
                    {isAssigned && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setWsDefault(ws.id); }}
                        title={isDefault ? "По умолчанию" : "Сделать по умолчанию"}
                        className={`shrink-0 transition-colors ${
                          isDefault ? "text-amber-500" : "text-muted-foreground/30 hover:text-amber-400"
                        }`}
                      >
                        <Star className={`h-4 w-4 ${isDefault ? "fill-amber-500" : ""}`} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
            <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Полный доступ</span>
            <span className="flex items-center gap-1"><Building className="h-3 w-3" /> Собственные активы</span>
            <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> По умолчанию</span>
            <span className="ml-auto font-medium text-foreground">
              Выбрано: {wsAssignments.length}
            </span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setWsDialogOpen(false); setWsDialogUser(null); }}>
              Отмена
            </Button>
            <Button onClick={handleSaveWsAssignments} disabled={wsSaving}>
              {wsSaving ? "Сохранение..." : "Сохранить доступ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change password dialog */}
      <Dialog open={changePwDialogOpen} onOpenChange={(open) => { if (!open) { setChangePwDialogOpen(false); setChangePwUser(null); } }}>
        <DialogContent>
          <form onSubmit={handleChangePassword}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-500" />
                Смена пароля
              </DialogTitle>
              <DialogDescription>
                {changePwUser
                  ? `Установите новый пароль для пользователя ${changePwUser.display_name || changePwUser.username}.`
                  : "Установите новый пароль для пользователя."}
              </DialogDescription>
              {changePwUser && (
                <p className="text-sm text-muted-foreground">
                  Пользователь: <span className="font-semibold text-foreground">{changePwUser.display_name || changePwUser.username}</span>
                  {" "}(<span className="font-mono">{changePwUser.username}</span>)
                </p>
              )}
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {changePwError && (
                <div className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm">
                  {changePwError}
                </div>
              )}
              <div className="grid gap-2">
                <Label>Новый пароль</Label>
                <Input
                  type="password"
                  value={changePwForm.password}
                  onChange={(e) => setChangePwForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Минимум 6 символов"
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="grid gap-2">
                <Label>Подтвердите пароль</Label>
                <Input
                  type="password"
                  value={changePwForm.confirm}
                  onChange={(e) => setChangePwForm((p) => ({ ...p, confirm: e.target.value }))}
                  placeholder="Повторите пароль"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setChangePwDialogOpen(false); setChangePwUser(null); }}>
                Отмена
              </Button>
              <Button type="submit" disabled={changePwLoading}>
                {changePwLoading ? "Сохранение..." : "Сменить пароль"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create/Edit company dialog */}
      <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSaveCompany}>
            <DialogHeader>
              <DialogTitle>{editingCompany ? t("adminEditCompany") : t("adminCreateCompany")}</DialogTitle>
              <DialogDescription>Заполните название и код компании.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t("adminCompanyName")}</Label>
                <Input
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="ООО Компания"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("adminCode")}</Label>
                <Input
                  value={companyForm.code}
                  onChange={(e) => setCompanyForm((p) => ({ ...p, code: e.target.value }))}
                  placeholder="COMP01"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCompanyDialogOpen(false)}>
                {t("adminCancel")}
              </Button>
              <Button type="submit">{editingCompany ? t("adminSave") : t("adminCreate")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
