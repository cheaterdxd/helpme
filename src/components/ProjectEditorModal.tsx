import { X, Folder, AlertTriangle, Trash2 } from "lucide-react";
import { useState, useEffect, type FormEvent } from "react";

type ProjectEditorModalProps = {
  project: any | null; // null means create mode
  goals: Array<{ id: string; title: string }>;
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: any) => Promise<void>;
  onDelete?: (projectId: string) => Promise<void>;
};

export function ProjectEditorModal({
  project,
  goals,
  isOpen,
  onClose,
  onSave,
  onDelete
}: ProjectEditorModalProps) {
  const [title, setTitle] = useState("");
  const [goalId, setGoalId] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [priority, setPriority] = useState(50);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (project) {
      setTitle(project.title || "");
      setGoalId(project.goal_id || "");
      setDescription(project.description || "");
      setStatus(project.status || "active");
      setPriority(project.priority ?? 50);
    } else {
      setTitle("");
      setGoalId(goals[0]?.id || "");
      setDescription("");
      setStatus("active");
      setPriority(50);
    }
    setErrorMessage("");
  }, [project, isOpen, goals]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");

    const payload = {
      title,
      goal_id: goalId,
      description: description || null,
      status,
      priority: Number(priority)
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể lưu dự án.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!project || !onDelete) return;
    if (!confirm(`Bạn chắc chắn muốn xóa dự án "${project.title}" cùng toàn bộ công việc liên quan?`)) return;

    setSaving(true);
    try {
      await onDelete(project.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể xóa dự án.");
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
          maxWidth: "460px",
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
            <Folder size={20} style={{ color: "var(--accent)" }} />
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
              {project ? "Chỉnh sửa dự án" : "Tạo dự án mới"}
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
            <div className="settings-alert-error" style={{ marginBottom: "0px", display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
              <AlertTriangle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="settings-form-group">
            <label htmlFor="projGoal">Thuộc mục tiêu</label>
            <select
              id="projGoal"
              className="settings-input"
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              required
            >
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-form-group">
            <label htmlFor="projTitle">Tên dự án</label>
            <input
              type="text"
              id="projTitle"
              className="settings-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="ví dụ: Triển khai MVP UI, Luyện đề thi..."
            />
          </div>

          <div className="settings-form-group">
            <label htmlFor="projDesc">Mô tả chi tiết</label>
            <textarea
              id="projDesc"
              className="settings-input"
              style={{ minHeight: "80px", resize: "vertical" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Giải thích thêm về dự án này..."
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="settings-form-group">
              <label htmlFor="projPriority">Độ ưu tiên (10-100)</label>
              <input
                type="number"
                id="projPriority"
                className="settings-input"
                min="10"
                max="100"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              />
            </div>

            <div className="settings-form-group">
              <label htmlFor="projStatus">Trạng thái</label>
              <select
                id="projStatus"
                className="settings-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Đang thực hiện (Active)</option>
                <option value="paused">Tạm dừng (Paused)</option>
                <option value="completed">Đã hoàn thành (Completed)</option>
              </select>
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
            {project && onDelete ? (
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
