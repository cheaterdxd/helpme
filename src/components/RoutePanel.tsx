import {
  Activity,
  AlarmClock,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Folder,
  Home,
  Inbox,
  ListChecks,
  Play,
  Radar,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
  Plus,
  Clock
} from "lucide-react";
import { type ReactNode, useState, type FormEvent } from "react";
import { routeMeta, type Route } from "../navigation";
import type { ApiTask, AppData, DeadlineRadar, AppSettings } from "../types";
import { LoadingState, ErrorState, EmptyState } from "./UIFeedback";

type SecondaryRoute = Exclude<Route, "now">;

type RoutePanelProps = {
  route: SecondaryRoute;
  data: AppData | null;
  error: string;
  onCommand: (message: string) => Promise<void>;
  onCompleteTask: (taskId: string) => Promise<void>;
  onReopenTask: (taskId: string) => Promise<void>;
  onLogHabit: (habitId: string) => Promise<void>;
  onStartFocus: (taskId: string) => Promise<void>;
  onCompleteFocus: (sessionId: string, completeTask?: boolean) => Promise<void>;
  onUpdateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  onEditTask: (task: ApiTask | null) => void;
  onCompleteReminder: (reminderId: string) => Promise<void>;
  onSnoozeReminder: (reminderId: string, minutes?: number) => Promise<void>;
};

export function RoutePanel({
  route,
  data,
  error,
  onCommand,
  onCompleteTask,
  onReopenTask,
  onLogHabit,
  onStartFocus,
  onCompleteFocus,
  onUpdateSettings,
  onEditTask,
  onCompleteReminder,
  onSnoozeReminder
}: RoutePanelProps) {
  if (error) {
    return (
      <ErrorState
        kicker={routeMeta[route].label}
        title="Unable to load HelpMe data."
        error={error}
      />
    );
  }

  if (!data) {
    return (
      <LoadingState
        kicker={routeMeta[route].label}
        title="Loading HelpMe personal OS."
        body="Reading tasks, calendar, deadlines, habits, goals, and planner state."
      />
    );
  }

  if (route === "today") {
    return (
      <TodayView
        data={data}
        onCommand={onCommand}
        onCompleteTask={onCompleteTask}
        onStartFocus={onStartFocus}
        onCompleteFocus={onCompleteFocus}
        onEditTask={onEditTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
      />
    );
  }
  if (route === "inbox") return <InboxView data={data} onCommand={onCommand} onEditTask={onEditTask} />;
  if (route === "calendar") return <CalendarView data={data} onCommand={onCommand} />;
  if (route === "deadlines") return <DeadlinesView radar={data.deadlines} />;
  if (route === "goals") return <GoalsView data={data} />;
  if (route === "habits") return <HabitsView data={data} onLogHabit={onLogHabit} />;
  if (route === "review") return <ReviewView data={data} onCommand={onCommand} onCompleteTask={onCompleteTask} onReopenTask={onReopenTask} onEditTask={onEditTask} />;
  return <SettingsView data={data} onUpdateSettings={onUpdateSettings} />;
}

function TodayView({
  data,
  onCommand,
  onCompleteTask,
  onStartFocus,
  onCompleteFocus,
  onEditTask,
  onCompleteReminder,
  onSnoozeReminder
}: {
  data: AppData;
  onCommand: (message: string) => Promise<void>;
  onCompleteTask: (taskId: string) => Promise<void>;
  onStartFocus: (taskId: string) => Promise<void>;
  onCompleteFocus: (sessionId: string, completeTask?: boolean) => Promise<void>;
  onEditTask: (task: ApiTask | null) => void;
  onCompleteReminder: (reminderId: string) => Promise<void>;
  onSnoozeReminder: (reminderId: string, minutes?: number) => Promise<void>;
}) {
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

      {data.today.reminders && data.today.reminders.length > 0 && (
        <section className="reminder-container" style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "16px 0" }}>
          {data.today.reminders.map((reminder) => (
            <div
              key={reminder.id}
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(245, 158, 11, 0.1)",
                    color: "rgb(245, 158, 11)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <AlarmClock size={16} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>{reminder.title}</h4>
                  <small style={{ color: "var(--muted)", fontSize: "12px" }}>
                    Nhắc nhở lúc: {reminder.remind_at.slice(11, 16)}
                  </small>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => void onSnoozeReminder(reminder.id)}
                  style={{
                    background: "none",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius)",
                    padding: "6px 12px",
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "var(--muted)"
                  }}
                >
                  <Clock size={12} />
                  <span>Hoãn 15p</span>
                </button>
                <button
                  type="button"
                  onClick={() => void onCompleteReminder(reminder.id)}
                  style={{
                    background: "var(--accent-tint, rgba(33, 47, 39, 0.05))",
                    border: "1px solid var(--accent)",
                    borderRadius: "var(--radius)",
                    padding: "6px 12px",
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "var(--accent)"
                  }}
                >
                  <CheckCircle2 size={12} />
                  <span>Xong</span>
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="metric-strip">
        <Metric label="Due" value={data.today.summary.due_today} tone={data.today.summary.due_today ? "warn" : "clear"} />
        <Metric label="Inbox" value={data.today.summary.inbox_count} />
        <Metric label="Open" value={data.today.summary.open_tasks} />
        <Metric label="Free" value={`${Math.round(data.today.summary.available_minutes / 60)}h`} />
      </div>

      {data.today.focus_session && (
        <section className="focus-band" data-mode="active">
          <div className="focus-band-icon">
            <Timer aria-hidden="true" size={20} />
          </div>
          <div>
            <p className="block-label">In focus</p>
            <h2>{data.today.focus_session.title}</h2>
            <p>
              {formatTime(data.today.focus_session.start_at ?? "")} start
              {data.today.focus_session.project_title ? ` - ${data.today.focus_session.project_title}` : ""}
            </p>
          </div>
          <div className="focus-actions">
            <span>{data.today.focus_session.duration_minutes}m</span>
            <button type="button" onClick={() => void onCompleteFocus(data.today.focus_session!.id)}>
              <CheckCircle2 aria-hidden="true" size={15} />
              <span>End</span>
            </button>
            <button type="button" onClick={() => void onCompleteFocus(data.today.focus_session!.id, true)}>
              <CheckCircle2 aria-hidden="true" size={15} />
              <span>Done</span>
            </button>
          </div>
        </section>
      )}

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
          <div className="focus-actions">
            <span>{data.today.suggested_focus.duration_minutes}m</span>
            <button type="button" onClick={() => void onStartFocus(data.today.suggested_focus!.task_id)}>
              <Play aria-hidden="true" size={15} />
              <span>Start</span>
            </button>
            <button type="button" onClick={() => void onCompleteTask(data.today.suggested_focus!.task_id)}>
              <CheckCircle2 aria-hidden="true" size={15} />
              <span>Done</span>
            </button>
          </div>
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
      <section className="os-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h2 style={{ margin: 0 }}>Today tasks</h2>
          <button
            type="button"
            className="row-action"
            onClick={() => onEditTask(null)}
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "var(--radius)", cursor: "pointer", background: "var(--panel)" }}
          >
            <Plus size={14} />
            <span>Add Task</span>
          </button>
        </div>
        <TaskList tasks={data.tasks.today} empty="No task scheduled or due today." onCompleteTask={onCompleteTask} onEditTask={onEditTask} />
      </section>
    </section>
  );
}

