import { X, Activity, AlertTriangle, Trash2 } from "lucide-react";
import { useState, useEffect, type FormEvent } from "react";

type HabitEditorModalProps = {
  habit: any | null; // null means create mode
  isOpen: boolean;
  onClose: () => void;
  onSave: (habitData: any) => Promise<void>;
  onDelete?: (habitId: string) => Promise<void>;
};

export function HabitEditorModal({
  habit,
  isOpen,
  onClose,
  onSave,
  onDelete
}: HabitEditorModalProps) {
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [targetCount, setTargetCount] = useState(1);
  const [status, setStatus] = useState("active");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Reset fields when habit changes or modal opens
  useEffect(() => {
    if (habit) {
      setTitle(habit.title || "");
      setFrequency(habit.frequency || "daily");
      setTargetCount(habit.target_count ?? 1);
      setStatus(habit.status || "active");
    } else {
      setTitle("");
      setFrequency("daily");
      setTargetCount(1);
      setStatus("active");
    }
    setErrorMessage("");
  }, [habit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");

    const payload = {
      title,
      frequency,
      target_count: Number(targetCount),
      status
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể lưu thói quen.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!habit || !onDelete) return;
    if (!confirm(`Bạn chắc chắn muốn xóa thói quen "${habit.title}" cùng toàn bộ lịch sử check-in liên quan?`)) return;

    setSaving(true);
    try {
      await onDelete(habit.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể xóa thói quen.");
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
          maxWidth: "420px",
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
            <Activity size={20} style={{ color: "var(--accent)" }} />
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
              {habit ? "Chỉnh sửa thói quen" : "Tạo thói quen mới"}
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
            <label htmlFor="habitTitle">Tên thói quen</label>
            <input
              type="text"
              id="habitTitle"
              className="settings-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="ví dụ: Đọc sách, Thiền, Chạy bộ..."
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="settings-form-group">
              <label htmlFor="habitFreq">Tần suất</label>
              <select
                id="habitFreq"
                className="settings-input"
                value={frequency}
                onChange={(e) => {
                  const val = e.target.value;
                  setFrequency(val);
                  if (val === "daily") setTargetCount(1);
                  else if (val === "weekly") setTargetCount(3);
                }}
              >
                <option value="daily">Mỗi ngày (Daily)</option>
                <option value="weekly">Mỗi tuần (Weekly)</option>
              </select>
            </div>

            <div className="settings-form-group">
              <label htmlFor="habitTarget">Mục tiêu (lần / chu kỳ)</label>
              <input
                type="number"
                id="habitTarget"
                className="settings-input"
                min="1"
                max={frequency === "daily" ? 5 : 7}
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="settings-form-group">
            <label htmlFor="habitStatus">Trạng thái</label>
            <select
              id="habitStatus"
              className="settings-input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Đang hoạt động (Active)</option>
              <option value="paused">Tạm dừng (Paused)</option>
            </select>
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
            {habit && onDelete ? (
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
