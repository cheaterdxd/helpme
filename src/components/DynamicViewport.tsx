import { useState } from "react";
import {
  Target,
  Folder,
  CheckCircle,
  Circle,
  Play,
  Activity,
  Radar,
  Clock,
  Sparkles,
  Edit3,
  Trash2,
  Plus,
  CalendarDays,
  Settings,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Calendar,
  User
} from "lucide-react";
import type { AppData, ApiTask, FocusSession, ApiReminder } from "../types";
import {
  completeTask,
  reopenTask,
  logHabitToday,
  deleteTaskApi,
  deleteGoalApi,
  deleteProjectApi,
  deleteHabitApi,
  deleteDeadlineApi,
  createGoalApi,
  createProjectApi,
  createHabitApi,
  createDeadlineApi,
  createTaskApi,
  updateGoalApi,
  updateProjectApi,
  updateHabitApi,
  updateDeadlineApi,
  updateTaskApi,
  completeReminderApi,
  snoozeReminderApi
} from "../api";
import { GoalEditorModal } from "./GoalEditorModal";
import { ProjectEditorModal } from "./ProjectEditorModal";
import { HabitEditorModal } from "./HabitEditorModal";
import { DeadlineEditorModal } from "./DeadlineEditorModal";

type DynamicViewportProps = {
  intent: string | null;
  data: any;
  appData: AppData;
  onReloadData: () => Promise<void>;
  onCommand: (cmd: string) => void;
  onEditTask: (task: ApiTask | null) => void;
};

