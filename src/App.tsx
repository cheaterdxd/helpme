import { useEffect, useState } from "react";
import {
  askHelpMe,
  completeTask,
  confirmProposal,
  rejectProposal,
  fetchAppData,
  fetchNowBriefing,
  logHabitToday,
  reopenTask,
  updateSettingsApi,
  createTaskApi,
  updateTaskApi,
  deleteTaskApi,
  completeReminderApi,
  snoozeReminderApi
} from "./api";
import { DynamicViewport } from "./components/DynamicViewport";
import { CommandConsole } from "./components/CommandConsole";
import { TaskEditorModal } from "./components/TaskEditorModal";
import type { AppData, AskResponse, NowBriefing, AppSettings, ApiTask } from "./types";

export function App() {
  const [briefing, setBriefing] = useState<NowBriefing | null>(null);
  const [appData, setAppData] = useState<AppData | null>(null);
  const [briefingError, setBriefingError] = useState("");
  const [appError, setAppError] = useState("");
  const [viewportContext, setViewportContext] = useState<{ intent: string | null; data: any }>({
    intent: "today",
    data: null
  });
  const [isTaskEditorOpen, setIsTaskEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ApiTask | null>(null);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);

  useEffect(() => {
    void loadAllData();
  }, []);

  async function loadAllData() {
    const [briefingResult, appDataResult] = await Promise.allSettled([fetchNowBriefing(), fetchAppData()]);
    let newAppData: AppData | null = null;

    if (briefingResult.status === "fulfilled") {
      setBriefing(briefingResult.value);
      setBriefingError("");
    } else {
      setBriefingError(briefingResult.reason instanceof Error ? briefingResult.reason.message : "Unable to load briefing.");
    }

    if (appDataResult.status === "fulfilled") {
      newAppData = appDataResult.value;
      setAppData(newAppData);
      setAppError("");
    } else {
      setAppError(appDataResult.reason instanceof Error ? appDataResult.reason.message : "Unable to load app data.");
    }

    if (newAppData) {
      setViewportContext(prev => {
        if (!prev.data) return prev;
        
        // Sync static view data with fresh database records
        if (Array.isArray(prev.data)) {
          const updatedData = prev.data.map(item => {
            if (!item || !item.id) return item;
            
            if (prev.intent?.includes("goal")) {
              const found = newAppData!.goals.find(g => g.id === item.id);
              return found ? found : item;
            }
            if (prev.intent?.includes("project")) {
              const allProjects = newAppData!.goals.flatMap(g => g.projects || []);
              const found = allProjects.find(p => p.id === item.id);
              return found ? found : item;
            }
            if (prev.intent?.includes("task")) {
              const allTasks = [
                ...(newAppData!.tasks.inbox || []),
                ...(newAppData!.tasks.today || []),
                ...(newAppData!.tasks.open || []),
                ...(newAppData!.tasks.done || [])
              ];
              const found = allTasks.find(t => t.id === item.id);
              return found ? found : item;
            }
            if (prev.intent?.includes("habit")) {
              const found = newAppData!.habits.find(h => h.id === item.id);
              return found ? found : item;
            }
            return item;
          }).filter(item => {
            if (!item || !item.id) return true;
            if (prev.intent?.includes("goal")) {
              return newAppData!.goals.some(g => g.id === item.id);
            }
            if (prev.intent?.includes("project")) {
              const allProjects = newAppData!.goals.flatMap(g => g.projects || []);
              return allProjects.some(p => p.id === item.id);
            }
            if (prev.intent?.includes("task")) {
              const allTasks = [
                ...(newAppData!.tasks.inbox || []),
                ...(newAppData!.tasks.today || []),
                ...(newAppData!.tasks.open || []),
                ...(newAppData!.tasks.done || [])
              ];
              return allTasks.some(t => t.id === item.id);
            }
            if (prev.intent?.includes("habit")) {
              return newAppData!.habits.some(h => h.id === item.id);
            }
            return true;
          });
          
          return { ...prev, data: updatedData };
        }
        
        return prev;
      });
    }
  }

  async function handleAsk(message: string) {
    setPendingCommand(message);
  }

  async function handleConfirmProposal(proposalId: string) {
    await confirmProposal(proposalId);
    await loadAllData();
  }

  async function handleRejectProposal(proposalId: string) {
    await rejectProposal(proposalId);
    await loadAllData();
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

  async function handleUpdateSettings(settings: Partial<AppSettings>) {
    await updateSettingsApi(settings);
    await loadAllData();
  }

  function handleEditTask(task: ApiTask | null) {
    setEditingTask(task);
    setIsTaskEditorOpen(true);
  }

  async function handleSaveTask(taskData: any) {
    if (editingTask) {
      const response = await updateTaskApi(editingTask.id, taskData);
      if (!response.ok) {
        throw response;
      }
    } else {
      const response = await createTaskApi(taskData);
      if (!response.ok) {
        throw response;
      }
    }
    await loadAllData();
  }

  async function handleDeleteTask(taskId: string) {
    const response = await deleteTaskApi(taskId);
    if (!response.ok) {
      throw response;
    }
    await loadAllData();
  }

  async function handleCompleteReminder(reminderId: string) {
    await completeReminderApi(reminderId);
    await loadAllData();
  }

  async function handleSnoozeReminder(reminderId: string, minutes = 15) {
    await snoozeReminderApi(reminderId, minutes);
    await loadAllData();
  }

  return (
    <div className="app-shell cli-layout">
      {/* Top Portion: Visual Viewport */}
      <section className="cli-view-viewport">
        <header className="cli-viewport-header">
          <div className="cli-path-indicator">
            <span className="cli-path-symbol">⚡</span>
            <span>personal-os://{viewportContext.intent || "today"}</span>
          </div>
          <div className="cli-viewport-title">
            HelpMe OS Dashboard
          </div>
        </header>
        <div className="cli-viewport-content">
          {appData ? (
            <DynamicViewport
              intent={viewportContext.intent}
              data={viewportContext.data}
              appData={appData}
              onReloadData={loadAllData}
              onCommand={handleAsk}
              onEditTask={handleEditTask}
            />
          ) : (
            <div className="cli-loading-screen">
              {appError ? <span className="cli-error-text">{appError}</span> : <span>Đang khởi tạo dữ liệu SQLite & AI Agent...</span>}
            </div>
          )}
        </div>
      </section>

      {/* Bottom Portion: Command Console */}
      <CommandConsole
        onConfirmProposal={handleConfirmProposal}
        onRejectProposal={handleRejectProposal}
        onIntentResult={(intent, data) => setViewportContext({ intent, data })}
        activeIntent={viewportContext.intent}
        onReloadData={loadAllData}
        pendingCommand={pendingCommand}
        clearPendingCommand={() => setPendingCommand(null)}
      />

      {appData && (
        <TaskEditorModal
          task={editingTask}
          goals={appData.goals}
          isOpen={isTaskEditorOpen}
          onClose={() => setIsTaskEditorOpen(false)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}

