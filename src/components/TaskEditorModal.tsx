import { X, Calendar, Clock, AlertTriangle, Trash2, Folder, Check, Target } from "lucide-react";
import { useState, useEffect, type FormEvent } from "react";
import type { ApiTask, AppData } from "../types";

type TaskEditorModalProps = {
  task: ApiTask | null; // null means create mode
  goals: AppData["goals"];
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: any) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
};

// Converts datetime-local string (e.g. "2026-06-13T20:00") to ISO with timezone (e.g. "2026-06-13T20:00:00+07:00")
function toIsoWithTimezone(localTime: string) {
  if (!localTime) return null;
  return `${localTime}:00+07:00`;
}

// Converts ISO with timezone to datetime-local string (e.g. "2026-06-13T20:00:00+07:00" -> "2026-06-13T20:00")
function fromIsoWithTimezone(isoString: string | null | undefined) {
  if (!isoString) return "";
  return isoString.slice(0, 16); // Extract "YYYY-MM-DDTHH:MM"
}

export function TaskEditorModal({
  task,
  goals,
  isOpen,
  onClose,
  onSave,
  onDelete
}: TaskEditorModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(50);
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [status, setStatus] = useState("todo");
  const [goalId, setGoalId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [validationConflicts, setValidationConflicts] = useState<any[]>([]);

  // Reset fields when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setPriority(task.priority ?? 50);
      setEstimatedMinutes(task.estimated_minutes ?? 30);
      setStatus(task.status || "todo");
      setGoalId(task.goal_id || "");
      setProjectId(task.project_id || "");
      setDueAt(task.due_at ? task.due_at.slice(0, 10) : "");
      setScheduledStart(fromIsoWithTimezone(task.scheduled_start));
    } else {
      setTitle("");
      setDescription("");
      setPriority(50);
      setEstimatedMinutes(30);
      setStatus("inbox"); // Default new tasks to inbox
      setGoalId(goals[0]?.id || "");
      setProjectId("");
      setDueAt("");
      setScheduledStart("");
    }
    setErrorMessage("");
    setValidationConflicts([]);
  }, [task, isOpen, goals]);

  if (!isOpen) return null;

  const selectedGoal = goals.find((g) => g.id === goalId);
  const projects = selectedGoal?.projects ?? [];

  const handleGoalChange = (newGoalId: string) => {
    setGoalId(newGoalId);
    const goal = goals.find((g) => g.id === newGoalId);
    setProjectId(goal?.projects[0]?.id || "");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setValidationConflicts([]);

    const payload = {
      title,
      description: description || null,
      priority,
      estimated_minutes: estimatedMinutes,
      status,
      goal_id: goalId || null,
      project_id: projectId || null,
      due_at: dueAt ? `${dueAt}T00:00:00+07:00` : null,
      scheduled_start: toIsoWithTimezone(scheduledStart),
      scheduled_end: scheduledStart ? toIsoWithTimezone(fromIsoWithTimezone(new Date(new Date(scheduledStart).getTime() + estimatedMinutes * 60000).toISOString())) : null
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err: any) {
      if (err.validation?.conflicts) {
        setValidationConflicts(err.validation.conflicts);
        setErrorMessage("Lịch trình bị trùng khớp với sự kiện khác.");
      } else {
        setErrorMessage(err.message || "Không thể lưu công việc.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !onDelete) return;
    if (!confirm(`Bạn chắc chắn muốn hủy công việc "${task.title}"?`)) return;

    setSaving(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể xóa công việc.");
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
          maxWidth: "520px",
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
            <Target size={20} style={{ color: "var(--accent)" }} />
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
              {task ? "Chỉnh sửa công việc" : "Thêm công việc mới"}
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
          {errorMessage && (
            <div className="settings-alert-error" style={{ marginBottom: "0px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </div>
              {validationConflicts.length > 0 && (
                <div style={{ marginTop: "4px", paddingLeft: "22px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {validationConflicts.map((c, i) => (
                    <small key={i} style={{ display: "block" }}>
                      • {c.title} ({c.start?.slice(11, 16) || c.start_at?.slice(11, 16)} - {c.end?.slice(11, 16) || c.end_at?.slice(11, 16)})
                    </small>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="settings-form-group">
            <label htmlFor="taskTitle">Tiêu đề</label>
            <input
              type="text"
              id="taskTitle"
              className="settings-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="ví dụ: Học AWS Security"
            />
          </div>

          <div className="settings-form-group">
            <label htmlFor="taskDesc">Mô tả</label>
            <textarea
              id="taskDesc"
              className="settings-input"
              style={{ minHeight: "80px", resize: "vertical" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Chi tiết công việc..."
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="settings-form-group">
              <label htmlFor="taskGoal">Mục tiêu (Goal)</label>
              <select
                id="taskGoal"
                className="settings-input"
                value={goalId}
                onChange={(e) => handleGoalChange(e.target.value)}
              >
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="settings-form-group">
              <label htmlFor="taskProject">Dự án (Project)</label>
              <select
                id="taskProject"
                className="settings-input"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">(Không có dự án)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="settings-form-group">
              <label htmlFor="taskPriority">Độ ưu tiên (10-100)</label>
              <input
                type="number"
                id="taskPriority"
                className="settings-input"
                min="10"
                max="100"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              />
            </div>

            <div className="settings-form-group">
              <label htmlFor="taskDuration">Thời lượng ước tính (phút)</label>
              <input
                type="number"
                id="taskDuration"
                className="settings-input"
                min="5"
                max="480"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="settings-form-group">
            <label htmlFor="taskStatus">Trạng thái</label>
            <select
              id="taskStatus"
              className="settings-input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="inbox">Hòm thư (Inbox)</option>
              <option value="todo">Cần làm (Todo)</option>
              <option value="doing">Đang làm (Doing)</option>
              <option value="done">Hoàn thành (Done)</option>
              <option value="cancelled">Hủy bỏ (Cancelled)</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="settings-form-group">
              <label htmlFor="taskDue">Hạn chót (Deadline)</label>
              <input
                type="date"
                id="taskDue"
                className="settings-input"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>

            <div className="settings-form-group">
              <label htmlFor="taskSchedule">Thời gian xếp lịch</label>
              <input
                type="datetime-local"
                id="taskSchedule"
                className="settings-input"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
              />
            </div>
          </div>

          <footer
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "12px",
              gap: "12px"
            }}
          >
            {task && onDelete ? (
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
                onClick={handleDelete}
                disabled={saving}
              >
                <Trash2 size={16} />
                <span>Hủy việc</span>
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
