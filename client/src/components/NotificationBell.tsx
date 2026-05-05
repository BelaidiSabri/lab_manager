import { useCallback, useEffect, useRef, useState, startTransition } from 'react';
import { Link } from 'react-router-dom';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead, type NotificationRow } from '../services/labApi';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const d = await fetchNotifications();
      setRows(d.notifications);
      setUnread(d.unreadCount);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
    const id = window.setInterval(() => void load(), 60000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const onMarkOne = async (id: string) => {
    try {
      await markNotificationRead(id);
      await load();
    } catch {
      /* ignore */
    }
  };

  const onMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      await load();
      setOpen(false);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        aria-label="Notifications"
        onClick={() => {
          setOpen((o) => !o);
          void load();
        }}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-sm font-semibold text-slate-900">Notifications</span>
            {unread > 0 && (
              <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => void onMarkAll()}>
                Tout lu
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
            {rows.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-500">Aucune notification.</li>
            ) : (
              rows.map((n) => (
                <li
                  key={n._id}
                  className={`border-b border-slate-50 px-3 py-2.5 last:border-0 ${n.read ? 'opacity-75' : 'bg-primary-light/30'}`}
                >
                  <p className="text-sm font-medium text-slate-900">{n.title}</p>
                  <p className="mt-1 text-xs text-slate-600">{n.body}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!n.read && (
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => void onMarkOne(n._id)}
                      >
                        Marquer lu
                      </button>
                    )}
                    <Link to="/concours" className="text-xs text-slate-500 hover:text-primary" onClick={() => setOpen(false)}>
                      Concours →
                    </Link>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
