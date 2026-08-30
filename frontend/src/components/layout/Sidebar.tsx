import { NavLink } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  disconnectSlack,
  logoutUrl,
  slackConnectUrl,
  type Me,
} from "../../lib/api";

type Props = {
  user: Me;
  scheduledCount: number;
  sentCount: number;
  onUserChange: (user: Me) => void;
};

export function Sidebar({
  user,
  scheduledCount,
  sentCount,
  onUserChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col border-r border-neutral-200 bg-white px-5 py-6">
      <p className="text-2xl font-black tracking-tight text-neutral-900">ONG</p>

      <div className="relative mt-6" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-3 rounded-xl bg-neutral-100 px-3 py-2 text-left"
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt=""
              className="size-9 rounded-full object-cover"
            />
          ) : (
            <div className="grid size-9 place-items-center rounded-full bg-[#22A45A] text-sm font-semibold text-white">
              {user.name.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-neutral-500">{user.email}</p>
          </div>
          <span className="text-neutral-400">▾</span>
        </button>

        {open ? (
          <div className="absolute left-0 right-0 z-20 mt-2 rounded-xl border border-neutral-200 bg-white py-1 text-sm shadow-lg">
            {user.slackConnected ? (
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-neutral-50"
                onClick={() => {
                  void disconnectSlack().then(() =>
                    onUserChange({
                      ...user,
                      slackConnected: false,
                      slackTeamName: null,
                    }),
                  );
                  setOpen(false);
                }}
              >
                Disconnect Slack
                {user.slackTeamName ? ` (${user.slackTeamName})` : ""}
              </button>
            ) : (
              <a
                href={slackConnectUrl()}
                className="block px-3 py-2 hover:bg-neutral-50"
              >
                Connect Slack
              </a>
            )}
            <a
              href={logoutUrl()}
              className="block px-3 py-2 text-red-600 hover:bg-neutral-50"
            >
              Logout
            </a>
          </div>
        ) : null}
      </div>

      <NavLink
        to="/compose"
        className="mt-5 flex h-11 items-center justify-center rounded-xl border border-[#22A45A] text-sm font-semibold text-[#22A45A]"
      >
        Compose
      </NavLink>

      <p className="mt-8 text-xs font-semibold tracking-wider text-neutral-400">
        CORE
      </p>
      <nav className="mt-2 space-y-1">
        <NavLink
          to="/inbox"
          end
          className={({ isActive }) =>
            `flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
              isActive ? "bg-[#c8e6c9] font-semibold text-neutral-900" : "text-neutral-700"
            }`
          }
        >
          <span className="flex items-center gap-2">
            <span aria-hidden>◷</span>
            Scheduled
          </span>
          <span>{scheduledCount}</span>
        </NavLink>
        <NavLink
          to="/inbox/sent"
          className={({ isActive }) =>
            `flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
              isActive ? "bg-[#c8e6c9] font-semibold text-neutral-900" : "text-neutral-700"
            }`
          }
        >
          <span className="flex items-center gap-2">
            <span aria-hidden>✈</span>
            Sent
          </span>
          <span>{sentCount}</span>
        </NavLink>
      </nav>
    </aside>
  );
}
