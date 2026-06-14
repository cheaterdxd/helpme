import { useState, useRef, useEffect } from "react";
import { Send, Check, X, Sparkles, AlertTriangle } from "lucide-react";
import { askHelpMe } from "../api";
import type { AskResponse } from "../types";

type LogEntry = {
  id: string;
  type: "input" | "output" | "error" | "proposal";
  text?: string;
  proposal?: any;
  proposalStatus?: "pending" | "confirmed" | "rejected";
};

type CommandConsoleProps = {
  onConfirmProposal: (proposalId: string) => Promise<void>;
  onRejectProposal: (proposalId: string) => Promise<void>;
  onIntentResult: (intent: string | null, data: any) => void;
  activeIntent: string | null;
  onReloadData: () => Promise<void>;
  pendingCommand: string | null;
  clearPendingCommand: () => void;
};

export function CommandConsole({
  onConfirmProposal,
  onRejectProposal,
  onIntentResult,
  activeIntent,
  onReloadData,
  pendingCommand,
  clearPendingCommand
}: CommandConsoleProps) {
  const [input, setInput] = useState("");
  const [log, setLog] = useState<LogEntry[]>([
    {
      id: "welcome",
      type: "output",
      text: `🤖 HELPME TERMINAL OS [Version 0.1.0]
Personal OS · Local-first · AI-powered
--------------------------------------------------
Gõ lệnh tự nhiên hoặc sử dụng các lệnh điều khiển:
  /help       - Hiển thị danh sách lệnh hỗ trợ
  /today      - Xem tóm tắt ngày, timeline, overload
  /tasks      - Liệt kê toàn bộ công việc phân loại
  /habits     - Kiểm tra thói quen & chuỗi streak
  /goals      - Theo dõi tiến độ mục tiêu & dự án con
  /deadlines  - Hiển thị radar thời hạn
  /clear      - Dọn dẹp giao diện dòng lệnh`
    }
  ]);
  const [pending, setPending] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  useEffect(() => {
    if (pendingCommand) {
      void executeCommand(pendingCommand);
      clearPendingCommand();
    }
  }, [pendingCommand]);

  async function handleCommandSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    await executeCommand(trimmed);
  }

  async function executeCommand(trimmed: string) {
    // 1. Log the user input
    const entryId = Math.random().toString(36).substring(7);
    setLog((prev) => [...prev, { id: entryId, type: "input", text: `HelpMe › ${trimmed}` }]);

    // 2. Parse command
    if (trimmed.startsWith("/")) {
      const parts = trimmed.split(/\s+/);
      const cmd = parts[0].toLowerCase();

      if (cmd === "/clear") {
        setLog([]);
        return;
      }

      if (cmd === "/help") {
        setLog((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            type: "output",
            text: `📋 LỆNH HỆ THỐNG HỖ TRỢ:
  /help       - Hiển thị danh sách này
  /today      - Xem tóm tắt ngày, timeline, overload
  /tasks      - Liệt kê toàn bộ công việc phân loại
  /habits     - Kiểm tra thói quen & chuỗi streak
  /goals      - Theo dõi tiến độ mục tiêu & dự án con
  /deadlines  - Hiển thị radar thời hạn
  /clear      - Dọn dẹp giao diện dòng lệnh

💡 VÍ DỤ CÂU LỆNH TỰ NHIÊN (AI):
  "nhắc tôi học tiếng anh tối nay lúc 20h"
  "lên kế hoạch làm việc từ 19h30 đến 22h"
  "sắp xếp hòm thư inbox"
  "chia nhỏ mục tiêu học lập trình"`
          }
        ]);
        return;
      }

      const intentMapping: Record<string, string> = {
        "/now": "today",
        "/today": "today",
        "/tasks": "list_tasks",
        "/inbox": "list_tasks",
        "/deadlines": "deadline_radar",
        "/goals": "list_goals",
        "/habits": "list_habits"
      };

      if (intentMapping[cmd]) {
        const intent = intentMapping[cmd];
        onIntentResult(intent, null);
        setLog((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            type: "output",
            text: `System: Viewport intent set to [${intent.toUpperCase()}].`
          }
        ]);
        return;
      }

      // Invalid slash command
      setLog((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          type: "error",
          text: `Command not found: "${cmd}". Type /help for available commands.`
        }
      ]);
      return;
    }

    // 3. AI command execution
    setPending(true);
    const tempLoadingId = "loading-" + Math.random().toString(36).substring(7);
    setLog((prev) => [...prev, { id: tempLoadingId, type: "output", text: "HelpMe is analyzing intent..." }]);

    try {
      const response = await askHelpMe(trimmed);
      if (!response) {
        throw new Error("Unable to get AI response.");
      }

      // Context-aware UI transition based on AI intent
      const intent = response.intent;
      onIntentResult(intent, response.related_context || null);

      // Update log
      setLog((prev) => {
        const filtered = prev.filter((item) => item.id !== tempLoadingId);
        const results: LogEntry[] = [
          ...filtered,
          {
            id: "ans-" + Math.random().toString(36).substring(7),
            type: "output",
            text: response.answer
          }
        ];

        if (response.proposal) {
          results.push({
            id: "prop-" + Math.random().toString(36).substring(7),
            type: "proposal",
            proposal: response.proposal,
            proposalStatus: "pending"
          });
        }
        return results;
      });
    } catch (err: any) {
      setLog((prev) => {
        const filtered = prev.filter((item) => item.id !== tempLoadingId);
        return [
          ...filtered,
          {
            id: "err-" + Math.random().toString(36).substring(7),
            type: "error",
            text: err instanceof Error ? err.message : "HelpMe could not process the command."
          }
        ];
      });
    } finally {
      setPending(false);
    }
  }

  async function handleConfirmClick(proposalId: string, entryId: string) {
    setPending(true);
    try {
      await onConfirmProposal(proposalId);
      setLog((prev) =>
        prev.map((item) =>
          item.id === entryId
            ? {
                ...item,
                proposalStatus: "confirmed"
              }
            : item
        )
      );
    } catch (err: any) {
      setLog((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          type: "error",
          text: err instanceof Error ? err.message : "Error confirming proposal."
        }
      ]);
    } finally {
      setPending(false);
    }
  }

  async function handleRejectClick(proposalId: string, entryId: string) {
    setPending(true);
    try {
      await onRejectProposal(proposalId);
      setLog((prev) =>
        prev.map((item) =>
          item.id === entryId
            ? {
                ...item,
                proposalStatus: "rejected"
              }
            : item
        )
      );
    } catch (err: any) {
      setLog((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          type: "error",
          text: err instanceof Error ? err.message : "Error rejecting proposal."
        }
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="cli-control-console" aria-label="Interactive Command Console">
      <div className="cli-log-container">
        {log.map((entry) => (
          <div className={`cli-log-row cli-type-${entry.type}`} key={entry.id}>
            {entry.type === "input" && <div className="cli-input-text">{entry.text}</div>}
            
            {entry.type === "output" && entry.text && (
              <pre className="cli-pre">{entry.text}</pre>
            )}

            {entry.type === "error" && (
              <div className="cli-error-text">
                <AlertTriangle size={15} />
                <span>{entry.text}</span>
              </div>
            )}

            {entry.type === "proposal" && (
              <div className="cli-proposal-box" data-status={entry.proposalStatus}>
                <div className="cli-proposal-badge">
                  <Sparkles size={12} />
                  <span>{entry.proposal.intent.toUpperCase()}</span>
                </div>
                <h4 className="cli-proposal-title">{entry.proposal.title}</h4>
                <p className="cli-proposal-summary">{entry.proposal.summary}</p>
                
                <div className="cli-proposal-details">
                  <ProposalDetailsRenderer proposal={entry.proposal} />
                </div>

                <div className="cli-proposal-actions">
                  {entry.proposalStatus === "pending" && (
                    <>
                      <button
                        className="cli-btn cli-btn-confirm"
                        onClick={() => handleConfirmClick(entry.proposal.id, entry.id)}
                        disabled={pending}
                      >
                        <Check size={14} />
                        Confirm Action
                      </button>
                      <button
                        className="cli-btn cli-btn-reject"
                        onClick={() => handleRejectClick(entry.proposal.id, entry.id)}
                        disabled={pending}
                      >
                        <X size={14} />
                        Cancel
                      </button>
                    </>
                  )}

                  {entry.proposalStatus === "confirmed" && (
                    <div className="cli-status-stamp cli-stamp-confirmed">
                      <Check size={14} />
                      <span>Action Confirmed & SQLite Sync Completed</span>
                    </div>
                  )}

                  {entry.proposalStatus === "rejected" && (
                    <div className="cli-status-stamp cli-stamp-rejected">
                      <X size={14} />
                      <span>Action Cancelled / Rejected</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      <form className="cli-input-form" onSubmit={handleCommandSubmit}>
        <span className="cli-prompt-label">HelpMe ›</span>
        <input
          type="text"
          className="cli-terminal-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Gõ lệnh hoặc câu hỏi tự nhiên..."
          autoFocus
          disabled={pending}
          aria-label="Terminal Input"
        />
        <button className="cli-send-btn" type="submit" disabled={pending || !input.trim()} aria-label="Send">
          <Send size={15} />
        </button>
      </form>
    </section>
  );
}

function ProposalDetailsRenderer({ proposal }: { proposal: any }) {
  const payload = proposal.payload ?? {};

  if (proposal.intent === "plan_day" && Array.isArray(payload.blocks)) {
    return (
      <div className="cli-prop-grid">
        {payload.blocks.slice(0, 6).map((block: any, idx: number) => {
          const time = `${block.start_at.slice(11, 16)} - ${block.end_at.slice(11, 16)}`;
          return (
            <div className="cli-prop-grid-item" key={idx}>
              <span className="cli-bullet">↳</span>
              <time>{time}</time>
              <strong>{block.title}</strong>
            </div>
          );
        })}
        {payload.blocks.length > 6 && (
          <div className="cli-prop-grid-more">... và {payload.blocks.length - 6} khung giờ khác</div>
        )}
      </div>
    );
  }

  if (proposal.intent === "create_task") {
    const start = payload.scheduled_start ? payload.scheduled_start.slice(11, 16) : "Inbox";
    const est = payload.estimated_minutes ? `${payload.estimated_minutes}m` : "30m";
    return (
      <div className="cli-prop-single">
        <div><strong>Task:</strong> {payload.title ?? "Không tiêu đề"}</div>
        <div><strong>Time:</strong> {start} ({est})</div>
      </div>
    );
  }

  if (proposal.intent === "create_reminder") {
    const at = payload.remind_at ? `${payload.remind_at.slice(0, 10)} ${payload.remind_at.slice(11, 16)}` : "Ngay bây giờ";
    return (
      <div className="cli-prop-single">
        <div><strong>Reminder:</strong> {payload.title ?? "Không tiêu đề"}</div>
        <div><strong>Remind at:</strong> {at}</div>
      </div>
    );
  }

  if (proposal.intent === "organize_inbox" && Array.isArray(payload.actions)) {
    const grps: Record<string, string[]> = {};
    for (const a of payload.actions) {
      if (!grps[a.group]) grps[a.group] = [];
      grps[a.group].push(a.title);
    }
    return (
      <div className="cli-prop-list">
        {Object.entries(grps).map(([g, titles]) => (
          <div className="cli-prop-list-grp" key={g}>
            <span className="cli-grp-title">[{g.toUpperCase()}]</span>
            <span className="cli-grp-items">{titles.slice(0, 3).join(", ")}</span>
          </div>
        ))}
      </div>
    );
  }

  if (proposal.intent === "reschedule_task") {
    const start = payload.scheduled_start ? payload.scheduled_start.slice(11, 16) : "─";
    return (
      <div className="cli-prop-single">
        <div><strong>Task:</strong> {payload.title ?? "Không tiêu đề"}</div>
        <div><strong>New time:</strong> {start}</div>
      </div>
    );
  }

  if (proposal.intent === "daily_review" && Array.isArray(payload.reschedule)) {
    return (
      <div className="cli-prop-grid">
        {payload.reschedule.slice(0, 4).map((item: any, idx: number) => (
          <div className="cli-prop-grid-item" key={idx}>
            <span className="cli-bullet">↳</span>
            <strong>{item.title}</strong>
            <time>{item.suggested_start.slice(0, 10)}</time>
          </div>
        ))}
      </div>
    );
  }

  if (proposal.intent === "breakdown_goal" || proposal.intent === "breakdown_task") {
    const tasks = payload.subtasks ?? payload.tasks ?? [];
    return (
      <div className="cli-prop-grid">
        {tasks.slice(0, 5).map((t: any, idx: number) => (
          <div className="cli-prop-grid-item" key={idx}>
            <span className="cli-bullet">↳</span>
            <strong>{t.title}</strong>
            <span>({t.estimated_minutes ?? 30}m)</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