function InboxView({
  data,
  onCommand,
  onEditTask
}: {
  data: AppData;
  onCommand: (message: string) => Promise<void>;
  onEditTask: (task: ApiTask | null) => void;
}) {
  const lanes = buildInboxLanes(data.tasks.inbox);

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

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <button
          type="button"
          className="row-action"
          onClick={() => onEditTask(null)}
          style={{ display: "flex", alignItems: "center", gap: "4px", padding: "8px 16px", borderRadius: "var(--radius)", cursor: "pointer", background: "var(--panel)" }}
        >
          <Plus size={14} />
          <span>Add Task</span>
        </button>
      </div>

      {data.tasks.inbox.length ? (
        <div className="inbox-lanes">
          {lanes.map((lane) => (
            <section className="inbox-lane" key={lane.key}>
              <header>
                <span>{lane.icon}</span>
                <div>
                  <h2>{lane.label}</h2>
                  <small>{lane.tasks.length}</small>
                </div>
              </header>
              <div>
                {lane.tasks.length ? (
                  lane.tasks.map((task) => (
                    <article className="inbox-card" key={task.id} style={{ cursor: "pointer" }} onClick={() => onEditTask(task)}>
                      <strong>{task.title}</strong>
                      <span>{task.project_title ?? task.goal_title ?? "Unlinked"}</span>
                      <footer>
                        <small>P{task.priority}</small>
                        <small>{task.estimated_minutes ?? 30}m</small>
                      </footer>
                    </article>
                  ))
                ) : (
                  <p className="empty-state">Clear</p>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Inbox is clear"
          message="Vague or unsorted tasks will show up here until HelpMe organizes them."
        />
      )}
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
              <div style={{ color: "var(--muted)", fontSize: "13px", padding: "12px 4px" }}>
                Clear
              </div>
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

function HabitsView({ data, onLogHabit }: { data: AppData; onLogHabit: (habitId: string) => Promise<void> }) {
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
            <button className="inline-action" type="button" onClick={() => void onLogHabit(habit.id)}>
              <CheckCircle2 aria-hidden="true" size={15} />
              <span>Check today</span>
            </button>
          </section>
        ))}
      </div>
    </section>
  );
}

function ReviewView({
  data,
  onCommand,
  onCompleteTask,
  onReopenTask,
  onEditTask
}: {
  data: AppData;
  onCommand: (message: string) => Promise<void>;
  onCompleteTask: (taskId: string) => Promise<void>;
  onReopenTask: (taskId: string) => Promise<void>;
  onEditTask: (task: ApiTask | null) => void;
}) {
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
          <TaskList tasks={data.review.unfinished} empty="No unfinished task in today's plan." onCompleteTask={onCompleteTask} onEditTask={onEditTask} />
        </section>
        <section>
          <h2>Suggested reschedule</h2>
          <div className="compact-list">
            {data.review.reschedule_suggestion.map((item) => (
              <div key={item.task_id}>
                <strong>{item.title}</strong>
                <span>
                  {formatDateLabel(item.suggested_start)} {formatTime(item.suggested_start)} - {formatTime(item.suggested_end)} / {item.duration_minutes}m
                </span>
              </div>
            ))}
            {!data.review.reschedule_suggestion.length && (
              <div style={{ color: "var(--muted)", fontSize: "13px", padding: "12px 4px" }}>
                No reschedule needed.
              </div>
            )}
          </div>
        </section>
        <section>
          <h2>Completed</h2>
          <TaskList tasks={data.review.completed} empty="No completed task in today's plan." onReopenTask={onReopenTask} onEditTask={onEditTask} />
        </section>
      </div>
    </section>
  );
}

function SettingsView({
  data,
  onUpdateSettings
}: {
  data: AppData;
  onUpdateSettings: (settings: Partial<AppSettings>) => Promise<void>;
}) {
  const settings = data.settings || {
    display_name: "",
    timezone: "Asia/Ho_Chi_Minh",
    working_window_start: "20:00",
    working_window_end: "23:00",
    preferred_model: "qwen3:1.7b",
    model_timeout_ms: 3000,
    deep_mode: false
  };

  const [displayName, setDisplayName] = useState(settings.display_name);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [workingWindowStart, setWorkingWindowStart] = useState(settings.working_window_start);
  const [workingWindowEnd, setWorkingWindowEnd] = useState(settings.working_window_end);
  const [preferredModel, setPreferredModel] = useState(settings.preferred_model);
  const [modelTimeoutMs, setModelTimeoutMs] = useState(settings.model_timeout_ms);
  const [deepMode, setDeepMode] = useState(settings.deep_mode);

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      await onUpdateSettings({
        display_name: displayName,
        timezone,
        working_window_start: workingWindowStart,
        working_window_end: workingWindowEnd,
        preferred_model: preferredModel,
        model_timeout_ms: Number(modelTimeoutMs),
        deep_mode: deepMode
      });
      setSuccessMessage("Preferences saved successfully!");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="os-view" aria-label="Settings">
      <ViewHeader
        icon={<AlarmClock aria-hidden="true" size={20} />}
        kicker="Settings"
        title="Local AI and behavior"
        body="Customize your schedule, AI runtime budget, model selections, and user profile."
      />

      <div className="settings-grid" style={{ marginBottom: "24px" }}>
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
      {!data.aiStatus.ok && <p className="settings-note" style={{ marginBottom: "24px" }}>{data.aiStatus.error ?? data.aiStatus.setup_hint}</p>}

      <form onSubmit={handleSubmit} className="settings-container">
        {successMessage && <div className="settings-alert-success">{successMessage}</div>}
        {errorMessage && <div className="settings-alert-error">{errorMessage}</div>}

        <div className="settings-section-card">
          <h3>Personal Profile</h3>
          <div className="settings-form-group">
            <label htmlFor="displayName">Display Name</label>
            <input
              type="text"
              id="displayName"
              className="settings-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div className="settings-form-group">
            <label htmlFor="timezone">Timezone</label>
            <input
              type="text"
              id="timezone"
              className="settings-input"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="settings-section-card">
          <h3>Working Hours Window</h3>
          <p className="settings-note" style={{ marginBottom: "14px", fontSize: "13px" }}>
            Define when HelpMe should schedule your daily activities and focus sessions.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div className="settings-form-group">
              <label htmlFor="workingWindowStart">Start Time (HH:MM)</label>
              <input
                type="text"
                id="workingWindowStart"
                className="settings-input"
                placeholder="e.g. 20:00"
                value={workingWindowStart}
                onChange={(e) => setWorkingWindowStart(e.target.value)}
                required
              />
            </div>
            <div className="settings-form-group">
              <label htmlFor="workingWindowEnd">End Time (HH:MM)</label>
              <input
                type="text"
                id="workingWindowEnd"
                className="settings-input"
                placeholder="e.g. 23:00"
                value={workingWindowEnd}
                onChange={(e) => setWorkingWindowEnd(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <div className="settings-section-card">
          <h3>Local AI Runtime Configuration</h3>
          <div className="settings-form-group">
            <label htmlFor="preferredModel">Preferred LLM Model</label>
            <input
              type="text"
              id="preferredModel"
              className="settings-input"
              value={preferredModel}
              onChange={(e) => setPreferredModel(e.target.value)}
              required
            />
          </div>
          <div className="settings-form-group">
            <label htmlFor="modelTimeoutMs">Quick Model Timeout (ms)</label>
            <input
              type="number"
              id="modelTimeoutMs"
              className="settings-input"
              value={modelTimeoutMs}
              onChange={(e) => setModelTimeoutMs(Number(e.target.value))}
              required
            />
          </div>
          <div className="settings-form-group settings-checkbox-group">
            <input
              type="checkbox"
              id="deepMode"
              className="settings-checkbox"
              checked={deepMode}
              onChange={(e) => setDeepMode(e.target.checked)}
            />
            <label htmlFor="deepMode" style={{ cursor: "pointer" }}>Enable Deep Planning Mode by Default</label>
          </div>
        </div>

        <button type="submit" className="settings-save-btn" disabled={saving}>
          {saving ? "Saving..." : "Save preferences"}
        </button>
      </form>
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

function TaskList({
  tasks,
  empty,
  onCompleteTask,
  onReopenTask,
  onEditTask
}: {
  tasks: ApiTask[];
  empty: string;
  onCompleteTask?: (taskId: string) => Promise<void>;
  onReopenTask?: (taskId: string) => Promise<void>;
  onEditTask?: (task: ApiTask) => void;
}) {
  if (!tasks.length) {
    return <p className="empty-state">{empty}</p>;
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <article
          className="task-row"
          key={task.id}
          style={{ cursor: onEditTask ? "pointer" : "default" }}
          onClick={() => onEditTask?.(task)}
        >
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
          {onCompleteTask && task.status !== "done" && (
            <button
              className="row-action"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void onCompleteTask(task.id);
              }}
            >
              <CheckCircle2 aria-hidden="true" size={14} />
              <span>Done</span>
            </button>
          )}
          {onReopenTask && task.status === "done" && (
            <button
              className="row-action"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void onReopenTask(task.id);
              }}
            >
              <RotateCcw aria-hidden="true" size={14} />
              <span>Reopen</span>
            </button>
          )}
        </article>
      ))}
    </div>
  );
}

function formatTime(value: string) {
  return value.slice(11, 16);
}

function formatDateLabel(value: string) {
  return value.slice(0, 10);
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

function buildInboxLanes(tasks: ApiTask[]) {
  const lanes = [
    {
      key: "learning",
      label: "Learning",
      icon: <BookOpen aria-hidden="true" size={17} />,
      tasks: tasks.filter((task) => classifyInboxTask(task) === "learning")
    },
    {
      key: "project",
      label: "Project",
      icon: <Folder aria-hidden="true" size={17} />,
      tasks: tasks.filter((task) => classifyInboxTask(task) === "project")
    },
    {
      key: "personal",
      label: "Personal",
      icon: <Home aria-hidden="true" size={17} />,
      tasks: tasks.filter((task) => classifyInboxTask(task) === "personal")
    }
  ];

  return lanes;
}

function classifyInboxTask(task: ApiTask) {
  if (/aws|study|read|learn|whitepaper/i.test(task.title)) return "learning";
  if (/helpme|report|design|product|mvp|ui|ux/i.test(task.title)) return "project";
  return "personal";
}
