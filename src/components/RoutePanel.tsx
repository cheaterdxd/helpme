import {
  Activity,
  AlarmClock,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Inbox,
  ListChecks,
  Radar,
  Sparkles,
  Target
} from "lucide-react";
import type { ReactNode } from "react";
import { routeMeta, type Route } from "../navigation";
import type { ApiTask, AppData, DeadlineRadar } from "../types";

type SecondaryRoute = Exclude<Route, "now">;

type RoutePanelProps = {
  route: SecondaryRoute;
  data: AppData | null;
  error: string;
  onCommand: (message: string) => Promise<void>;
};

export function RoutePanel({ route, data, error, onCommand }: RoutePanelProps) {
  if (error) {
    return (
      <section className="route-panel" aria-label={routeMeta[route].label} data-active="true">
        <p className="block-label">{routeMeta[route].label}</p>
        <h1>Unable to load HelpMe data.</h1>
        <p>{error}</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="route-panel" aria-label={routeMeta[route].label} data-active="true">
        <p className="block-label">{routeMeta[route].label}</p>
        <h1>Loading HelpMe personal OS.</h1>
        <p>Reading tasks, calendar, deadlines, habits, goals, and planner state.</p>
      </section>
    );
  }

  if (route === "today") return <TodayView data={data} onCommand={onCommand} />;
  if (route === "inbox") return <InboxView data={data} onCommand={onCommand} />;
  if (route === "calendar") return <CalendarView data={data} onCommand={onCommand} />;
  if (route === "deadlines") return <DeadlinesView radar={data.deadlines} />;
  if (route === "goals") return <GoalsView data={data} />;
  if (route === "habits") return <HabitsView data={data} />;
  if (route === "review") return <ReviewView data={data} onCommand={onCommand} />;
  return <SettingsView data={data} />;
}

