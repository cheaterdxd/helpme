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
  Clock,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Trash2,
  MapPin,
  AlertTriangle,
  Calendar,
  X
} from "lucide-react";
import { type ReactNode, useState, type FormEvent, useEffect } from "react";
import { routeMeta, type Route } from "../navigation";
import type { ApiTask, AppData, DeadlineRadar, AppSettings } from "../types";
import { LoadingState, ErrorState, EmptyState } from "./UIFeedback";
import {
  fetchCalendarApi,
  createCalendarEventApi,
  updateCalendarEventApi,
  deleteCalendarEventApi,
  createTimeBlockApi,
  updateTimeBlockApi,
  deleteTimeBlockApi,
  updateTaskApi,
  fetchDeadlineRadarApi,
  createDeadlineApi,
  updateDeadlineApi,
  deleteDeadlineApi,
  createHabitApi,
  updateHabitApi,
  deleteHabitApi,
  fetchHabitInsightApi,
  createGoalApi,
  updateGoalApi,
  deleteGoalApi,
  createProjectApi,
  updateProjectApi,
  deleteProjectApi,
  saveReviewApi,
  fetchReviewHistoryApi,
  fetchMorningBriefApi
} from "../api";
import { HabitEditorModal } from "./HabitEditorModal";
import { GoalEditorModal } from "./GoalEditorModal";
import { ProjectEditorModal } from "./ProjectEditorModal";

type SecondaryRoute = Exclude<Route, "now">;

type RoutePanelProps = {
  route: SecondaryRoute;
  data: AppData | null;
  error: string;
  onCommand: (message: string) => Promise<void>;
  onCompleteTask: (taskId: string) => Promise<void>;
  onReopenTask: (taskId: string) => Promise<void>;
  onLogHabit: (habitId: string) => Promise<void>;
  onUpdateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  onEditTask: (task: ApiTask | null) => void;
  onCompleteReminder: (reminderId: string) => Promise<void>;
  onSnoozeReminder: (reminderId: string, minutes?: number) => Promise<void>;
  onReloadData: () => Promise<void>;
};

export function RoutePanel({
  route,
  data,
  error,
  onCommand,
  onCompleteTask,
  onReopenTask,
  onLogHabit,
  onUpdateSettings,
  onEditTask,
  onCompleteReminder,
  onSnoozeReminder,
  onReloadData
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
        onEditTask={onEditTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
      />
    );
  }
  if (route === "inbox") return <InboxView data={data} onCommand={onCommand} onEditTask={onEditTask} />;
  if (route === "calendar") return <CalendarView data={data} onCommand={onCommand} onEditTask={onEditTask} />;
  if (route === "deadlines") return <DeadlinesView radar={data.deadlines} onCommand={onCommand} data={data} />;
  if (route === "goals") return <GoalsView data={data} onReloadData={onReloadData} onCommand={onCommand} />;
  if (route === "habits") return <HabitsView data={data} onLogHabit={onLogHabit} onReloadData={onReloadData} />;
  if (route === "review") return <ReviewView data={data} onCommand={onCommand} onCompleteTask={onCompleteTask} onReopenTask={onReopenTask} onEditTask={onEditTask} onReloadData={onReloadData} />;
  return <SettingsView data={data} onUpdateSettings={onUpdateSettings} />;
}

