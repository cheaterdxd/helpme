import { Clock3, FolderKanban, Sparkles, SquareCheckBig, Target } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { GoalOption, NowBriefing, ProjectOption, TaskOption } from "../types";
import { LoadingState, ErrorState } from "./UIFeedback";

type NowScreenProps = {
  briefing: NowBriefing | null;
  error: string;
};

export function NowScreen({ briefing, error }: NowScreenProps) {
  const [selectedGoalId, setSelectedGoalId] = useState<string | null | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null | undefined>(undefined);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null | undefined>(undefined);

  const defaultPath = useMemo(() => {
    if (!briefing) return null;

    return {
      goalId: briefing.focus_path.goal.id,
      projectId: briefing.focus_path.project?.id ?? null,
      taskId: briefing.focus_path.task.id
    };
  }, [briefing]);

  if (error) {
    return (
      <ErrorState
        kicker="Now"
        title="HelpMe could not load the briefing."
        error={error}
      />
    );
  }

  if (!briefing || !defaultPath) {
    return (
      <LoadingState
        kicker="Now"
        title="HelpMe is reading your operating context."
        body="Preparing the next useful action."
      />
    );
  }

  const activeGoalId = selectedGoalId === undefined ? defaultPath.goalId : selectedGoalId;
  const activeProjectId = selectedProjectId === undefined ? defaultPath.projectId : selectedProjectId;
  const activeTaskId = selectedTaskId === undefined ? defaultPath.taskId : selectedTaskId;
  const activeGoal = briefing.selection_tree.goals.find((goal) => goal.id === activeGoalId) ?? null;
  const activeProject = activeGoal?.projects.find((project) => project.id === activeProjectId) ?? null;

  function handleGoalScroll() {
    setSelectedGoalId(null);
    setSelectedProjectId(null);
    setSelectedTaskId(null);
  }

  function handleProjectScroll() {
    setSelectedProjectId(null);
    setSelectedTaskId(null);
  }

  return (
    <section className="now-screen" aria-label="Now">
      <div className="now-board">
        <header className="now-board-header">
          <div>
            <p className="now-kicker">
              <Sparkles aria-hidden="true" size={16} />
              <span>Now</span>
            </p>
            <h1>Choose the next useful action</h1>
          </div>
        </header>

        <div className="selection-board" aria-label="Goal project task selector">
          <SelectionColumn title="Goal" icon={<Target aria-hidden="true" size={18} />} onScroll={handleGoalScroll} emptyText="">
            {briefing.selection_tree.goals.map((goal) => (
              <GoalButton
                key={goal.id}
                goal={goal}
                active={goal.id === activeGoalId}
                onClick={() => {
                  setSelectedGoalId(goal.id);
                  setSelectedProjectId(null);
                  setSelectedTaskId(null);
                }}
              />
            ))}
          </SelectionColumn>

          <SelectionColumn
            title="Project"
            icon={<FolderKanban aria-hidden="true" size={18} />}
            onScroll={handleProjectScroll}
            emptyText="Select a goal"
          >
            {activeGoal?.projects.map((project) => (
              <ProjectButton
                key={project.id}
                project={project}
                active={project.id === activeProjectId}
                onClick={() => {
                  setSelectedProjectId(project.id);
                  setSelectedTaskId(null);
                }}
              />
            ))}
          </SelectionColumn>

          <SelectionColumn title="Task" icon={<SquareCheckBig aria-hidden="true" size={18} />} emptyText="Select a project">
            {activeProject?.tasks.map((task) => (
              <TaskButton key={task.id} task={task} active={task.id === activeTaskId} onClick={() => setSelectedTaskId(task.id)} />
            ))}
          </SelectionColumn>
        </div>
      </div>
    </section>
  );
}

function SelectionColumn({
  title,
  icon,
  children,
  emptyText,
  onScroll
}: {
  title: string;
  icon: ReactNode;
  children?: ReactNode;
  emptyText: string;
  onScroll?: () => void;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <section className="selection-column">
      <header className="selection-column-header">
        <span>{icon}</span>
        <strong>{title}</strong>
      </header>

      <div className="selection-list" onScroll={onScroll}>
        {hasChildren ? children : <div className="empty-column">{emptyText}</div>}
      </div>
    </section>
  );
}

function GoalButton({ goal, active, onClick }: { goal: GoalOption; active: boolean; onClick: () => void }) {
  return (
    <button className="selection-item" data-active={active} type="button" onClick={onClick}>
      <Target aria-hidden="true" size={18} />
      <span>{goal.title}</span>
    </button>
  );
}

function ProjectButton({ project, active, onClick }: { project: ProjectOption; active: boolean; onClick: () => void }) {
  return (
    <button className="selection-item" data-active={active} type="button" onClick={onClick}>
      <FolderKanban aria-hidden="true" size={18} />
      <span>{project.title}</span>
    </button>
  );
}

function TaskButton({ task, active, onClick }: { task: TaskOption; active: boolean; onClick: () => void }) {
  return (
    <button
      className="selection-item task-item"
      data-active={active}
      data-recommended={task.ai_recommended}
      type="button"
      onClick={onClick}
    >
      <SquareCheckBig aria-hidden="true" size={18} />
      <span>{task.title}</span>
      <small>
        <Clock3 aria-hidden="true" size={13} />
        {task.duration_minutes}'
      </small>
    </button>
  );
}
