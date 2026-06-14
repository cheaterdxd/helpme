import { handleAiCommand } from "../server/ai/command.mjs";
import { confirmActionProposal, rejectActionProposal } from "../server/db/app-queries.mjs";
import { assistantMessage, errorMessage, successMessage } from "./render/chat.mjs";
import { renderProposal } from "./render/proposal.mjs";

export async function handleAiMessage(message, rl) {
  const result = await handleAiCommand(message);

  // Print AI text answer
  if (result.answer) {
    console.log();
    console.log(assistantMessage(result.answer));
  }

  // If proposal → show card + ask Y/n
  if (result.mode === "proposal" && result.proposal) {
    const confirmed = await renderProposal(result.proposal, rl);

    if (confirmed) {
      const applyResult = confirmActionProposal(result.proposal.id);
      if (applyResult.ok) {
        console.log(successMessage("Đã xác nhận! Dữ liệu đã được lưu vào SQLite."));
      } else {
        console.log(errorMessage(`Xác nhận thất bại: ${applyResult.error}`));
      }
    } else {
      const rejectResult = rejectActionProposal(result.proposal.id);
      if (rejectResult.ok) {
        console.log(errorMessage("Đã huỷ đề xuất."));
      }
    }
  }

  // Orchestration error hint
  if (result.intent === "orchestrator_error") {
    console.log(errorMessage(`Lỗi: ${result.related_context?.error_code ?? "unknown"}`));
  }
}
