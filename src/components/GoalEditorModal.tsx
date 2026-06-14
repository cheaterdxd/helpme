import { X, Target, AlertTriangle, Trash2 } from "lucide-react";
import { useState, useEffect, type FormEvent } from "react";

type GoalEditorModalProps = {
  goal: any | null; // null means create mode
  isOpen: boolean;
  onClose: () => void;
  onSave: (goalData: any) => Promise<void>;
  onDelete?: (goalId: string) => Promise<void>;
};

export function GoalEditorModal({
  goal,
  isOpen,
  onClose,
  onSave,
  onDelete
}: GoalEditorModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [priority, setPriority] = useState(50);
  const [isNorthStar, setIsNorthStar] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (goal) {
      setTitle(goal.title || "");
      setDescription(goal.description || "");
      setStatus(goal.status || "active");
      setPriority(goal.priority ?? 50);
      setIsNorthStar(goal.is_north_star === 1 || goal.is_north_star === true);
    } else {
      setTitle("");
      setDescription("");
      setStatus("active");
      setPriority(50);
      setIsNorthStar(false);
    }
    setErrorMessage("");
  }, [goal, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");

    const payload = {
      title,
      description: description || null,
      status,
      priority: Number(priority),
      is_north_star: isNorthStar ? 1 : 0
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể lưu mục tiêu.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!goal || !onDelete) return;
    if (!confirm(`Bạn chắc chắn muốn xóa mục tiêu "${goal.title}" cùng toàn bộ dự án và công việc liên quan?`)) return;

    setSaving(true);
    try {
      await onDelete(goal.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể xóa mục tiêu.");
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
            <Target size={20} style={{ color: "var(--accent)" }} />
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
              {goal ? "Chỉnh sửa mục tiêu" : "Tạo mục tiêu mới"}
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
            <label htmlFor="goalTitle">Tên mục tiêu</label>
            <input
              type="text"
              id="goalTitle"
              className="settings-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="ví dụ: Nâng cao kỹ năng Cloud, Học tiếng Anh..."
            />
          </div>

          <div className="settings-form-group">
            <label htmlFor="goalDesc">Mô tả chi tiết</label>
            <textarea
              id="goalDesc"
              className="settings-input"
              style={{ minHeight: "80px", resize: "vertical" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Giải thích thêm về mục tiêu này..."
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="settings-form-group">
              <label htmlFor="goalPriority">Độ ưu tiên (10-100)</label>
              <input
                type="number"
                id="goalPriority"
                className="settings-input"
                min="10"
                max="100"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              />
            </div>

            <div className="settings-form-group">
              <label htmlFor="goalStatus">Trạng thái</label>
              <select
                id="goalStatus"
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

          <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 0" }}>
            <input
              type="checkbox"
              id="goalNorthStar"
              checked={isNorthStar}
              onChange={(e) => setIsNorthStar(e.target.checked)}
              style={{ cursor: "pointer", width: "16px", height: "16px" }}
            />
            <label htmlFor="goalNorthStar" style={{ cursor: "pointer", fontSize: "14px", fontWeight: 500 }}>
              Đặt làm Mục tiêu Sao Bắc Đẩu (North Star Goal)
            </label>
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
            {goal && onDelete ? (
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
