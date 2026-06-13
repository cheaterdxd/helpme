import { useEffect, useState } from "react";
import {
  askHelpMe,
  completeFocusSession,
  completeTask,
  confirmProposal,
  rejectProposal,
  fetchAppData,
  fetchNowBriefing,
  logHabitToday,
  reopenTask,
  startFocusSession
} from "./api";
import { AskOrb } from "./components/AskOrb";
import { AskOverlay } from "./components/AskOverlay";
import { ContextDrawer } from "./components/ContextDrawer";
import { NowScreen } from "./components/NowScreen";
import { RoutePanel } from "./components/RoutePanel";
import { TopBar } from "./components/TopBar";
import type { Route } from "./navigation";
import type { AppData, AskResponse, NowBriefing } from "./types";

export function App() {
  const [briefing, setBriefing] = useState<NowBriefing | null>(null);
  const [appData, setAppData] = useState<AppData | null>(null);
  const [briefingError, setBriefingError] = useState("");
  const [appError, setAppError] = useState("");
  const [activeRoute, setActiveRoute] = useState<Route>("now");
  const [menuOpen, setMenuOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [askAnswer, setAskAnswer] = useState<AskResponse | null>(null);
  const [askPending, setAskPending] = useState(false);

  useEffect(() => {
    void loadAllData();
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeLayers();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  function closeLayers() {
    setMenuOpen(false);
    setAskOpen(false);
    setContextOpen(false);
  }

  function showContext() {
    setMenuOpen(false);
    setAskOpen(false);
    setContextOpen(true);
  }

  function showAsk() {
    setMenuOpen(false);
    setContextOpen(false);
    setAskOpen(true);
  }

  async function loadAllData() {
    const [briefingResult, appDataResult] = await Promise.allSettled([fetchNowBriefing(), fetchAppData()]);

    if (briefingResult.status === "fulfilled") {
      setBriefing(briefingResult.value);
      setBriefingError("");
    } else {
      setBriefingError(briefingResult.reason instanceof Error ? briefingResult.reason.message : "Unable to load briefing.");
    }

    if (appDataResult.status === "fulfilled") {
      setAppData(appDataResult.value);
      setAppError("");
    } else {
      setAppError(appDataResult.reason instanceof Error ? appDataResult.reason.message : "Unable to load app data.");
    }
  }

  async function handleAsk(message: string) {
    showAsk();
    setAskPending(true);
    try {
      setAskAnswer(await askHelpMe(message));
    } finally {
      setAskPending(false);
    }
  }

  async function handleConfirmProposal(proposalId: string) {
    setAskPending(true);
    try {
      await confirmProposal(proposalId);
      await loadAllData();
      setAskAnswer({
        mode: "answer",
        intent: "proposal_confirmed",
        answer: "Confirmed. HelpMe updated the local SQLite data.",
        related_context: {},
        suggested_actions: []
      });
    } finally {
      setAskPending(false);
    }
  }

  async function handleRejectProposal(proposalId: string) {
    setAskPending(true);
    try {
      await rejectProposal(proposalId);
      await loadAllData();
      setAskAnswer({
        mode: "answer",
        intent: "proposal_rejected",
        answer: "Proposal was cancelled/rejected.",
        related_context: {},
        suggested_actions: []
      });
    } finally {
      setAskPending(false);
    }
  }

  async function handleCompleteTask(taskId: string) {
    await completeTask(taskId);
    await loadAllData();
  }

  async function handleReopenTask(taskId: string) {
    await reopenTask(taskId);
    await loadAllData();
  }

  async function handleLogHabit(habitId: string) {
    await logHabitToday(habitId);
    await loadAllData();
  }

  async function handleStartFocus(taskId: string) {
    await startFocusSession(taskId);
    await loadAllData();
  }

  async function handleCompleteFocus(sessionId: string, completeTask = false) {
    await completeFocusSession(sessionId, completeTask);
    await loadAllData();
  }

  return (
    <div className="app-shell">
      <TopBar
        activeRoute={activeRoute}
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((open) => !open)}
        onRouteChange={(route) => {
          setActiveRoute(route);
          closeLayers();
        }}
      />

      <main className="screen">
        {activeRoute === "now" ? (
          <NowScreen
            briefing={briefing}
            error={briefingError}
          />
        ) : (
          <RoutePanel
            route={activeRoute}
            data={appData}
            error={appError}
            onCommand={handleAsk}
            onCompleteTask={handleCompleteTask}
            onReopenTask={handleReopenTask}
            onLogHabit={handleLogHabit}
            onStartFocus={handleStartFocus}
            onCompleteFocus={handleCompleteFocus}
          />
        )}
      </main>

      <AskOrb open={askOpen} onOpen={showAsk} />

      {(askOpen || contextOpen) && <button className="modal-scrim" aria-label="Close overlay" onClick={closeLayers} />}

      {briefing && <ContextDrawer briefing={briefing} open={contextOpen} />}

      {briefing && (
        <AskOverlay
          briefing={briefing}
          open={askOpen}
          answer={askAnswer}
          pending={askPending}
          onAsk={handleAsk}
          onConfirmProposal={handleConfirmProposal}
          onRejectProposal={handleRejectProposal}
        />
      )}
    </div>
  );
}
