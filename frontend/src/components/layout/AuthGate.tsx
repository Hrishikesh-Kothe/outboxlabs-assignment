import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { getMe } from "../../lib/api";

export function AuthGate() {
  const navigate = useNavigate();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    void getMe().then((me) => {
      if (!me) {
        navigate("/", { replace: true });
        return;
      }
      setOk(true);
    });
  }, [navigate]);

  if (!ok) {
    return (
      <main className="grid min-h-screen place-items-center text-neutral-500">
        Loading…
      </main>
    );
  }

  return <Outlet />;
}
