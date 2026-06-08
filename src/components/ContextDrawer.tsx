import type { NowBriefing } from "../types";

export function ContextDrawer({ briefing, open }: { briefing: NowBriefing; open: boolean }) {
  return (
    <aside className="context-drawer" aria-label="Hidden context" data-open={open}>
      <div>
        <h2>Hidden context</h2>
        <p>Summarized support for the recommendation. Full raw data stays in Archive.</p>
      </div>
      <div className="drawer-list">
        <DrawerRow title="North Star">{briefing.context_summary.north_star}</DrawerRow>
        <DrawerRow title="Hidden tasks">{briefing.context_summary.hidden_tasks}</DrawerRow>
        <DrawerRow title="Watched deadline">{briefing.context_summary.watched_deadline}</DrawerRow>
        <DrawerRow title="Available time">{briefing.context_summary.available_time}</DrawerRow>
      </div>
    </aside>
  );
}

function DrawerRow({ title, children }: { title: string; children: string }) {
  return (
    <div className="drawer-row">
      <strong>{title}</strong>
      <span>{children}</span>
    </div>
  );
}
