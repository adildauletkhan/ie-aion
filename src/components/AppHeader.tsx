import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Settings,
  LogOut,
  Sun,
  SunMoon,
  BellDot,
  Bell,
  ChevronDown,
  Globe,
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import {
  clearAuthCredentials,
  getDisplayName,
  getStoredEmail,
  getAvatarUrl,
  setAvatarUrl,
  setDisplayName,
  setStoredEmail,
  clearAvatar,
  getUserInitials,
  getAuthHeader,
} from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const NOTIFICATIONS_COUNT = 2; // TODO: from API

export function AppHeader() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarUrl, setAvatarUrlState] = useState<string | null>(() => getAvatarUrl());
  const [displayName, setDisplayNameState] = useState(() => getDisplayName());
  const [email, setEmailState] = useState(() => getStoredEmail());
  const initials = getUserInitials();

  useEffect(() => {
    const header = getAuthHeader();
    if (!header) return;
    fetch(`/api/me`, { headers: { Authorization: header } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const name = data.display_name ?? getDisplayName();
        const em = data.email ?? getStoredEmail();
        if (data.display_name != null) setDisplayName(data.display_name);
        if (data.email != null) setStoredEmail(data.email);
        setDisplayNameState(name);
        setEmailState(em);
      })
      .catch(() => {});
  }, []);
  const avatarRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarUrl(dataUrl);
      setAvatarUrlState(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  const handleClearAvatar = () => {
    clearAvatar();
    setAvatarUrlState(null);
  };

  const handleLogout = () => {
    clearAuthCredentials();
    navigate("/login", { replace: true });
  };

  const toggleLang = () => {
    setLanguage(language === "ru" ? "en" : "ru");
  };

  return (
    <>
      <header className="h-14 shrink-0 flex items-center justify-end gap-1 px-4 border-b border-border bg-background">
        {/* Workspace switcher */}
        <WorkspaceSwitcher />
        <div className="w-px h-5 bg-border mx-1" />
        {/* Language */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={toggleLang}
          title={language === "ru" ? "English" : "Русский"}
        >
          <Globe className="h-5 w-5" />
        </Button>
        {/* Theme */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={toggleTheme}
          title={theme === "dark" ? t("light") : t("dark")}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <SunMoon className="h-5 w-5" />
          )}
        </Button>
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground"
          title="Уведомления"
        >
          {NOTIFICATIONS_COUNT > 0 ? (
            <BellDot className="h-5 w-5 text-red-500" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </Button>

        {/* User menu trigger */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 ml-2 py-1.5 pr-1 rounded-lg hover:bg-accent/50 transition-colors outline-none focus:ring-2 focus:ring-ring">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3b82f6] text-white font-medium text-sm">
                  {initials}
                </div>
              )}
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-medium text-foreground leading-tight">
                  {displayName || "User"}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <div className="px-2 py-3">
              <p className="font-medium text-foreground">{displayName || "User"}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>
              <User className="mr-2 h-4 w-4" />
              {t("myProfile")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              {t("settings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("myProfile")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-24 w-24 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#3b82f6] text-white text-2xl font-medium">
                  {initials}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  ref={avatarRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => avatarRef.current?.click()}
                >
                  {avatarUrl ? t("profileChangePhoto") : t("profileUploadPhoto")}
                </Button>
                {avatarUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleClearAvatar}>
                    {t("profileRemovePhoto")}
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">{t("loginUsernameOrEmail")}</Label>
                <p className="font-medium">{displayName || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="text-sm">{email || "—"}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">{t("theme")}</span>
              <Button variant="outline" size="sm" onClick={toggleTheme}>
                {theme === "dark" ? t("light") : t("dark")}
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t("language")}</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={language}
                onChange={(e) => setLanguage(e.target.value as "ru" | "en")}
              >
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
