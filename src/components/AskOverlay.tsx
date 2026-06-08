import { Check, Send, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { AskResponse, NowBriefing } from "../types";

type AskOverlayProps = {
  briefing: NowBriefing;
  open: boolean;
  answer: AskResponse | null;
  pending: boolean;
  onAsk: (message: string) => Promise<void>;
  onConfirmProposal: (proposalId: string) => Promise<void>;
  onClearAnswer: () => void;
};

export function AskOverlay({
  briefing,
  open,
  answer,
  pending,
  onAsk,
  onConfirmProposal,
  onClearAnswer
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
              <div className="proposal-actions">
                <button type="button" className="confirm-button" onClick={() => void onConfirmProposal(answer.proposal!.id)}>
                  <Check aria-hidden="true" size={15} />
                  <span>Confirm</span>
                </button>
                <button type="button" className="cancel-button" onClick={onClearAnswer}>
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
