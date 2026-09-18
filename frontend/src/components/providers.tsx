"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, API_URL, setToken } from "@/lib/api";
import type { Campus, CampusContent, User } from "@/lib/types";
type Context = {
  campus: Campus;
  setCampus: (c: Campus) => void;
  content: CampusContent[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  user: User | null;
  login: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  live: boolean;
  notice: string;
  dismissNotice: () => void;
};
const CampusContext = createContext<Context | null>(null);
export function Providers({ children }: { children: ReactNode }) {
  const [campus, setCampus] = useState<Campus>("all"),
    [content, setContent] = useState<CampusContent[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [user, setUser] = useState<User | null>(null),
    [live, setLive] = useState(false),
    [notice, setNotice] = useState("");
  const refresh = useCallback(async () => {
    try {
      setContent(await api<CampusContent[]>("/content"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const stream = new EventSource(`${API_URL}/content/stream`);
    stream.onopen = () => setLive(true);
    stream.onerror = () => setLive(false);
    stream.addEventListener("content", () => {
      void refresh();
      setNotice("Campus information has been updated.");
    });
    return () => stream.close();
  }, [refresh]);
  async function login(email: string, password: string, name?: string) {
    const data = await api<{ user: User; token: string }>(
      `/auth/${name ? "register" : "login"}`,
      {
        method: "POST",
        body: JSON.stringify({ email, password, ...(name ? { name } : {}) }),
      },
    );
    setToken(data.token);
    setUser(data.user);
  }
  function logout() {
    setToken(null);
    setUser(null);
  }
  return (
    <CampusContext.Provider
      value={{
        campus,
        setCampus,
        content,
        loading,
        error,
        refresh,
        user,
        login,
        logout,
        live,
        notice,
        dismissNotice: () => setNotice(""),
      }}
    >
      {children}
    </CampusContext.Provider>
  );
}
export function useCampus() {
  const context = useContext(CampusContext);
  if (!context) throw new Error("Campus provider missing");
  return context;
}
export function useFilteredContent() {
  const { content, campus } = useCampus();
  return content.filter(
    (c) => campus === "all" || c.campus === "all" || c.campus === campus,
  );
}