export function DynamicViewport({
  intent,
  data,
  appData,
  onReloadData,
  onCommand,
  onEditTask
}: DynamicViewportProps) {
  // Modal Edit States
  const [editingGoal, setEditingGoal] = useState<any | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const [editingHabit, setEditingHabit] = useState<any | null>(null);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);

  const [editingDeadline, setEditingDeadline] = useState<any | null>(null);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);

  // Helper values
  const goalsList = appData.goals || [];

  // Determine what to display based on intent
  const activeIntent = intent || "today";

  // 1. Handlers
  const handleTaskToggle = async (task: ApiTask) => {
    if (task.status === "done") {
      await reopenTask(task.id);
    } else {
      await completeTask(task.id);
    }
    await onReloadData();
  };

  const handleTaskDelete = async (taskId: string) => {
    if (confirm("Bạn chắc chắn muốn xóa công việc này?")) {
      await deleteTaskApi(taskId);
      await onReloadData();
    }
  };

  const handleHabitLog = async (habitId: string) => {
    await logHabitToday(habitId);
    await onReloadData();
  };

  const handleHabitDelete = async (habitId: string) => {
    if (confirm("Bạn chắc chắn muốn xóa thói quen này?")) {
      await deleteHabitApi(habitId);
      await onReloadData();
    }
  };

  const handleGoalDelete = async (goalId: string) => {
    await deleteGoalApi(goalId);
    await onReloadData();
  };

  const handleProjectDelete = async (projectId: string) => {
    await deleteProjectApi(projectId);
    await onReloadData();
  };

  const handleDeadlineDelete = async (deadlineId: string) => {
    if (confirm("Bạn chắc chắn muốn xóa deadline này?")) {
      await deleteDeadlineApi(deadlineId);
      await onReloadData();
    }
  };

  // Rendering screens dynamically
  if (activeIntent === "list_goals" || activeIntent === "create_goal" || activeIntent === "breakdown_goal") {
    const isAiFiltered = activeIntent === "list_goals" && Array.isArray(data);
    const goalsToRender = isAiFiltered ? data : goalsList;

    return (
      <div className="cli-viewport-feed">
        <div className="cli-feed-header">
          <div className="cli-feed-title">
            <Target size={18} />
            <span>Mục tiêu chiến lược ({goalsToRender.length})</span>
          </div>
          <button className="row-action primary" onClick={() => { setEditingGoal(null); setIsGoalModalOpen(true); }}>
            <Plus size={14} /> New Goal
          </button>
        </div>

        {goalsToRender.length === 0 ? (
          <div className="cli-empty-state">Bạn chưa có mục tiêu nào được thiết lập. Hãy gõ "tạo mục tiêu ..." để bắt đầu.</div>
        ) : (
          <div className="cli-grid-layout">
            {goalsToRender.map((g: any) => (
              <div className={`viewport-card goal-card ${isAiFiltered ? "ai-filtered" : ""}`} key={g.id}>
                <div className="card-header">
                  <h3 className="card-title">
                    {g.is_north_star === 1 || g.isNorthStar ? "🌟 " : ""}
                    {g.title}
                  </h3>
                  <span className={`card-badge status-${g.status}`}>{g.status}</span>
                </div>
                {g.description && <p className="card-description">{g.description}</p>}
                
                <div className="goal-progress-wrap">
                  <div className="progress-label">Tiến độ: {g.progress}%</div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${g.progress}%` }} />
                  </div>
                </div>

                {g.projects && g.projects.length > 0 && (
                  <div className="card-links-section">
                    <div className="links-title">Dự án liên kết:</div>
                    <div className="links-tags">
                      {g.projects.map((p: any) => (
                        <span className="link-tag" key={p.id}>📁 {p.title}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="card-actions">
                  <button className="row-action" onClick={() => { setEditingGoal(g); setIsGoalModalOpen(true); }}>
                    <Edit3 size={12} /> Sửa
                  </button>
                  <button className="row-action" onClick={() => { setEditingProject({ goal_id: g.id }); setIsProjectModalOpen(true); }}>
                    <Plus size={12} /> + Dự án
                  </button>
                  <button className="row-action danger" onClick={() => handleGoalDelete(g.id)}>
                    <Trash2 size={12} /> Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <GoalEditorModal
          goal={editingGoal}
          isOpen={isGoalModalOpen}
          onClose={() => setIsGoalModalOpen(false)}
          onSave={async (payload) => {
            if (editingGoal) {
              await updateGoalApi(editingGoal.id, payload);
            } else {
              await createGoalApi(payload);
            }
            await onReloadData();
          }}
          onDelete={editingGoal ? handleGoalDelete : undefined}
        />
        <ProjectEditorModal
          project={editingProject}
          goals={goalsList}
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
          onSave={async (payload) => {
            if (editingProject?.id) {
              await updateProjectApi(editingProject.id, payload);
            } else {
              await createProjectApi(payload);
            }
            await onReloadData();
          }}
          onDelete={editingProject?.id ? handleProjectDelete : undefined}
        />
      </div>
    );
  }

  if (activeIntent === "list_projects" || activeIntent === "create_project") {
    const allProjects = goalsList.flatMap(g => (g.projects || []).map(p => ({ ...p, goalTitle: g.title })));
    let projectsToRender = allProjects;
    const isAiFiltered = activeIntent === "list_projects" && Array.isArray(data);
    if (isAiFiltered) {
      if (data.length > 0 && "projects" in data[0]) {
        projectsToRender = data.flatMap((g: any) => (g.projects || []).map((p: any) => ({ ...p, goalTitle: g.title })));
      } else {
        projectsToRender = data;
      }
    }

    return (
      <div className="cli-viewport-feed">
        <div className="cli-feed-header">
          <div className="cli-feed-title">
            <Folder size={18} />
            <span>Dự án con liên kết ({projectsToRender.length})</span>
          </div>
          <button className="row-action primary" onClick={() => { setEditingProject(null); setIsProjectModalOpen(true); }}>
            <Plus size={14} /> New Project
          </button>
        </div>

        {projectsToRender.length === 0 ? (
          <div className="cli-empty-state">Không có dự án nào phù hợp.</div>
        ) : (
          <div className="cli-grid-layout">
            {projectsToRender.map((p: any) => {
              const openTasks = p.tasks ? p.tasks.filter((t: any) => t.status !== "done").length : 0;
              const completedTasks = p.tasks ? p.tasks.filter((t: any) => t.status === "done").length : 0;
              
              return (
                <div className={`viewport-card project-card ${isAiFiltered ? "ai-filtered" : ""}`} key={p.id}>
                  <div className="card-header">
                    <h3 className="card-title">📁 {p.title}</h3>
                    <span className={`card-badge status-${p.status}`}>{p.status}</span>
                  </div>
                  {p.goalTitle && <div className="card-subtitle">Mục tiêu: 🎯 {p.goalTitle}</div>}
                  <div className="project-stats">
                    <span>Công việc: {openTasks} đang làm / {completedTasks} hoàn thành</span>
                  </div>

                  <div className="card-actions">
                    <button className="row-action" onClick={() => { setEditingProject(p); setIsProjectModalOpen(true); }}>
                      <Edit3 size={12} /> Sửa
                    </button>
                    <button className="row-action" onClick={() => onEditTask({ project_id: p.id, goal_id: p.goal_id } as any)}>
                      <Plus size={12} /> + Task
                    </button>
                    <button className="row-action danger" onClick={() => handleProjectDelete(p.id)}>
                      <Trash2 size={12} /> Xóa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <ProjectEditorModal
          project={editingProject}
          goals={goalsList}
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
          onSave={async (payload) => {
            if (editingProject?.id) {
              await updateProjectApi(editingProject.id, payload);
            } else {
              await createProjectApi(payload);
            }
            await onReloadData();
          }}
          onDelete={editingProject?.id ? handleProjectDelete : undefined}
        />
      </div>
    );
  }

  if (activeIntent === "list_tasks" || activeIntent === "create_task" || activeIntent === "reschedule_task" || activeIntent === "breakdown_task") {
    const allTasks = [...(appData.tasks.inbox || []), ...(appData.tasks.today || []), ...(appData.tasks.open || [])];
    const isAiFiltered = (activeIntent === "list_tasks" || activeIntent === "breakdown_task") && Array.isArray(data);
    const tasksToRender = isAiFiltered ? data : allTasks;

    return (
      <div className="cli-viewport-feed">
        <div className="cli-feed-header">
          <div className="cli-feed-title">
            <CheckCircle size={18} />
            <span>Công việc & Nhiệm vụ ({tasksToRender.length})</span>
          </div>
          <button className="row-action primary" onClick={() => onEditTask(null)}>
            <Plus size={14} /> New Task
          </button>
        </div>

        {tasksToRender.length === 0 ? (
          <div className="cli-empty-state">Không có công việc nào. Hãy gõ câu lệnh để tạo công việc mới.</div>
        ) : (
          <div className="cli-list-layout">
            {tasksToRender.map((t: ApiTask) => (
              <div className={`viewport-row-item task-row ${isAiFiltered ? "ai-filtered" : ""}`} key={t.id} data-done={t.status === "done"}>
                <button className="check-btn" onClick={() => handleTaskToggle(t)} aria-label="Toggle Complete">
                  {t.status === "done" ? <CheckCircle2 size={18} className="icon-done" /> : <Circle size={18} />}
                </button>
                
                <div className="row-content">
                  <div className="row-title">{t.title}</div>
                  <div className="row-metadata">
                    {t.goal_title && <span className="meta-tag">🎯 {t.goal_title}</span>}
                    {t.project_title && <span className="meta-tag">📁 {t.project_title}</span>}
                    {t.priority && <span className="meta-tag priority">🔥 U.Tiên: {t.priority}</span>}
                    {t.scheduled_start && <span className="meta-tag time">📅 {t.scheduled_start.replace("T", " ").slice(0, 16)}</span>}
                  </div>
                </div>

                <div className="row-actions">
                  {t.status !== "done" && (
                    <button className="row-action" onClick={() => onCommand(`chia nhỏ task ${t.title}`)}>
                      <Sparkles size={12} /> Phân rã
                    </button>
                  )}
                  <button className="row-action" onClick={() => onEditTask(t)}>
                    <Edit3 size={12} /> Sửa
                  </button>
                  <button className="row-action danger" onClick={() => handleTaskDelete(t.id)}>
                    <Trash2 size={12} /> Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeIntent === "list_habits" || activeIntent === "create_habit") {
    const isAiFiltered = activeIntent === "list_habits" && Array.isArray(data);
    const habitsToRender = isAiFiltered ? data : appData.habits;

    return (
      <div className="cli-viewport-feed">
        <div className="cli-feed-header">
          <div className="cli-feed-title">
            <Activity size={18} />
            <span>Thói quen & Luyện tập ({habitsToRender.length})</span>
          </div>
          <button className="row-action primary" onClick={() => { setEditingHabit(null); setIsHabitModalOpen(true); }}>
            <Plus size={14} /> New Habit
          </button>
        </div>

        {habitsToRender.length === 0 ? (
          <div className="cli-empty-state">Bạn chưa thiết lập thói quen nào.</div>
        ) : (
          <div className="cli-grid-layout">
            {habitsToRender.map((h: any) => (
              <div className={`viewport-card habit-card ${isAiFiltered ? "ai-filtered" : ""}`} key={h.id}>
                <div className="card-header">
                  <h3 className="card-title">⚡ {h.title}</h3>
                  <div className="streak-indicator">
                    <Flame size={14} className="icon-fire" />
                    <span>{h.streak} ngày</span>
                  </div>
                </div>
                <div className="card-subtitle">
                  Tần suất: {h.frequency} (Mục tiêu: {h.target_count} lần/tuần)
                </div>

                <div className="habit-progress-wrap">
                  <div className="progress-label">Hoàn thành tuần này: {h.logged_count}/{h.target_count}</div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${Math.min(100, (h.logged_count / h.target_count) * 100)}%` }} />
                  </div>
                </div>

                <div className="card-actions">
                  <button 
                    className={`row-action ${h.logged_today ? 'logged' : 'primary'}`} 
                    onClick={() => handleHabitLog(h.id)}
                    disabled={h.logged_today}
                  >
                    <CheckCircle2 size={12} /> {h.logged_today ? "Đã Log Hôm Nay" : "Log Hôm Nay"}
                  </button>
                  <button className="row-action" onClick={() => { setEditingHabit(h); setIsHabitModalOpen(true); }}>
                    <Edit3 size={12} /> Sửa
                  </button>
                  <button className="row-action danger" onClick={() => handleHabitDelete(h.id)}>
                    <Trash2 size={12} /> Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <HabitEditorModal
          habit={editingHabit}
          isOpen={isHabitModalOpen}
          onClose={() => setIsHabitModalOpen(false)}
          onSave={async (payload) => {
            if (editingHabit) {
              await updateHabitApi(editingHabit.id, payload);
            } else {
              await createHabitApi(payload);
            }
            await onReloadData();
          }}
          onDelete={editingHabit ? handleHabitDelete : undefined}
        />
      </div>
    );
  }

  if (activeIntent === "deadline_radar" || activeIntent === "create_deadline" || activeIntent === "explain_deadline") {
    const radar = appData.deadlines;
    const isAiFiltered = (activeIntent === "deadline_radar" || activeIntent === "explain_deadline") && data !== null;

    return (
      <div className="cli-viewport-feed">
        <div className="cli-feed-header">
          <div className="cli-feed-title">
            <Radar size={18} />
            <span>Radar Hạn chót & Thời hạn</span>
          </div>
          <button className="row-action primary" onClick={() => { setEditingDeadline(null); setIsDeadlineModalOpen(true); }}>
            <Plus size={14} /> New Deadline
          </button>
        </div>

        <div className="cli-deadline-groups">
          {Object.entries(radar).map(([groupKey, list]) => {
            if (!Array.isArray(list) || list.length === 0) return null;
            
            const groupLabels: Record<string, string> = {
              overdue: "Quá hạn (Urgent)",
              today: "Trong ngày hôm nay",
              this_week: "Trong tuần này",
              later: "Để sau"
            };

            return (
              <div className={`deadline-group-panel group-${groupKey}`} key={groupKey}>
                <h4 className="group-heading">{groupLabels[groupKey]} ({list.length})</h4>
                <div className="cli-list-layout">
                  {list.map((d: any) => (
                    <div className={`viewport-row-item deadline-row ${isAiFiltered ? "ai-filtered" : ""}`} key={d.id}>
                      <div className="row-content">
                        <div className="row-title">⚠️ {d.title}</div>
                        <div className="row-metadata">
                          <span className={`meta-tag severity-${d.severity}`}>Mức độ: {d.severity.toUpperCase()}</span>
                          <span className="meta-tag time">Hạn chót: {d.due_at.replace("T", " ").slice(0, 16)}</span>
                          {d.goal_title && <span className="meta-tag">🎯 {d.goal_title}</span>}
                          {d.project_title && <span className="meta-tag">📁 {d.project_title}</span>}
                        </div>
                      </div>
                      <div className="row-actions">
                        <button className="row-action" onClick={() => { setEditingDeadline(d); setIsDeadlineModalOpen(true); }}>
                          <Edit3 size={12} /> Sửa
                        </button>
                        <button className="row-action danger" onClick={() => handleDeadlineDelete(d.id)}>
                          <Trash2 size={12} /> Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <DeadlineEditorModal
          isOpen={isDeadlineModalOpen}
          deadline={editingDeadline}
          data={appData}
          onClose={() => setIsDeadlineModalOpen(false)}
          onSave={async (payload) => {
            if (editingDeadline) {
              await updateDeadlineApi(editingDeadline.id, payload);
            } else {
              await createDeadlineApi(payload);
            }
            await onReloadData();
          }}
          onDelete={editingDeadline ? handleDeadlineDelete : undefined}
        />
      </div>
    );
  }

  // Fallback default screen -> Unified Today Feed (Timeline & Suggested Focus)
  const today = appData.today;
  const suggested = today?.suggested_focus;
  const timeline = today?.timeline || [];

  return (
    <div className="cli-viewport-feed today-viewport">
      <div className="cli-feed-header">
        <div className="cli-feed-title">
          <Calendar size={18} />
          <span>Bảng điều khiển Hôm nay ({today?.date})</span>
        </div>
      </div>

      {today?.greeting && <p className="today-greeting-txt">✨ {today.greeting}</p>}

      {/* Summary stats */}
      <div className="today-summary-strip">
        <div className="summary-stat-box">
          <span className="stat-num">{today?.summary?.open_tasks ?? 0}</span>
          <span className="stat-lbl">Việc đang mở</span>
        </div>
        <div className="summary-stat-box">
          <span className="stat-num">{today?.summary?.due_today ?? 0}</span>
          <span className="stat-lbl">Hạn chót hôm nay</span>
        </div>
        <div className="summary-stat-box">
          <span className="stat-num">{today?.summary?.events_today ?? 0}</span>
          <span className="stat-lbl">Sự kiện hôm nay</span>
        </div>
      </div>

      {/* Suggested Focus */}
      {suggested && (
        <div className="suggested-focus-panel">
          <div className="panel-header">
            <Sparkles size={16} />
            <span>Tiêu điểm làm việc được đề xuất</span>
          </div>
          <h3 className="focus-title">{suggested.title}</h3>
          <p className="focus-reason"><strong>Lý do ưu tiên:</strong> {suggested.reason}</p>
          <div className="focus-meta">
            <span className="meta-tag">Thời lượng: {suggested.duration_minutes} phút</span>
            <span className="meta-tag">Độ phù hợp: {suggested.fit_label}</span>
          </div>
        </div>
      )}

      {/* Schedule Timeline */}
      <div className="timeline-section-panel">
        <h4 className="section-title">
          <Clock size={16} />
          <span>Dòng sự kiện hôm nay</span>
        </h4>
        {timeline.length === 0 ? (
          <div className="cli-empty-state">Hôm nay chưa có lịch trình nào được sắp xếp.</div>
        ) : (
          <div className="timeline-flow-list">
            {timeline.map((item: any, idx: number) => (
              <div className="timeline-flow-item" key={item.id || idx}>
                <time className="item-time">{item.start.slice(11, 16)} - {item.end.slice(11, 16)}</time>
                <div className="item-indicator" data-type={item.type} />
                <div className="item-details">
                  <div className="item-title">{item.title}</div>
                  <span className={`item-type-badge ${item.type}`}>{item.type}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
