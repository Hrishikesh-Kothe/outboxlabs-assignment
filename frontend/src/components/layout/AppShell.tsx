import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { getCounts, getMe, type Me } from "../../lib/api";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Me | null>(null);
  const [counts, setCounts] = useState({ scheduled: 0, sent: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([getMe(), getCounts().catch(() => ({ scheduled: 0, sent: 0 }))])
      .then(([me, nextCounts]) => {
        if (!me) {
          navigate("/", { replace: true });
          return;
        }
        setUser(me);
        setCounts(nextCounts);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center text-neutral-500">
        Loading…
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar
        user={user}
        scheduledCount={counts.scheduled}
        sentCount={counts.sent}
        onUserChange={setUser}
      />
      <div className="min-w-0 flex-1">
        <Outlet context={{ refreshCounts: () => void getCounts().then(setCounts) }} />
      </div>
    </div>
  );
}
