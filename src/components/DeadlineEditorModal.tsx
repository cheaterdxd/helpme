import { X, Radar, AlertTriangle, Trash2 } from "lucide-react";
import { useState, useEffect, type FormEvent } from "react";
import type { AppData } from "../types";

type DeadlineEditorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  deadline: any | null;
  data: AppData;
};

export function DeadlineEditorModal({
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
      onClose();
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
                style={{ color: "#c81e1e", display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer" }}
                onClick={() => void onDelete(deadline.id)}
                disabled={saving}
              >
                <Trash2 size={14} />
                <span>Xóa bỏ</span>
              </button>
            ) : (
              <div />
            )}

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="row-action"
                onClick={onClose}
                style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "8px 16px", borderRadius: "var(--radius)", cursor: "pointer" }}
                disabled={saving}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="row-action"
                style={{ backgroundColor: "var(--accent)", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "var(--radius)", cursor: "pointer" }}
                disabled={saving}
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
