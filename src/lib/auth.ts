const USER_KEY     = "capplan_auth_user";
const PASS_KEY     = "capplan_auth_pass";
const IS_ADMIN_KEY = "capplan_auth_is_admin";

export function getAuthHeader(): string | undefined {
  const user = window.localStorage.getItem(USER_KEY);
  const pass = window.localStorage.getItem(PASS_KEY);
  if (!user || !pass) return undefined;
  return `Basic ${btoa(`${user}:${pass}`)}`;
}

export function saveAuthCredentials(user: string, pass: string) {
  window.localStorage.setItem(USER_KEY, user);
  window.localStorage.setItem(PASS_KEY, pass);
}

export function clearAuthCredentials() {
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(PASS_KEY);
  window.localStorage.removeItem(DISPLAY_NAME_KEY);
  window.localStorage.removeItem(EMAIL_KEY);
  window.localStorage.removeItem(ROLE_KEY);
  window.localStorage.removeItem(AVATAR_KEY);
  window.localStorage.removeItem(IS_ADMIN_KEY);
}

/** Сохраняет флаг администратора (role === "admin") */
export function setIsAdmin(value: boolean) {
  window.localStorage.setItem(IS_ADMIN_KEY, value ? "1" : "0");
}

/** Является ли текущий пользователь администратором */
export function isAdmin(): boolean {
  return window.localStorage.getItem(IS_ADMIN_KEY) === "1";
}

export function getStoredUser(): string {
  return window.localStorage.getItem(USER_KEY) ?? "";
}

/** Инициалы для аватара (первые 2 буквы логина в верхнем регистре) */
export function getUserInitials(): string {
  const u = getStoredUser().trim();
  if (!u) return "?";
  const parts = u.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  return u.slice(0, 2).toUpperCase();
}

/** Отображаемое имя (из API или по умолчанию из логина) */
const DISPLAY_NAME_KEY = "capplan_auth_display_name";
export function getDisplayName(): string {
  const stored = window.localStorage.getItem(DISPLAY_NAME_KEY);
  if (stored) return stored;
  const u = getStoredUser().trim();
  return u ? u.charAt(0).toUpperCase() + u.slice(1) : "";
}

export function setDisplayName(name: string) {
  if (name) window.localStorage.setItem(DISPLAY_NAME_KEY, name);
}

/** Email для отображения в профиле */
const EMAIL_KEY = "capplan_auth_email";
export function getStoredEmail(): string {
  const stored = window.localStorage.getItem(EMAIL_KEY);
  if (stored) return stored;
  const u = getStoredUser().trim();
  return u ? `${u}@gravitylabs.kz` : "";
}

export function setStoredEmail(email: string) {
  if (email) window.localStorage.setItem(EMAIL_KEY, email);
}

/** Роль/подпись под именем (например "management, gravity-ai") */
const ROLE_KEY = "capplan_auth_role";
export function getStoredRole(): string {
  return window.localStorage.getItem(ROLE_KEY) ?? "management, gravity-ai";
}

export function setStoredRole(role: string) {
  window.localStorage.setItem(ROLE_KEY, role);
}

/** Фото профиля (data URL), если задано */
const AVATAR_KEY = "capplan_auth_avatar";
export function getAvatarUrl(): string | null {
  return window.localStorage.getItem(AVATAR_KEY);
}
export function setAvatarUrl(dataUrl: string) {
  window.localStorage.setItem(AVATAR_KEY, dataUrl);
}
export function clearAvatar() {
  window.localStorage.removeItem(AVATAR_KEY);
}

/** Есть ли сохранённые учётные данные (пользователь считает авторизованным). Только localStorage — без входа через форму считаем не авторизованным. */
export function isAuthenticated(): boolean {
  const user = window.localStorage.getItem(USER_KEY);
  const pass = window.localStorage.getItem(PASS_KEY);
  return Boolean(user && pass);
}