function TodayView({
  data,
  onCommand,
  onCompleteTask,
  onEditTask,
  onCompleteReminder,
  onSnoozeReminder
}: {
  data: AppData;
  onCommand: (message: string) => Promise<void>;
  onCompleteTask: (taskId: string) => Promise<void>;
  onEditTask: (task: ApiTask | null) => void;
  onCompleteReminder: (reminderId: string) => Promise<void>;
  onSnoozeReminder: (reminderId: string, minutes?: number) => Promise<void>;
}) {
  const [brief, setBrief] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchMorningBriefApi()
      .then((res) => {
        if (active) setBrief(res);
      })
      .catch((err) => {
        console.error(err);
        if (active) setBrief("Không thể kết nối với AI để tải Morning Brief.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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

      {/* AI Morning Brief Box */}
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          boxShadow: "0 2px 8px rgba(33, 47, 39, 0.02)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={16} style={{ color: "var(--accent)" }} />
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--accent)" }}>AI Morning Briefing</h3>
        </div>
        {loading ? (
          <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", fontStyle: "italic" }}>AI đang tổng hợp thông tin chào buổi sáng...</p>
        ) : (
          <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.6, color: "var(--ink)" }}>{brief || "Không có lời khuyên nào cho hôm nay."}</p>
        )}
      </div>

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

      {data.today.suggested_focus && (
        <section className="os-section" style={{ marginTop: "16px" }}>
          <div>
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

function CalendarView({
  data,
  onCommand,
  onEditTask
}: {
  data: AppData;
  onCommand: (message: string) => Promise<void>;
  onEditTask: (task: ApiTask | null) => void;
}) {
  const [mode, setMode] = useState<"day" | "week">("day");
  const [startDate, setStartDate] = useState(data.today.date || new Date().toISOString().slice(0, 10));
  const [calendarData, setCalendarData] = useState<any>(data.calendar);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"event" | "time-block">("event");
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [taskPickerWindow, setTaskPickerWindow] = useState<any | null>(null);

  // Load calendar data when mode or startDate changes
  const loadCalendar = async (currentMode = mode, currentStartDate = startDate) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchCalendarApi(currentMode, currentStartDate);
      setCalendarData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load calendar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate === data.today.date && mode === "day") {
      setCalendarData(data.calendar);
    }
  }, [data.calendar, data.today.date]);

  const handleNavigate = (direction: "prev" | "next" | "today") => {
    let nextDate = startDate;
    if (direction === "today") {
      nextDate = data.today.date || new Date().toISOString().slice(0, 10);
    } else {
      const offset = mode === "week" ? 7 : 1;
      const date = new Date(`${startDate}T00:00:00`);
      date.setDate(date.getDate() + (direction === "next" ? offset : -offset));
      nextDate = date.toISOString().slice(0, 10);
    }
    setStartDate(nextDate);
    void loadCalendar(mode, nextDate);
  };

  const handleModeChange = (newMode: "day" | "week") => {
    setMode(newMode);
    void loadCalendar(newMode, startDate);
  };

  const handleSaveModalItem = async (itemPayload: any) => {
    try {
      if (modalType === "event") {
        if (editingItem && editingItem.id) {
          await updateCalendarEventApi(editingItem.id, itemPayload);
        } else {
          await createCalendarEventApi(itemPayload);
        }
      } else {
        if (editingItem && editingItem.id) {
          await updateTimeBlockApi(editingItem.id, itemPayload);
        } else {
          await createTimeBlockApi(itemPayload);
        }
      }
      setModalOpen(false);
      void loadCalendar();
    } catch (err: any) {
      throw err; // Propagate to modal to show validation/conflict error
    }
  };

  const handleDeleteModalItem = async (itemId: string) => {
    try {
      if (modalType === "event") {
        await deleteCalendarEventApi(itemId);
      } else {
        await deleteTimeBlockApi(itemId);
      }
      setModalOpen(false);
      void loadCalendar();
    } catch (err: any) {
      alert(err.message || "Failed to delete item.");
    }
  };

  const openCreateModal = (type: "event" | "time-block", presetStart?: string) => {
    setModalType(type);
    setEditingItem(presetStart ? { start_at: presetStart } : null);
    setModalOpen(true);
  };

  const openEditModal = (item: any, type: "event" | "time-block") => {
    setModalType(type);
    setEditingItem(item);
    setModalOpen(true);
  };

  // Build items list for Day View
  const dayItems = calendarData && calendarData.mode === "day"
    ? [
        ...(calendarData.time_blocks || []).map((tb: any) => ({ ...tb, itemType: "time-block" as const })),
        ...(calendarData.events || []).map((ev: any) => ({ ...ev, itemType: "event" as const }))
      ].sort((a, b) => a.start_at.localeCompare(b.start_at))
    : [];

  const allTasks = [...(data.tasks.open || []), ...(data.tasks.inbox || [])];
  const unscheduledTasks = allTasks.filter((t) => !t.scheduled_start && t.status !== "done" && t.status !== "cancelled");

  const handleScheduleTaskIntoWindow = async (task: ApiTask, win: any) => {
    try {
      const endDate = new Date(win.start);
      endDate.setMinutes(endDate.getMinutes() + (task.estimated_minutes || 30));
      const pad = (n: number) => String(n).padStart(2, "0");
      const endAt = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00+07:00`;
      await updateTaskApi(task.id, {
        scheduled_start: win.start,
        scheduled_end: endAt
      });
      setTaskPickerWindow(null);
      void loadCalendar();
    } catch (err: any) {
      alert(err.message || "Failed to schedule task.");
    }
  };

  return (
    <section className="os-view" aria-label="Calendar">
      <ViewHeader
        icon={<CalendarDays aria-hidden="true" size={20} />}
        kicker="Calendar"
        title="Personal scheduling surface"
        body="Calendar shows your daily plan and lets you manage events and focus time blocks."
        actionLabel="Re-plan"
        onAction={() => onCommand("Hom nay toi ranh tu 20h den 23h, sap lich giup toi")}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            className="row-action"
            onClick={() => handleNavigate("prev")}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", padding: 0 }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="row-action"
            onClick={() => handleNavigate("today")}
            style={{ padding: "6px 12px", fontSize: "13px" }}
          >
            Today
          </button>
          <button
            type="button"
            className="row-action"
            onClick={() => handleNavigate("next")}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", padding: 0 }}
          >
            <ChevronRight size={16} />
          </button>
          <span style={{ fontSize: "14px", fontWeight: 600, marginLeft: "8px" }}>
            {mode === "day"
              ? new Date(`${startDate}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
              : `Week of ${new Date(`${startDate}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ display: "flex", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "2px", background: "var(--panel)" }}>
            <button
              type="button"
              onClick={() => handleModeChange("day")}
              style={{
                background: mode === "day" ? "var(--bg)" : "none",
                border: "none",
                borderRadius: "calc(var(--radius) - 2px)",
                padding: "4px 12px",
                fontSize: "12px",
                fontWeight: mode === "day" ? 600 : 500,
                cursor: "pointer",
                color: mode === "day" ? "var(--text)" : "var(--muted)"
              }}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("week")}
              style={{
                background: mode === "week" ? "var(--bg)" : "none",
                border: "none",
                borderRadius: "calc(var(--radius) - 2px)",
                padding: "4px 12px",
                fontSize: "12px",
                fontWeight: mode === "week" ? 600 : 500,
                cursor: "pointer",
                color: mode === "week" ? "var(--text)" : "var(--muted)"
              }}
            >
              Week
            </button>
          </div>

          <button
            type="button"
            className="row-action"
            onClick={() => openCreateModal("event")}
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", fontSize: "13px" }}
          >
            <Plus size={14} />
            <span>Event</span>
          </button>
          <button
            type="button"
            className="row-action"
            onClick={() => openCreateModal("time-block")}
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", fontSize: "13px" }}
          >
            <Plus size={14} />
            <span>Block</span>
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ color: "var(--muted)", fontSize: "13px", margin: "8px 0" }}>
          Loading calendar...
        </div>
      )}
      {error && (
        <div className="settings-alert-error" style={{ margin: "8px 0" }}>
          {error}
        </div>
      )}

      {/* Day View */}
      {calendarData && calendarData.mode === "day" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
          {dayItems.map((item) => (
            <div
              key={item.id}
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                padding: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                position: "relative"
              }}
              onClick={() => openEditModal(item, item.itemType)}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: item.itemType === "event" ? "var(--accent)" : "rgb(245, 158, 11)",
                      backgroundColor: item.itemType === "event" ? "rgba(33, 47, 39, 0.05)" : "rgba(245, 158, 11, 0.1)",
                      padding: "2px 6px",
                      borderRadius: "4px"
                    }}
                  >
                    {item.itemType === "event" ? "Event" : "Block"}
                  </span>
                  <strong style={{ fontSize: "15px" }}>{item.title}</strong>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--muted)" }}>
                  {formatTime(item.start_at)} - {formatTime(item.end_at)} ({formatDuration(item.start_at, item.end_at)})
                  {item.location && ` · 📍 ${item.location}`}
                  {item.type && item.type !== "task" && ` · ${item.type}`}
                  {item.status && ` · status: ${item.status}`}
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="row-action"
                  onClick={() => openEditModal(item, item.itemType)}
                  style={{ padding: "6px" }}
                >
                  <Edit3 size={14} />
                </button>
                <button
                  type="button"
                  className="row-action"
                  onClick={() => void handleDeleteModalItem(item.id)}
                  style={{ padding: "6px", color: "#c81e1e" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {dayItems.length === 0 && (
            <EmptyState title="No items scheduled" message="Add an event or a time block to start planning." />
          )}

          {calendarData.free_windows && calendarData.free_windows.length > 0 && (
            <section style={{ marginTop: "24px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--muted)", marginBottom: "12px" }}>Available Windows</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
                {calendarData.free_windows.map((win: any) => (
                  <div
                    key={win.id}
                    style={{
                      border: "1px dashed var(--line)",
                      borderRadius: "var(--radius)",
                      padding: "12px",
                      backgroundColor: "rgba(33, 47, 39, 0.02)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px"
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "13px" }}>{win.label}</strong>
                      <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--muted)" }}>
                        {formatTime(win.start)} - {formatTime(win.end)} ({win.minutes}m)
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="row-action"
                        style={{ fontSize: "11px", padding: "4px 8px" }}
                        onClick={() => openCreateModal("time-block", win.start)}
                      >
                        + Block
                      </button>
                      <button
                        type="button"
                        className="row-action"
                        style={{ fontSize: "11px", padding: "4px 8px" }}
                        onClick={() => onEditTask({ scheduled_start: win.start } as any)}
                      >
                        + New Task
                      </button>
                      <button
                        type="button"
                        className="row-action"
                        style={{ fontSize: "11px", padding: "4px 8px", color: "var(--accent)" }}
                        onClick={() => setTaskPickerWindow(taskPickerWindow?.id === win.id ? null : win)}
                      >
                        ⚡ Schedule
                      </button>
                    </div>
                    {taskPickerWindow?.id === win.id && (
                      <div style={{
                        marginTop: "8px",
                        border: "1px solid var(--line)",
                        borderRadius: "var(--radius)",
                        background: "var(--bg)",
                        maxHeight: "200px",
                        overflowY: "auto",
                        padding: "4px"
                      }}>
                        {unscheduledTasks.length === 0 ? (
                          <p style={{ fontSize: "12px", color: "var(--muted)", padding: "8px", margin: 0, textAlign: "center" }}>
                            No unscheduled tasks
                          </p>
                        ) : (
                          unscheduledTasks.map((task) => (
                            <button
                              key={task.id}
                              type="button"
                              style={{
                                width: "100%",
                                textAlign: "left",
                                background: "none",
                                border: "none",
                                padding: "8px",
                                cursor: "pointer",
                                borderRadius: "4px",
                                fontSize: "12px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                color: "var(--text)"
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.background = "var(--panel)")}
                              onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                              onClick={() => void handleScheduleTaskIntoWindow(task, win)}
                            >
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                {task.title}
                              </span>
                              <span style={{ color: "var(--muted)", fontSize: "10px", marginLeft: "8px", flexShrink: 0 }}>
                                {task.estimated_minutes ?? 30}m
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Week View */}
      {calendarData && calendarData.mode === "week" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "12px",
            marginTop: "16px"
          }}
        >
          {(calendarData.days || []).map((day: any) => {
            const dayDate = new Date(`${day.date}T00:00:00`);
            const dayLabel = dayDate.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
            const dayItems = [
              ...(day.time_blocks || []).map((tb: any) => ({ ...tb, itemType: "time-block" as const })),
              ...(day.events || []).map((ev: any) => ({ ...ev, itemType: "event" as const }))
            ].sort((a, b) => a.start_at.localeCompare(b.start_at));

            return (
              <div
                key={day.date}
                style={{
                  background: "var(--panel)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius)",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "280px"
                }}
              >
                <header
                  style={{
                    borderBottom: "1px solid var(--line)",
                    paddingBottom: "8px",
                    marginBottom: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: "pointer",
                      padding: 0,
                      color: "var(--text)"
                    }}
                    onClick={() => {
                      setStartDate(day.date);
                      setMode("day");
                      void loadCalendar("day", day.date);
                    }}
                  >
                    {dayLabel}
                  </button>
                  <button
                    type="button"
                    className="row-action"
                    style={{ padding: "2px 4px", fontSize: "10px" }}
                    onClick={() => openCreateModal("event", `${day.date}T20:00:00+07:00`)}
                  >
                    +
                  </button>
                </header>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto", maxHeight: "180px" }}>
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: item.itemType === "event" ? "rgba(33, 47, 39, 0.03)" : "rgba(245, 158, 11, 0.05)",
                        borderLeft: `3px solid ${item.itemType === "event" ? "var(--accent)" : "rgb(245, 158, 11)"}`,
                        padding: "4px 6px",
                        borderRadius: "2px",
                        fontSize: "11px",
                        cursor: "pointer"
                      }}
                      onClick={() => openEditModal(item, item.itemType)}
                    >
                      <div style={{ fontWeight: 600, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {item.title}
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: "10px" }}>
                        {formatTime(item.start_at)}
                      </div>
                    </div>
                  ))}
                </div>

                {day.free_windows && day.free_windows.length > 0 && (
                  <div
                    style={{
                      marginTop: "8px",
                      borderTop: "1px dashed var(--line)",
                      paddingTop: "8px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px"
                    }}
                  >
                    {day.free_windows.slice(0, 2).map((win: any) => (
                      <div
                        key={win.id}
                        style={{
                          fontSize: "10px",
                          color: "var(--muted)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          Free {formatTime(win.start)}
                        </span>
                        <button
                          type="button"
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--accent)",
                            fontSize: "9px",
                            cursor: "pointer",
                            padding: "0 2px"
                          }}
                          onClick={() => onEditTask({ scheduled_start: win.start } as any)}
                        >
                          +Task
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Calendar Item Creator/Editor Modal */}
      <CalendarItemModal
        isOpen={modalOpen}
        type={modalType}
        item={editingItem}
        tasks={allTasks}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveModalItem}
        onDelete={editingItem && editingItem.id ? handleDeleteModalItem : undefined}
      />
    </section>
  );
}

type CalendarItemModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  item: any | null;
  type: "event" | "time-block";
  tasks: ApiTask[];
};

function CalendarItemModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  item,
  type,
  tasks
}: CalendarItemModalProps) {
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [source, setSource] = useState("manual");
  const [blockType, setBlockType] = useState("task");
  const [status, setStatus] = useState("planned");
  const [taskId, setTaskId] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [conflicts, setConflicts] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setTitle(item.title || "");
        setStartAt(item.start_at ? item.start_at.slice(0, 16) : "");
        if (item.end_at) {
          setEndAt(item.end_at.slice(0, 16));
        } else if (item.start_at) {
          const date = new Date(item.start_at.slice(0, 19));
          date.setHours(date.getHours() + 1);
          const pad = (num: number) => String(num).padStart(2, "0");
          setEndAt(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`);
        } else {
          setEndAt("");
        }
        setLocation(item.location || "");
        setSource(item.source || "manual");
        setBlockType(item.type || "task");
        setStatus(item.status || "planned");
        setTaskId(item.task_id || "");
      } else {
        setTitle("");
        const todayStr = new Date().toISOString().slice(0, 10);
        setStartAt(`${todayStr}T20:00`);
        setEndAt(`${todayStr}T21:00`);
        setLocation("");
        setSource("manual");
        setBlockType("task");
        setStatus("planned");
        setTaskId("");
      }
      setErrorMsg("");
      setConflicts([]);
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setConflicts([]);

    const startIso = `${startAt}:00+07:00`;
    const endIso = `${endAt}:00+07:00`;

    const payload: any = {
      title,
      start_at: startIso,
      end_at: endIso
    };

    if (type === "event") {
      payload.location = location || null;
      payload.source = source;
    } else {
      payload.type = blockType;
      payload.status = status;
      payload.task_id = taskId || null;
    }

    try {
      await onSave(payload);
    } catch (err: any) {
      if (err.validation?.conflicts) {
        setConflicts(err.validation.conflicts);
        setErrorMsg("Lịch trình bị trùng khớp với sự kiện khác.");
      } else {
        setErrorMsg(err.message || "Không thể lưu.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(33, 47, 39, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "16px",
        backdropFilter: "blur(4px)"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          maxWidth: "480px",
          width: "100%",
          maxHeight: "calc(100vh - 40px)",
          overflowY: "auto",
          boxShadow: "0 20px 40px rgba(33, 47, 39, 0.08)",
          display: "flex",
          flexDirection: "column",
          padding: "24px"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CalendarDays size={20} style={{ color: "var(--accent)" }} />
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
              {item && item.id ? `Chỉnh sửa ${type === "event" ? "sự kiện" : "khung giờ"}` : `Thêm ${type === "event" ? "sự kiện mới" : "khung giờ mới"}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--muted)",
              padding: "4px"
            }}
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {errorMsg && (
            <div className="settings-alert-error" style={{ marginBottom: "0px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
              {conflicts.length > 0 && (
                <div style={{ marginTop: "4px", paddingLeft: "22px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {conflicts.map((c, i) => (
                    <small key={i} style={{ display: "block" }}>
                      • {c.title} ({c.start?.slice(11, 16) || c.start_at?.slice(11, 16)} - {c.end?.slice(11, 16) || c.end_at?.slice(11, 16)})
                    </small>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="settings-form-group">
            <label>Tiêu đề</label>
            <input
              type="text"
              className="settings-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder={type === "event" ? "Họp AWS..." : "Khung giờ học bài..."}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="settings-form-group">
              <label>Thời gian bắt đầu</label>
              <input
                type="datetime-local"
                className="settings-input"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </div>
            <div className="settings-form-group">
              <label>Thời gian kết thúc</label>
              <input
                type="datetime-local"
                className="settings-input"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                required
              />
            </div>
          </div>

          {type === "event" ? (
            <>
              <div className="settings-form-group">
                <label>Địa điểm / Link họp</label>
                <input
                  type="text"
                  className="settings-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Google Meet, Văn phòng..."
                />
              </div>
              <div className="settings-form-group">
                <label>Nguồn (Source)</label>
                <input
                  type="text"
                  className="settings-input"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="manual"
                />
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="settings-form-group">
                  <label>Loại (Type)</label>
                  <select
                    className="settings-input"
                    value={blockType}
                    onChange={(e) => setBlockType(e.target.value)}
                  >
                    <option value="task">Task</option>
                    <option value="break">Break</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
                <div className="settings-form-group">
                  <label>Trạng thái (Status)</label>
                  <select
                    className="settings-input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="planned">Planned</option>
                    <option value="locked">Locked</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="settings-form-group">
                <label>Liên kết công việc (Task)</label>
                <select
                  className="settings-input"
                  value={taskId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setTaskId(id);
                    if (!title) {
                      const t = tasks.find((item) => item.id === id);
                      if (t) setTitle(t.title);
                    }
                  }}
                >
                  <option value="">(Không liên kết)</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} (P{t.priority})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <footer
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "12px",
              gap: "12px"
            }}
          >
            {item && item.id && onDelete ? (
              <button
                type="button"
                className="row-action"
                style={{
                  background: "#fdf2f2",
                  color: "#c81e1e",
                  border: "1px solid #fde8e8",
                  padding: "8px 16px",
                  borderRadius: "var(--radius)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer"
                }}
                onClick={() => {
                  if (confirm(`Bạn chắc chắn muốn xóa mục này?`)) {
                    void onDelete(item.id);
                  }
                }}
                disabled={saving}
              >
                <Trash2 size={16} />
                <span>Xóa bỏ</span>
              </button>
            ) : (
              <div />
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={onClose}
                className="row-action"
                style={{
                  background: "var(--panel)",
                  border: "1px solid var(--line)",
                  padding: "8px 16px",
                  borderRadius: "var(--radius)",
                  cursor: "pointer"
                }}
                disabled={saving}
              >
                Đóng
              </button>

              <button
                type="submit"
                className="settings-save-btn"
                style={{ margin: 0, alignSelf: "unset" }}
                disabled={saving}
              >
                {saving ? "Đang lưu..." : "Lưu lại"}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}

function DeadlinesView({
  radar: initialRadar,
  onCommand,
  data
}: {
  radar: DeadlineRadar;
  onCommand: (message: string) => Promise<void>;
  data: AppData;
}) {
  const [radar, setRadar] = useState<DeadlineRadar>(initialRadar);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<any | null>(null);

  const loadDeadlines = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchDeadlineRadarApi();
      setRadar(res);
    } catch (err: any) {
      setError(err.message || "Failed to load deadlines.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRadar(initialRadar);
  }, [initialRadar]);

  const handleOpenCreate = () => {
    setEditingDeadline(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (deadline: any) => {
    setEditingDeadline(deadline);
    setModalOpen(true);
  };

  const handleSave = async (payload: any) => {
    if (editingDeadline) {
      await updateDeadlineApi(editingDeadline.id, payload);
    } else {
      await createDeadlineApi(payload);
    }
    setModalOpen(false);
    void loadDeadlines();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this deadline?")) {
      await deleteDeadlineApi(id);
      setModalOpen(false);
      void loadDeadlines();
    }
  };

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

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginBottom: "16px" }}>
        <button
          type="button"
          className="row-action"
          onClick={() => void onCommand("giải thích các hạn chót của tôi")}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontSize: "13px" }}
        >
          <Sparkles size={14} style={{ color: "var(--accent)" }} />
          <span>Explain radar</span>
        </button>
        <button
          type="button"
          className="row-action"
          onClick={handleOpenCreate}
          style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", fontSize: "13px" }}
        >
          <Plus size={14} />
          <span>Deadline</span>
        </button>
      </div>

      {loading && (
        <div style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "12px" }}>
          Loading deadlines...
        </div>
      )}
      {error && (
        <div className="settings-alert-error" style={{ marginBottom: "12px" }}>
          {error}
        </div>
      )}

      <div className="radar-grid">
        {columns.map(([key, label]) => (
          <section className="radar-column" key={key}>
            <h2>{label}</h2>
            {radar[key] && radar[key].length ? (
              radar[key].map((deadline) => (
                <div
                  className="radar-item"
                  data-severity={key}
                  key={deadline.id}
                  onClick={() => handleOpenEdit(deadline)}
                  style={{
                    cursor: "pointer",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <strong style={{ fontSize: "13px", color: "var(--text)" }}>{deadline.title}</strong>
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: "10px",
                        backgroundColor:
                          deadline.severity === "high" || deadline.severity === "critical"
                            ? "rgba(239, 68, 68, 0.1)"
                            : deadline.severity === "medium"
                            ? "rgba(245, 158, 11, 0.1)"
                            : "rgba(107, 114, 128, 0.1)",
                        color:
                          deadline.severity === "high" || deadline.severity === "critical"
                            ? "rgb(239, 68, 68)"
                            : deadline.severity === "medium"
                            ? "rgb(245, 158, 11)"
                            : "rgb(107, 114, 128)"
                      }}
                    >
                      {deadline.severity}
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    {deadline.due_at.slice(0, 16).replace("T", " ")} · score {deadline.urgency_score}
                  </span>

                  {/* Linked Indicators */}
                  {(deadline.task_title || deadline.project_title || deadline.goal_title) && (
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                      {deadline.task_title && (
                        <span style={{ fontSize: "10px", padding: "1px 4px", borderRadius: "3px", backgroundColor: "rgba(33, 47, 39, 0.05)", color: "var(--accent)" }}>
                          Task: {deadline.task_title}
                        </span>
                      )}
                      {deadline.project_title && (
                        <span style={{ fontSize: "10px", padding: "1px 4px", borderRadius: "3px", backgroundColor: "rgba(59, 130, 246, 0.05)", color: "#3b82f6" }}>
                          Proj: {deadline.project_title}
                        </span>
                      )}
                      {deadline.goal_title && (
                        <span style={{ fontSize: "10px", padding: "1px 4px", borderRadius: "3px", backgroundColor: "rgba(139, 92, 246, 0.05)", color: "#8b5cf6" }}>
                          Goal: {deadline.goal_title}
                        </span>
                      )}
                    </div>
                  )}
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

      <DeadlineEditorModal
        isOpen={modalOpen}
        deadline={editingDeadline}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={editingDeadline ? handleDelete : undefined}
        data={data}
      />
    </section>
  );
}

type DeadlineEditorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  deadline: any | null;
  data: AppData;
};

function DeadlineEditorModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  deadline,
  data
}: DeadlineEditorModalProps) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [status, setStatus] = useState("active");
  const [goalId, setGoalId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const allGoals = data.goals || [];
  const allProjects = data.goals ? data.goals.flatMap((g: any) => g.projects || []) : [];
  const allTasks = data.tasks
    ? [...(data.tasks.open || []), ...(data.tasks.inbox || []), ...(data.tasks.today || [])]
    : [];

  useEffect(() => {
    if (isOpen) {
      if (deadline) {
        setTitle(deadline.title || "");
        setDueAt(deadline.due_at ? deadline.due_at.slice(0, 16) : "");
        setSeverity(deadline.severity || "medium");
        setStatus(deadline.status || "active");
        setGoalId(deadline.goal_id || "");
        setProjectId(deadline.project_id || "");
        setTaskId(deadline.task_id || "");
      } else {
        setTitle("");
        const todayStr = new Date().toISOString().slice(0, 16);
        setDueAt(todayStr);
        setSeverity("medium");
        setStatus("active");
        setGoalId("");
        setProjectId("");
        setTaskId("");
      }
      setErrorMsg("");
    }
  }, [isOpen, deadline]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    const dueIso = `${dueAt}:00+07:00`;
    const payload = {
      title,
      due_at: dueIso,
      severity,
      status,
      goal_id: goalId || null,
      project_id: projectId || null,
      task_id: taskId || null
    };

    try {
      await onSave(payload);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save deadline.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(33, 47, 39, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "16px",
        backdropFilter: "blur(4px)"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          maxWidth: "480px",
          width: "100%",
          maxHeight: "calc(100vh - 40px)",
          overflowY: "auto",
          boxShadow: "0 20px 40px rgba(33, 47, 39, 0.08)",
          display: "flex",
          flexDirection: "column",
          padding: "24px"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
            <Radar size={20} style={{ color: "var(--accent)" }} />
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
              {deadline ? "Chỉnh sửa deadline" : "Thêm deadline mới"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "4px" }}
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {errorMsg && (
            <div className="settings-alert-error" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="settings-label" htmlFor="dl-title">Tiêu đề</label>
            <input
              id="dl-title"
              type="text"
              className="settings-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="settings-label" htmlFor="dl-due">Thời hạn (due_at)</label>
            <input
              id="dl-due"
              type="datetime-local"
              className="settings-input"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label className="settings-label" htmlFor="dl-severity">Mức độ nghiêm trọng</label>
              <select
                id="dl-severity"
                className="settings-input"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="settings-label" htmlFor="dl-status">Trạng thái</label>
              <select
                id="dl-status"
                className="settings-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="settings-label" htmlFor="dl-goal">Liên kết Mục tiêu (Goal)</label>
            <select
              id="dl-goal"
              className="settings-input"
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
            >
              <option value="">-- Không liên kết --</option>
              {allGoals.map((g: any) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="settings-label" htmlFor="dl-project">Liên kết Dự án (Project)</label>
            <select
              id="dl-project"
              className="settings-input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">-- Không liên kết --</option>
              {allProjects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="settings-label" htmlFor="dl-task">Liên kết Công việc (Task)</label>
            <select
              id="dl-task"
              className="settings-input"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
            >
              <option value="">-- Không liên kết --</option>
              {allTasks.map((t: any) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          <footer
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "12px",
              borderTop: "1px solid var(--line)",
              paddingTop: "16px"
            }}
          >
            {onDelete && deadline ? (
              <button
                type="button"
                className="row-action"
                style={{ color: "#c81e1e", display: "flex", alignItems: "center", gap: "4px" }}
                onClick={() => void onDelete(deadline.id)}
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="row-action"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="row-action"
                style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}

function GoalsView({
  data,
  onReloadData,
  onCommand
}: {
  data: AppData;
  onReloadData: () => Promise<void>;
  onCommand: (message: string) => Promise<void>;
}) {
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any | null>(null);
  const [editingProject, setEditingProject] = useState<any | null>(null);

  const openGoalEditor = (goal: any | null) => {
    setEditingGoal(goal);
    setIsGoalModalOpen(true);
  };

  const openProjectEditor = (project: any | null) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleSaveGoal = async (payload: any) => {
    if (editingGoal) {
      await updateGoalApi(editingGoal.id, payload);
    } else {
      await createGoalApi(payload);
    }
    await onReloadData();
  };

  const handleDeleteGoal = async (id: string) => {
    await deleteGoalApi(id);
    await onReloadData();
  };

  const handleSaveProject = async (payload: any) => {
    if (editingProject) {
      await updateProjectApi(editingProject.id, payload);
    } else {
      await createProjectApi(payload);
    }
    await onReloadData();
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProjectApi(id);
    await onReloadData();
  };

  const handleAiBreakdown = async (type: "goal" | "project", title: string) => {
    await onCommand(`breakdown ${type} "${title}"`);
  };

  return (
    <section className="os-view" aria-label="Goals">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <ViewHeader
          icon={<Target aria-hidden="true" size={20} />}
          kicker="Goals & Projects"
          title="Goal to project to task"
          body="HelpMe connects daily work back to larger outcomes. Use AI to break them down."
        />
        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <button
            type="button"
            onClick={() => openGoalEditor(null)}
            className="row-action"
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              padding: "8px 16px",
              borderRadius: "var(--radius)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              fontWeight: 500
            }}
          >
            <Plus size={16} />
            <span>Thêm mục tiêu</span>
          </button>
          {data.goals.length > 0 && (
            <button
              type="button"
              onClick={() => openProjectEditor(null)}
              className="row-action"
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                padding: "8px 16px",
                borderRadius: "var(--radius)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                fontWeight: 500
              }}
            >
              <Plus size={16} />
              <span>Thêm dự án</span>
            </button>
          )}
        </div>
      </div>

      <div className="goal-stack" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {data.goals.length === 0 ? (
          <EmptyState title="Chưa có mục tiêu nào" message="Hãy thêm mục tiêu đầu tiên của bạn để liên kết công việc." />
        ) : (
          data.goals.map((goal) => (
            <section
              className="goal-row"
              key={goal.id}
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                position: "relative"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, paddingRight: "120px" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontWeight: 700,
                      color: goal.is_north_star ? "var(--accent)" : "var(--muted)",
                      background: goal.is_north_star ? "rgba(33, 150, 83, 0.08)" : "rgba(107, 114, 128, 0.05)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      display: "inline-block",
                      marginBottom: "6px"
                    }}
                  >
                    {goal.is_north_star ? "Sao Bắc Đẩu (North Star)" : "Mục tiêu"}
                  </span>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--ink)" }}>{goal.title}</h2>
                  {goal.description && (
                    <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--muted)" }}>{goal.description}</p>
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => handleAiBreakdown("goal", goal.title)}
                    className="inline-action"
                    style={{
                      background: "rgba(33, 150, 83, 0.08)",
                      color: "var(--accent)",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "var(--radius)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "12px",
                      fontWeight: 600
                    }}
                    title="Yêu cầu AI phân rã mục tiêu này thành các công việc"
                  >
                    <Sparkles size={14} />
                    <span>AI Breakdown</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openGoalEditor(goal)}
                    className="inline-action"
                    style={{
                      background: "none",
                      border: "1px solid var(--line)",
                      padding: "6px 12px",
                      borderRadius: "var(--radius)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "12px",
                      color: "var(--muted)"
                    }}
                  >
                    <Edit3 size={14} />
                    <span>Sửa</span>
                  </button>
                </div>
              </div>

              {/* Progress track */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: 1, height: "6px", background: "var(--line)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ width: `${goal.progress}%`, height: "100%", background: "var(--accent)", borderRadius: "3px" }} />
                </div>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent)", minWidth: "32px", textAlign: "right" }}>
                  {goal.progress}%
                </span>
              </div>

              {/* Projects inside Goal */}
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: "14px" }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: 600, color: "var(--muted)" }}>Dự án liên kết</h3>
                {goal.projects.length === 0 ? (
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", fontStyle: "italic" }}>
                    Chưa có dự án nào thuộc mục tiêu này.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {goal.projects.map((project: any) => (
                      <div
                        key={project.id}
                        style={{
                          background: "var(--bg)",
                          border: "1px solid var(--line)",
                          borderRadius: "var(--radius)",
                          padding: "10px 14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "12px"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Folder size={16} style={{ color: "var(--accent)", opacity: 0.8 }} />
                          <div>
                            <strong style={{ fontSize: "14px", color: "var(--ink)" }}>{project.title}</strong>
                            {project.description && (
                              <span style={{ fontSize: "12px", color: "var(--muted)", marginLeft: "8px" }}>
                                - {project.description}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                            {project.tasks?.length || 0} công việc
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAiBreakdown("project", project.title)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--accent)",
                              padding: "4px"
                            }}
                            title="AI Breakdown dự án này"
                          >
                            <Sparkles size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openProjectEditor(project)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--muted)",
                              padding: "4px"
                            }}
                            title="Sửa dự án"
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ))
        )}
      </div>

      <GoalEditorModal
        goal={editingGoal}
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSave={handleSaveGoal}
        onDelete={editingGoal ? handleDeleteGoal : undefined}
      />

      <ProjectEditorModal
        project={editingProject}
        goals={data.goals.map((g: any) => ({ id: g.id, title: g.title }))}
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleSaveProject}
        onDelete={editingProject ? handleDeleteProject : undefined}
      />
    </section>
  );
}

function HabitsView({
  data,
  onLogHabit,
  onReloadData
}: {
  data: AppData;
  onLogHabit: (habitId: string) => Promise<void>;
  onReloadData: () => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<"list" | "review">("list");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<any | null>(null);

  const [insight, setInsight] = useState<string>("");
  const [loadingInsight, setLoadingInsight] = useState(false);

  const loadInsight = async () => {
    setLoadingInsight(true);
    try {
      const text = await fetchHabitInsightApi();
      setInsight(text);
    } catch (err) {
      console.error(err);
      setInsight("Không thể kết nối với AI để tải phân tích thói quen.");
    } finally {
      setLoadingInsight(false);
    }
  };

  useEffect(() => {
    if (activeTab === "review" && !insight) {
      void loadInsight();
    }
  }, [activeTab]);

  const openEditor = (habit: any | null) => {
    setEditingHabit(habit);
    setIsEditorOpen(true);
  };

  const handleSaveHabit = async (habitData: any) => {
    try {
      if (editingHabit) {
        await updateHabitApi(editingHabit.id, habitData);
      } else {
        await createHabitApi(habitData);
      }
      await onReloadData();
    } catch (err: any) {
      alert(err.message || "Lỗi khi lưu thói quen");
      throw err;
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    try {
      await deleteHabitApi(habitId);
      await onReloadData();
    } catch (err: any) {
      alert(err.message || "Lỗi khi xóa thói quen");
      throw err;
    }
  };

  const activeHabits = data.habits.filter((h) => h.status === "active");
  const pausedHabits = data.habits.filter((h) => h.status === "paused");
  const daysLabel = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  return (
    <section className="os-view" aria-label="Habits">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <ViewHeader
          icon={<Activity aria-hidden="true" size={20} />}
          kicker="Habits"
          title="Routine health"
          body="Habits stay lightweight: check the signal, then schedule a smaller block if needed."
        />
        <button
          type="button"
          onClick={() => openEditor(null)}
          className="row-action"
          style={{
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            borderRadius: "var(--radius)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
            fontWeight: 500,
            marginTop: "16px"
          }}
        >
          <Plus size={16} />
          <span>Thêm thói quen</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "24px", marginBottom: "20px", borderBottom: "1px solid var(--line)", paddingBottom: "4px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          style={{
            background: "none",
            border: "none",
            fontWeight: activeTab === "list" ? 600 : 400,
            color: activeTab === "list" ? "var(--accent)" : "var(--muted)",
            borderBottom: activeTab === "list" ? "2px solid var(--accent)" : "none",
            padding: "8px 4px",
            cursor: "pointer",
            fontSize: "14px"
          }}
        >
          Thói quen hiện tại
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("review")}
          style={{
            background: "none",
            border: "none",
            fontWeight: activeTab === "review" ? 600 : 400,
            color: activeTab === "review" ? "var(--accent)" : "var(--muted)",
            borderBottom: activeTab === "review" ? "2px solid var(--accent)" : "none",
            padding: "8px 4px",
            cursor: "pointer",
            fontSize: "14px"
          }}
        >
          Đánh giá tuần & AI Insight
        </button>
      </div>

      {activeTab === "list" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px", color: "var(--muted)" }}>Đang hoạt động</h2>
            {activeHabits.length === 0 ? (
              <EmptyState title="Không có thói quen hoạt động" message="Nhấp vào nút Thêm thói quen phía trên để bắt đầu." />
            ) : (
              <div className="habit-grid">
                {activeHabits.map((habit) => (
                  <section className="habit-item" key={habit.id} style={{ position: "relative" }}>
                    <div style={{ paddingRight: "28px" }}>
                      <strong>{habit.title}</strong>
                      <span>{habit.frequency === "daily" ? "Mỗi ngày" : "Mỗi tuần"} · chuỗi {habit.streak} ngày</span>
                    </div>
                    <b>{habit.completion_rate}%</b>
                    <p>{habit.insight || "Hãy duy trì thói quen này mỗi ngày."}</p>
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                      <button className="inline-action" type="button" onClick={() => void onLogHabit(habit.id)} style={{ flex: 1 }}>
                        <CheckCircle2 aria-hidden="true" size={15} />
                        <span>Check today</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditor(habit)}
                      style={{
                        position: "absolute",
                        top: "16px",
                        right: "16px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--muted)",
                        padding: "4px"
                      }}
                      title="Sửa thói quen"
                    >
                      <Edit3 size={16} />
                    </button>
                  </section>
                ))}
              </div>
            )}
          </div>

          {pausedHabits.length > 0 && (
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px", color: "var(--muted)" }}>Tạm dừng</h2>
              <div className="habit-grid" style={{ opacity: 0.6 }}>
                {pausedHabits.map((habit) => (
                  <section className="habit-item" key={habit.id} style={{ position: "relative" }}>
                    <div style={{ paddingRight: "28px" }}>
                      <strong>{habit.title}</strong>
                      <span>{habit.frequency === "daily" ? "Mỗi ngày" : "Mỗi tuần"} · Tạm dừng</span>
                    </div>
                    <b>{habit.completion_rate}%</b>
                    <p>Thói quen đang được tạm dừng.</p>
                    <button
                      type="button"
                      onClick={() => openEditor(habit)}
                      style={{
                        position: "absolute",
                        top: "16px",
                        right: "16px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--muted)",
                        padding: "4px"
                      }}
                      title="Sửa thói quen"
                    >
                      <Edit3 size={16} />
                    </button>
                  </section>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* AI Insight Box */}
          <div
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              padding: "20px",
              position: "relative"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <Sparkles size={18} style={{ color: "var(--accent)" }} />
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--accent)" }}>AI Habit Insight</h3>
            </div>
            {loadingInsight ? (
              <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", fontStyle: "italic" }}>AI đang phân tích thói quen của bạn...</p>
            ) : (
              <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.6 }}>{insight || "Chưa có phân tích thói quen nào."}</p>
            )}
            <button
              type="button"
              onClick={loadInsight}
              disabled={loadingInsight}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px"
              }}
              title="Cập nhật insight"
            >
              <RotateCcw size={14} className={loadingInsight ? "spin" : ""} />
              <span>{loadingInsight ? "Đang chạy..." : "Cập nhật"}</span>
            </button>
          </div>

          {/* Weekly Completion Grid */}
          <div>
            <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "16px", color: "var(--muted)" }}>Lịch sử hoàn thành tuần này (Thứ 2 - Chủ Nhật)</h2>
            {data.habits.length === 0 ? (
              <EmptyState title="Không có thói quen nào" message="Hãy thêm thói quen mới để theo dõi." />
            ) : (
              <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                {data.habits.map((habit) => (
                  <div
                    key={habit.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 20px",
                      borderBottom: "1px solid var(--line)"
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: "16px" }}>
                      <strong style={{ display: "block", fontSize: "14px", color: habit.status === "paused" ? "var(--muted)" : "inherit" }}>
                        {habit.title} {habit.status === "paused" && <span style={{ fontSize: "12px", fontStyle: "italic", fontWeight: 400 }}>(Tạm dừng)</span>}
                      </strong>
                      <span style={{ fontSize: "12px", color: "var(--muted)" }}>Chuỗi liên tiếp: {habit.streak} ngày</span>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      {daysLabel.map((day, idx) => {
                        const completed = habit.weekly_history?.[idx] ?? false;
                        return (
                          <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600 }}>{day}</span>
                            <div
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "50%",
                                border: "1.5px solid var(--line)",
                                backgroundColor: completed ? "rgba(33, 150, 83, 0.12)" : "transparent",
                                borderColor: completed ? "var(--accent)" : "var(--line)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: completed ? "var(--accent)" : "transparent"
                              }}
                            >
                              {completed && <CheckCircle2 size={15} style={{ color: "var(--accent)" }} />}
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ width: "60px", textAlign: "right", marginLeft: "12px", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                        <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600 }}>Tỷ lệ</span>
                        <strong style={{ fontSize: "14px", color: "var(--accent)" }}>{habit.completion_rate}%</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor Modal */}
      <HabitEditorModal
        habit={editingHabit}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveHabit}
        onDelete={handleDeleteHabit}
      />
    </section>
  );
}

function ReviewView({
  data,
  onCommand,
  onCompleteTask,
  onReopenTask,
  onEditTask,
  onReloadData
}: {
  data: AppData;
  onCommand: (message: string) => Promise<void>;
  onCompleteTask: (taskId: string) => Promise<void>;
  onReopenTask: (taskId: string) => Promise<void>;
  onEditTask: (task: ApiTask | null) => void;
  onReloadData: () => Promise<void>;
}) {
  const [energyLevel, setEnergyLevel] = useState("medium");
  const [summary, setSummary] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await fetchReviewHistoryApi();
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSaveReview = async (e: FormEvent) => {
    e.preventDefault();
    setSavingReview(true);
    setSuccessMsg("");
    setErrorMsg("");

    const completedCount = data.review.completed.length;
    const unfinishedCount = data.review.unfinished.length;

    try {
      await saveReviewApi({
        energy_level: energyLevel,
        summary: summary,
        tasks_completed: completedCount,
        tasks_total: completedCount + unfinishedCount
      });
      setSuccessMsg("Đã lưu đánh giá ngày hôm nay thành công!");
      setSummary("");
      await loadHistory();
      await onReloadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể lưu đánh giá.");
    } finally {
      setSavingReview(false);
    }
  };

  return (
    <section className="os-view" aria-label="Review">
      <ViewHeader
        icon={<CheckCircle2 aria-hidden="true" size={20} />}
        kicker="Review & Evening Reflection"
        title={data.review.prompt || "Evening reflection"}
        body={data.review.summary || "Đánh giá ngày làm việc của bạn và chuẩn bị cho ngày mai."}
        actionLabel="AI Review Suggestion"
        onAction={() => onCommand("Evening review")}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px", marginTop: "20px" }}>
        {/* Cột trái: Công việc trong ngày */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <section
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              padding: "20px"
            }}
          >
            <h2 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 600, color: "var(--ink)" }}>Chưa hoàn thành</h2>
            <TaskList
              tasks={data.review.unfinished}
              empty="Không có công việc chưa hoàn thành trong kế hoạch hôm nay."
              onCompleteTask={onCompleteTask}
              onEditTask={onEditTask}
            />
          </section>

          <section
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              padding: "20px"
            }}
          >
            <h2 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 600, color: "var(--ink)" }}>Đề xuất sắp xếp lại (AI Reschedule)</h2>
            <div className="compact-list" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {data.review.reschedule_suggestion.map((item) => (
                <div
                  key={item.task_id}
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius)",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px"
                  }}
                >
                  <strong style={{ fontSize: "14px", color: "var(--ink)" }}>{item.title}</strong>
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                    Gợi ý: {formatDateLabel(item.suggested_start)} {formatTime(item.suggested_start)} - {formatTime(item.suggested_end)} ({item.duration_minutes} phút)
                  </span>
                  {item.reason && (
                    <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--accent)", fontStyle: "italic" }}>
                      Lý do: {item.reason}
                    </p>
                  )}
                </div>
              ))}
              {!data.review.reschedule_suggestion.length && (
                <div style={{ color: "var(--muted)", fontSize: "13px", padding: "12px 4px", fontStyle: "italic" }}>
                  Không có đề xuất sắp xếp lại lịch trình.
                </div>
              )}
            </div>
          </section>

          <section
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              padding: "20px"
            }}
          >
            <h2 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 600, color: "var(--ink)" }}>Đã hoàn thành hôm nay</h2>
            <TaskList
              tasks={data.review.completed}
              empty="Chưa có công việc nào được hoàn thành hôm nay."
              onReopenTask={onReopenTask}
              onEditTask={onEditTask}
            />
          </section>
        </div>

        {/* Cột phải: Form lưu review & Lịch sử */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Form đánh giá ngày */}
          <section
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              padding: "20px"
            }}
          >
            <h2 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 600, color: "var(--ink)" }}>
              Viết đánh giá ngày
            </h2>
            <form onSubmit={handleSaveReview} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {successMsg && (
                <div className="settings-alert-success" style={{ margin: 0, padding: "8px 12px", fontSize: "13px" }}>
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="settings-alert-error" style={{ margin: 0, padding: "8px 12px", fontSize: "13px" }}>
                  {errorMsg}
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "var(--muted)" }}>
                  Mức năng lượng hôm nay
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  {[
                    { val: "high", label: "High ⚡" },
                    { val: "medium", label: "Medium 😊" },
                    { val: "low", label: "Low 😴" }
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setEnergyLevel(item.val)}
                      style={{
                        padding: "8px",
                        borderRadius: "var(--radius)",
                        border: "1px solid",
                        borderColor: energyLevel === item.val ? "var(--accent)" : "var(--line)",
                        background: energyLevel === item.val ? "rgba(33, 150, 83, 0.08)" : "var(--bg)",
                        color: energyLevel === item.val ? "var(--accent)" : "var(--ink)",
                        fontWeight: energyLevel === item.val ? 600 : 400,
                        cursor: "pointer",
                        fontSize: "13px",
                        transition: "all 0.2s"
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="rev-summary" style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "var(--muted)" }}>
                  Bài học / Nhận xét ngày hôm nay
                </label>
                <textarea
                  id="rev-summary"
                  placeholder="Ghi nhận xét ngắn gọn, những gì bạn đã học được hoặc cảm nghĩ..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    minHeight: "100px",
                    padding: "10px",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--line)",
                    background: "var(--bg)",
                    color: "var(--ink)",
                    fontSize: "13px",
                    resize: "vertical",
                    outline: "none"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "var(--muted)" }}>
                <span>Đã xong: {data.review.completed.length}/{data.review.completed.length + data.review.unfinished.length} tasks</span>
                <button
                  type="submit"
                  disabled={savingReview}
                  style={{
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "var(--radius)",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "13px"
                  }}
                >
                  {savingReview ? "Đang lưu..." : "Lưu đánh giá"}
                </button>
              </div>
            </form>
          </section>

          {/* Lịch sử reviews */}
          <section
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              padding: "20px"
            }}
          >
            <h2 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 600, color: "var(--ink)" }}>Lịch sử đánh giá</h2>
            {loadingHistory ? (
              <p style={{ fontSize: "13px", color: "var(--muted)", fontStyle: "italic" }}>Đang tải lịch sử...</p>
            ) : history.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--muted)", fontStyle: "italic" }}>Chưa có đánh giá nào được lưu.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "360px", overflowY: "auto", paddingRight: "4px" }}>
                {history.map((h) => {
                  const energyColors: Record<string, string> = {
                    high: "rgba(33, 150, 83, 0.12)",
                    medium: "rgba(59, 130, 246, 0.12)",
                    low: "rgba(245, 158, 11, 0.12)"
                  };
                  const energyTextColors: Record<string, string> = {
                    high: "var(--accent)",
                    medium: "#3b82f6",
                    low: "#f59e0b"
                  };
                  return (
                    <div
                      key={h.id}
                      style={{
                        background: "var(--bg)",
                        border: "1px solid var(--line)",
                        borderRadius: "var(--radius)",
                        padding: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
                          {h.review_date}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: 700,
                            backgroundColor: energyColors[h.energy_value] || "var(--line)",
                            color: energyTextColors[h.energy_value] || "var(--muted)",
                            textTransform: "uppercase"
                          }}
                        >
                          {h.energy_value}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: "13px", color: "var(--ink)", lineHeight: 1.4 }}>
                        {h.summary}
                      </p>
                      {h.reflection && (
                        <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--muted)", fontStyle: "italic", background: "rgba(33, 47, 39, 0.02)", padding: "6px", borderRadius: "4px" }}>
                          AI Reflection: {h.reflection}
                        </p>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--muted)", borderTop: "1px solid var(--line)", paddingTop: "6px", marginTop: "4px" }}>
                        <span>Hoàn thành: {h.completed_count}/{h.unfinished_count} tasks</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
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

        <div className="settings-section-card">
          <h3>Sao lưu & Phục hồi</h3>
          <p className="settings-note" style={{ marginBottom: "14px", fontSize: "13px" }}>
            Tải xuống bản sao lưu của cơ sở dữ liệu SQLite cục bộ bất cứ lúc nào để lưu trữ an toàn hoặc chuyển đổi thiết bị.
          </p>
          <a
            href="/api/system/backup"
            download="helpme.sqlite"
            className="row-action"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--panel)",
              border: "1px solid var(--line)",
              padding: "10px 16px",
              borderRadius: "var(--radius)",
              cursor: "pointer",
              fontWeight: 600,
              textDecoration: "none",
              color: "var(--ink)"
            }}
          >
            <span>Tải xuống bản sao lưu (SQLite Backup)</span>
          </a>
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