function TodayView({ data, onCommand }: { data: AppData; onCommand: (message: string) => Promise<void> }) {
  return (
    <section className="os-view" aria-label="Today">
      <ViewHeader
        icon={<CalendarDays aria-hidden="true" size={20} />}
        kicker="Today"
        title={data.today.greeting}
        body={data.today.overload.message}
        actionLabel="Plan 20-23"
        onAction={() => onCommand("Hom nay toi ranh tu 20h den 23h, sap lich giup toi")}
      />

      <div className="metric-strip">
        <Metric label="Due" value={data.today.summary.due_today} tone={data.today.summary.due_today ? "warn" : "clear"} />
        <Metric label="Inbox" value={data.today.summary.inbox_count} />
        <Metric label="Open" value={data.today.summary.open_tasks} />
        <Metric label="Free" value={`${Math.round(data.today.summary.available_minutes / 60)}h`} />
      </div>

      {data.today.suggested_focus && (
        <section className="focus-band">
          <div className="focus-band-icon">
            <Sparkles aria-hidden="true" size={20} />
          </div>
          <div>
            <p className="block-label">Suggested focus</p>
            <h2>{data.today.suggested_focus.title}</h2>
            <p>{data.today.suggested_focus.reason}</p>
          </div>
          <span>{data.today.suggested_focus.duration_minutes}m</span>
        </section>
      )}

      {data.today.suggested_focus && (
        <section className="planner-card" aria-label="Planner reasoning">
          <div>
            <p className="block-label">Planner score</p>
            <h2>{data.today.suggested_focus.score}</h2>
            <p>{data.today.suggested_focus.risk_summary}</p>
          </div>
          <ScoreChips breakdown={data.today.suggested_focus.score_breakdown} />
        </section>
      )}

      <div className="timeline">
        {data.today.timeline.map((item) => (
          <div className="timeline-row" key={item.id}>
            <time>{formatTime(item.start)}</time>
            <div>
              <strong>{item.title}</strong>
              <span>{formatTime(item.start)} - {formatTime(item.end)} · {item.type}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function InboxView({ data, onCommand }: { data: AppData; onCommand: (message: string) => Promise<void> }) {
  return (
    <section className="os-view" aria-label="Inbox">
      <ViewHeader
        icon={<Inbox aria-hidden="true" size={20} />}
        kicker="Inbox"
        title={`${data.tasks.inbox.length} captured task${data.tasks.inbox.length === 1 ? "" : "s"}`}
        body="Inbox keeps vague or unsorted work out of Today until HelpMe organizes it."
        actionLabel="Organize"
        onAction={() => onCommand("Organize inbox")}
      />

      <TaskList tasks={data.tasks.inbox} empty="Inbox is clear." />
    </section>
  );
}

function CalendarView({ data, onCommand }: { data: AppData; onCommand: (message: string) => Promise<void> }) {
  const items = [
    ...data.calendar.time_blocks.map((block) => ({
      id: block.id,
      title: block.title,
      start: block.start_at,
      end: block.end_at,
      meta: block.type
    })),
    ...data.calendar.events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start_at,
      end: event.end_at,
      meta: event.source
    }))
  ].sort((a, b) => a.start.localeCompare(b.start));

  return (
    <section className="os-view" aria-label="Calendar">
      <ViewHeader
        icon={<CalendarDays aria-hidden="true" size={20} />}
        kicker="Calendar"
        title="Time blocks for the current day"
        body="Calendar shows the plan HelpMe can validate before writing changes."
        actionLabel="Re-plan"
        onAction={() => onCommand("Hom nay toi ranh tu 20h den 23h, sap lich giup toi")}
      />

      <div className="calendar-rail">
        {items.map((item) => (
          <div className="time-card" key={item.id}>
            <span>{formatTime(item.start)}</span>
            <strong>{item.title}</strong>
            <small>{formatDuration(item.start, item.end)} · {item.meta}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function DeadlinesView({ radar }: { radar: DeadlineRadar }) {
  const columns: Array<[keyof DeadlineRadar, string]> = [
    ["overdue", "Overdue"],
    ["today", "Today"],
    ["this_week", "This week"],
    ["later", "Later"]
  ];

  return (
    <section className="os-view" aria-label="Deadline radar">
      <ViewHeader
        icon={<Radar aria-hidden="true" size={20} />}
        kicker="Deadline Radar"
        title="Urgency without a noisy dashboard"
        body="HelpMe groups commitments by time pressure and keeps scoring visible."
      />

      <div className="radar-grid">
        {columns.map(([key, label]) => (
          <section className="radar-column" key={key}>
            <h2>{label}</h2>
            {radar[key].length ? (
              radar[key].map((deadline) => (
                <div className="radar-item" data-severity={key} key={deadline.id}>
                  <strong>{deadline.title}</strong>
                  <span>{deadline.due_at.slice(0, 10)} · score {deadline.urgency_score}</span>
                </div>
              ))
            ) : (
              <p className="empty-state">Clear</p>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}

function GoalsView({ data }: { data: AppData }) {
  return (
    <section className="os-view" aria-label="Goals">
      <ViewHeader
        icon={<Target aria-hidden="true" size={20} />}
        kicker="Goals"
        title="Goal to project to task"
        body="HelpMe connects daily work back to larger outcomes."
      />

      <div className="goal-stack">
        {data.goals.map((goal) => (
          <section className="goal-row" key={goal.id}>
            <div>
              <p className="block-label">{goal.is_north_star ? "North Star" : "Goal"}</p>
              <h2>{goal.title}</h2>
              <div className="progress-track" aria-label={`${goal.progress}% progress`}>
                <span style={{ width: `${goal.progress}%` }} />
              </div>
            </div>
            <div className="project-chips">
              {goal.projects.map((project) => (
                <span key={project.id}>{project.title} · {project.tasks.length}</span>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function HabitsView({ data }: { data: AppData }) {
  return (
    <section className="os-view" aria-label="Habits">
      <ViewHeader
        icon={<Activity aria-hidden="true" size={20} />}
        kicker="Habits"
        title="Routine health"
        body="Habits stay lightweight: check the signal, then schedule a smaller block if needed."
      />

      <div className="habit-grid">
        {data.habits.map((habit) => (
          <section className="habit-item" key={habit.id}>
            <div>
              <strong>{habit.title}</strong>
              <span>{habit.frequency} · streak {habit.streak}</span>
            </div>
            <b>{habit.completion_rate}%</b>
            <p>{habit.insight}</p>
          </section>
        ))}
      </div>
    </section>
  );
}

function ReviewView({ data, onCommand }: { data: AppData; onCommand: (message: string) => Promise<void> }) {
  return (
    <section className="os-view" aria-label="Review">
      <ViewHeader
        icon={<CheckCircle2 aria-hidden="true" size={20} />}
        kicker="Review"
        title={data.review.prompt}
        body={data.review.summary}
        actionLabel="Apply review"
        onAction={() => onCommand("Evening review")}
      />

      <div className="split-grid">
        <section>
          <h2>Unfinished</h2>
          <TaskList tasks={data.review.unfinished} empty="No unfinished task in today's plan." />
        </section>
        <section>
          <h2>Suggested reschedule</h2>
          <div className="compact-list">
            {data.review.reschedule_suggestion.map((item) => (
              <div key={item.task_id}>
                <strong>{item.title}</strong>
                <span>{formatTime(item.suggested_start)} tomorrow</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function SettingsView({ data }: { data: AppData }) {
  return (
    <section className="os-view" aria-label="Settings">
      <ViewHeader
        icon={<AlarmClock aria-hidden="true" size={20} />}
        kicker="Settings"
        title="Local AI and behavior"
        body="Settings is quiet for now: the important signal is whether the local planner model is reachable."
      />

      <div className="settings-grid">
        <div>
          <span>Ollama daemon</span>
          <strong>{data.aiStatus.online ? "Online" : "Offline"}</strong>
        </div>
        <div>
          <span>Model ready</span>
          <strong>{data.aiStatus.model_available ? "Ready" : "Missing"}</strong>
        </div>
        <div>
          <span>Fallback</span>
          <strong>{data.aiStatus.ok ? "Ollama" : data.aiStatus.fallback_mode}</strong>
        </div>
      </div>
      {!data.aiStatus.ok && <p className="settings-note">{data.aiStatus.error ?? data.aiStatus.setup_hint}</p>}
    </section>
  );
}

function ViewHeader({
  icon,
  kicker,
  title,
  body,
  actionLabel,
  onAction
}: {
  icon: ReactNode;
  kicker: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <header className="view-header">
      <div className="view-icon">{icon}</div>
      <div>
        <p className="block-label">{kicker}</p>
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
      {actionLabel && onAction && (
        <button className="command-button" type="button" onClick={() => void onAction()}>
          <Sparkles aria-hidden="true" size={16} />
          <span>{actionLabel}</span>
        </button>
      )}
    </header>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string | number; tone?: "neutral" | "warn" | "clear" }) {
  return (
    <div className="metric" data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ScoreChips({
  breakdown
}: {
  breakdown: {
    deadline_urgency: number;
    user_priority: number;
    effort_fit: number;
    goal_importance: number;
    overdue_penalty: number;
    scheduled_today: number;
    dependency_unlock: number;
  };
}) {
  const chips = [
    ["Deadline", breakdown.deadline_urgency],
    ["Priority", breakdown.user_priority],
    ["Effort", breakdown.effort_fit],
    ["Goal", breakdown.goal_importance],
    ["Today", breakdown.scheduled_today],
    ["Unlock", breakdown.dependency_unlock]
  ];

  return (
    <div className="score-chips">
      {chips.map(([label, value]) => (
        <span key={label}>
          {label} <b>{value}</b>
        </span>
      ))}
    </div>
  );
}

function TaskList({ tasks, empty }: { tasks: ApiTask[]; empty: string }) {
  if (!tasks.length) {
    return <p className="empty-state">{empty}</p>;
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <article className="task-row" key={task.id}>
          <ListChecks aria-hidden="true" size={18} />
          <div>
            <strong>{task.title}</strong>
            <span>
              {task.project_title ?? task.goal_title ?? "Unlinked"} · {task.estimated_minutes ?? 30}m
            </span>
          </div>
          {task.due_at && (
            <small>
              <CircleAlert aria-hidden="true" size={13} />
              {task.due_at.slice(0, 10)}
            </small>
          )}
        </article>
      ))}
    </div>
  );
}

function formatTime(value: string) {
  return value.slice(11, 16);
}

function formatDuration(start: string, end: string) {
  const minutes = Math.max(Math.round((Date.parse(end) - Date.parse(start)) / 60000), 0);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
  }

  return `${minutes}m`;
}
