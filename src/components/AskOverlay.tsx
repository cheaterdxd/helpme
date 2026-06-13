import { Check, Send, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import type {
  AiActionProposal,
  AskResponse,
  CreateTaskValidation,
  InboxOrganizationAction,
  NowBriefing,
  PlanProposalBlock,
  PlanProposalValidation,
  ReviewRescheduleItem,
  ReviewRescheduleValidation
} from "../types";

type AskOverlayProps = {
  briefing: NowBriefing;
  open: boolean;
  answer: AskResponse | null;
  pending: boolean;
  onAsk: (message: string) => Promise<void>;
  onConfirmProposal: (proposalId: string) => Promise<void>;
  onRejectProposal: (proposalId: string) => Promise<void>;
};

export function AskOverlay({
  briefing,
  open,
  answer,
  pending,
  onAsk,
  onConfirmProposal,
  onRejectProposal
}: AskOverlayProps) {
  const [message, setMessage] = useState("");

  async function submitAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    await onAsk(trimmed);
    setMessage("");
  }

  return (
    <section className="ask-overlay" id="askOverlay" aria-label="Ask HelpMe" data-open={open} role="dialog" aria-modal="true">
      <header className="ask-header">
        <span className="orb-core" aria-hidden="true" />
        <div>
          <h2>Command HelpMe</h2>
          <p>Ask, plan, create, reschedule. Writes always wait for confirmation.</p>
        </div>
      </header>

      <div className="suggestions" aria-label="Suggested commands">
        {["Organize inbox", "Plan today from 20h to 23h", ...briefing.suggested_questions.slice(0, 2)].map((question) => (
          <button className="suggestion" type="button" key={question} onClick={() => void onAsk(question)}>
            {question}
          </button>
        ))}
      </div>

      {answer && (
        <div className="ask-answer" aria-live="polite">
          <strong>HelpMe</strong>
          <p>{answer.answer}</p>

          {answer.proposal && (
            <div className="proposal-card">
              <span>{answer.proposal.intent}</span>
              <h3>{answer.proposal.title}</h3>
              <p>{answer.proposal.summary}</p>
              <ProposalPreview proposal={answer.proposal} />
              <div className="proposal-actions">
                <button type="button" className="confirm-button" onClick={() => void onConfirmProposal(answer.proposal!.id)}>
                  <Check aria-hidden="true" size={15} />
                  <span>Confirm</span>
                </button>
                <button type="button" className="cancel-button" onClick={() => void onRejectProposal(answer.proposal!.id)}>
                  <X aria-hidden="true" size={15} />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <form className="ask-input" onSubmit={submitAsk}>
        <input
          type="text"
          aria-label="Message HelpMe"
          placeholder="Tell HelpMe what to do..."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <button className="send-button" type="submit" disabled={pending}>
          {pending ? "..." : <Send aria-hidden="true" size={17} />}
        </button>
      </form>
    </section>
  );
}

function ProposalPreview({ proposal }: { proposal: AiActionProposal }) {
  if (proposal.intent === "organize_inbox") {
    return <InboxProposalPreview proposal={proposal} />;
  }

  if (proposal.intent === "plan_day") {
    return <PlanProposalPreview proposal={proposal} />;
  }

  if (proposal.intent === "daily_review") {
    return <ReviewProposalPreview proposal={proposal} />;
  }

  if (proposal.intent === "create_task") {
    return <ScheduledTaskProposalPreview proposal={proposal} mode="create" />;
  }

  if (proposal.intent === "reschedule_task") {
    return <ScheduledTaskProposalPreview proposal={proposal} mode="reschedule" />;
  }

  if (proposal.intent === "breakdown_task") {
    return <BreakdownTaskProposalPreview proposal={proposal} />;
  }

  if (proposal.intent === "create_reminder") {
    return <ReminderProposalPreview proposal={proposal} />;
  }

  return null;
}

function InboxProposalPreview({ proposal }: { proposal: AiActionProposal }) {
  const actions = getInboxActions(proposal);
  if (!actions.length) return null;

  const allGroups: Array<[string, InboxOrganizationAction[]]> = [
    ["Learning", actions.filter((action) => action.group === "learning")],
    ["Project", actions.filter((action) => action.group === "project")],
    ["Personal", actions.filter((action) => action.group === "personal")]
  ];
  const groups = allGroups.filter(([, groupActions]) => groupActions.length);

  return (
    <div className="proposal-preview" aria-label="Inbox organization preview">
      {groups.map(([label, groupActions]) => (
        <section className="proposal-preview-group" key={label}>
          <span>{label}</span>
          {groupActions.map((action) => (
            <div className="proposal-preview-item" key={action.task_id}>
              <strong>{action.title}</strong>
              <small>
                {action.project_title ?? action.goal_title ?? "Unlinked"} / P{action.priority} / {action.estimated_minutes}m
              </small>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function PlanProposalPreview({ proposal }: { proposal: AiActionProposal }) {
  const blocks = getPlanBlocks(proposal);
  const validation = getPlanValidation(proposal);
  if (!blocks.length) return null;

  return (
    <div className="proposal-preview proposal-timeline" aria-label="Plan preview">
      <div className="proposal-preview-summary">
        <b>{validation?.scheduled_minutes ?? sumBlockMinutes(blocks)}m</b>
        <span>{validation?.conflict_count ?? 0} conflicts</span>
      </div>
      {blocks.map((block) => (
        <div className="proposal-time-row" data-type={block.type} key={`${block.start_at}-${block.title}`}>
          <time>{formatTime(block.start_at)}</time>
          <div>
            <strong>{block.title}</strong>
            <small>
              {formatTime(block.start_at)} - {formatTime(block.end_at)} / {formatDuration(block.start_at, block.end_at)}
            </small>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewProposalPreview({ proposal }: { proposal: AiActionProposal }) {
  const items = getReviewItems(proposal);
  const validation = getReviewValidation(proposal);
  if (!items.length) return null;

  return (
    <div className="proposal-preview proposal-review" aria-label="Review reschedule preview">
      <div className="proposal-preview-summary">
        <b>{validation?.scheduled_tasks ?? items.length} tasks</b>
        <span>{validation?.conflict_count ?? 0} conflicts</span>
      </div>
      {items.map((item) => (
        <div className="proposal-review-row" key={item.task_id}>
          <strong>{item.title}</strong>
          <small>
            {formatDate(item.suggested_start)} / {formatTime(item.suggested_start)} - {formatTime(item.suggested_end)} / {item.duration_minutes}m
          </small>
        </div>
      ))}
      {!!validation?.unscheduled_task_ids?.length && (
        <p className="proposal-warning">{validation.unscheduled_task_ids.length} task left unscheduled.</p>
      )}
    </div>
  );
}

function ScheduledTaskProposalPreview({ proposal, mode }: { proposal: AiActionProposal; mode: "create" | "reschedule" }) {
  const validation = getCreateTaskValidation(proposal);
  const title = typeof proposal.payload.title === "string" ? proposal.payload.title : proposal.title.replace(/^Create task:\s*/i, "");
  const scheduledStart = typeof proposal.payload.scheduled_start === "string" ? proposal.payload.scheduled_start : null;
  const scheduledEnd = typeof proposal.payload.scheduled_end === "string" ? proposal.payload.scheduled_end : null;
  const estimatedMinutes = typeof proposal.payload.estimated_minutes === "number" ? proposal.payload.estimated_minutes : 30;
  const conflictCount = validation?.conflict_count ?? 0;

  return (
    <div className="proposal-preview proposal-create" aria-label={mode === "create" ? "Create task preview" : "Reschedule task preview"}>
      <div className="proposal-preview-summary" data-state={conflictCount ? "conflict" : "clear"}>
        <b>{scheduledStart ? `${formatTime(scheduledStart)} / ${estimatedMinutes}m` : "Inbox"}</b>
        <span>{conflictCount} conflicts</span>
      </div>
      <div className="proposal-review-row">
        <strong>{title}</strong>
        <small>
          {scheduledStart && scheduledEnd
            ? `${formatDate(scheduledStart)} / ${formatTime(scheduledStart)} - ${formatTime(scheduledEnd)}`
            : `${mode === "create" ? `Priority ${proposal.payload.priority ?? 50}` : "No target time"} / unscheduled`}
        </small>
      </div>
      {!!validation?.conflicts?.length && (
        <div className="proposal-conflicts">
          {validation.conflicts.map((conflict) => (
            <small key={`${conflict.start}-${conflict.title}`}>
              {formatTime(conflict.start)} - {formatTime(conflict.end)} / {conflict.title}
            </small>
          ))}
        </div>
      )}
    </div>
  );
}

function getInboxActions(proposal: AiActionProposal): InboxOrganizationAction[] {
  const value = proposal.payload.actions;
  if (!Array.isArray(value)) return [];

  return value.filter((action) => {
    return action && typeof action.task_id === "string" && typeof action.title === "string";
  });
}

function getPlanBlocks(proposal: AiActionProposal): PlanProposalBlock[] {
  const value = proposal.payload.blocks;
  if (!Array.isArray(value)) return [];

  return value.filter((block) => {
    return block && typeof block.title === "string" && typeof block.start_at === "string" && typeof block.end_at === "string";
  });
}

function getPlanValidation(proposal: AiActionProposal): PlanProposalValidation | null {
  const value = proposal.payload.validation;
  if (!value || !("scheduled_blocks" in value)) return null;
  return value;
}

function getReviewItems(proposal: AiActionProposal): ReviewRescheduleItem[] {
  const value = proposal.payload.reschedule;
  if (!Array.isArray(value)) return [];

  return value.filter((item) => {
    return item && typeof item.task_id === "string" && typeof item.title === "string" && typeof item.suggested_start === "string";
  });
}

function getReviewValidation(proposal: AiActionProposal): ReviewRescheduleValidation | null {
  const value = proposal.payload.validation;
  if (!value || !("scheduled_tasks" in value)) return null;
  return value;
}

function getCreateTaskValidation(proposal: AiActionProposal): CreateTaskValidation | null {
  const value = proposal.payload.validation;
  if (!value || !("scheduled" in value)) return null;
  return value;
}

function formatTime(value: string) {
  return value.slice(11, 16);
}

function formatDate(value: string) {
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

function sumBlockMinutes(blocks: PlanProposalBlock[]) {
  return blocks.reduce((sum, block) => sum + Math.max(Math.round((Date.parse(block.end_at) - Date.parse(block.start_at)) / 60000), 0), 0);
}

function BreakdownTaskProposalPreview({ proposal }: { proposal: AiActionProposal }) {
  const payload = proposal.payload as any;
  const subtasks = Array.isArray(payload.subtasks) ? payload.subtasks : [];
  return (
    <div className="proposal-preview proposal-breakdown" aria-label="Breakdown task preview" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div className="proposal-preview-summary" style={{ display: "flex", justifyContent: "space-between" }}>
        <b>{subtasks.length} subtasks</b>
        {payload.new_project_title && <span style={{ color: "var(--muted)", fontSize: "13px" }}>Project: {payload.new_project_title as string}</span>}
      </div>
      <div className="compact-list" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {subtasks.map((st: any, idx: number) => (
          <div className="proposal-preview-item" key={idx} style={{ padding: "8px", border: "1px solid var(--line)", borderRadius: "var(--radius)", background: "var(--panel-soft)" }}>
            <strong style={{ display: "block", fontSize: "13px" }}>{st.title}</strong>
            <small style={{ color: "var(--muted)" }}>Priority {st.priority ?? 55} · {st.estimated_minutes ?? 30}m</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReminderProposalPreview({ proposal }: { proposal: AiActionProposal }) {
  const payload = proposal.payload as any;
  const title = typeof payload.title === "string" ? payload.title : proposal.title;
  const remindAt = typeof payload.remind_at === "string" ? payload.remind_at : null;

  return (
    <div className="proposal-preview proposal-reminder" aria-label="Create reminder preview">
      <div className="proposal-preview-summary">
        <b>{remindAt ? `${formatDate(remindAt)} / ${formatTime(remindAt)}` : "Right now"}</b>
        <span>Reminder</span>
      </div>
      <div className="proposal-review-row" style={{ marginTop: "8px" }}>
        <strong>{title}</strong>
        <small style={{ display: "block", color: "var(--muted)", marginTop: "4px" }}>
          Sẽ gửi thông báo nhắc nhở vào lúc {remindAt ? `${formatDate(remindAt)} ${formatTime(remindAt)}` : "ngay bây giờ"}.
        </small>
      </div>
    </div>
  );
}
