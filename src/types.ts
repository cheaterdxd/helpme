export type SuggestedAction = {
  label: string;
  action_type: "start_focus" | "open_context_drawer" | "choose_alternative";
  requires_confirmation: boolean;
};

export type NowBriefing = {
  context_scan_line: string;
  main_decision: string;
  short_explanation: string;
  selection_tree: {
    goals: GoalOption[];
  };
  focus_path: {
    goal: {
      id: string;
      title: string;
    };
    project?: {
      id: string;
      title: string;
    };
    task: {
      id: string;
      title: string;
    };
  };
  next_best_action: {
    type: "task";
    title: string;
    task_id: string;
    duration_minutes: number;
    linked_goal: string;
    metadata: {
      priority: string;
      fits_available_time: boolean;
      deadline_relation: string;
    };
  };
  reason_summary: string;
  risk_summary: string;
  collapsed_summary: {
    hidden_tasks_count: number;
    watched_deadlines_count: number;
    open_tasks_count: number;
    mode: string;
  };
  context_summary: {
    north_star: string;
    hidden_tasks: string;
    watched_deadline: string;
    available_time: string;
  };
  suggested_actions: SuggestedAction[];
  suggested_questions: string[];
  planner?: {
    mode: string;
    selected_task_id: string | null;
    score_breakdown: PlannerScoreBreakdown | null;
    alternatives: PlannerAlternative[];
  };
};

export type GoalOption = {
  id: string;
  title: string;
  projects: ProjectOption[];
};

export type ProjectOption = {
  id: string;
  title: string;
  tasks: TaskOption[];
};

export type TaskOption = {
  id: string;
  title: string;
  duration_minutes: number;
  fits_available_time: boolean;
  ai_recommended: boolean;
};

export type AskResponse = {
  mode?: "answer" | "proposal";
  answer: string;
  intent: string;
  related_context?: {
    linked_goal: string;
    hidden_tasks_count: number;
  } | Record<string, unknown>;
  proposal?: AiActionProposal;
  suggested_actions?: Array<{
    label: string;
    action_type: string;
    requires_confirmation: boolean;
  }>;
};

export type InboxOrganizationAction = {
  task_id: string;
  title: string;
  from_status: string;
  target_status: string;
  group: "learning" | "project" | "personal" | string;
  group_label: string;
  goal_id: string;
  goal_title: string | null;
  project_id: string | null;
  project_title: string | null;
  priority: number;
  estimated_minutes: number;
  reason: string;
};

export type ApiTask = {
  id: string;
  goal_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: "inbox" | "todo" | "doing" | "in_focus" | "open" | "done" | "cancelled";
  priority: number;
  estimated_minutes: number | null;
  due_at: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  goal_title?: string | null;
  project_title?: string | null;
};

export type FocusSession = {
  id: string;
  task_id: string | null;
  title: string;
  start_at: string | null;
  end_at: string | null;
  duration_minutes: number;
  status: "planned" | "active" | "completed" | "cancelled";
  task_title?: string | null;
  task_status?: string | null;
  goal_title?: string | null;
  project_title?: string | null;
};

export type TodayData = {
  date: string;
  greeting: string;
  summary: {
    due_today: number;
    overdue: number;
    events_today: number;
    inbox_count: number;
    open_tasks: number;
    planned_minutes: number;
    available_minutes: number;
  };
  suggested_focus: null | {
    task_id: string;
    title: string;
    duration_minutes: number;
    score: number;
    reason: string;
    score_breakdown: PlannerScoreBreakdown;
    risk_summary: string;
    fit_label: string;
    goal_title?: string | null;
    project_title?: string | null;
  };
  focus_session: FocusSession | null;
  planner: {
    mode: string;
    selected_task_id: string | null;
    reason_summary: string;
    risk_summary: string;
    alternatives: PlannerAlternative[];
  };
  overload: {
    level: "clear" | "watch" | "high";
    planned_minutes: number;
    available_minutes: number;
    open_estimated_minutes: number;
    message: string;
    suggestions: string[];
  };
  timeline: Array<{
    id: string;
    title: string;
    type: string;
    start: string;
    end: string;
    task_id: string | null;
    source: string;
    status: string;
  }>;
};

export type PlannerScoreBreakdown = {
  deadline_urgency: number;
  user_priority: number;
  effort_fit: number;
  goal_importance: number;
  overdue_penalty: number;
  scheduled_today: number;
  dependency_unlock: number;
};

export type PlannerAlternative = {
  task_id: string;
  title: string;
  score: number;
  reason: string;
};

export type TaskCollections = {
  inbox: ApiTask[];
  today: ApiTask[];
  open: ApiTask[];
  done: ApiTask[];
};

export type CalendarData = {
  mode: "day";
  date: string;
  events: Array<{
    id: string;
    title: string;
    start_at: string;
    end_at: string;
    source: string;
    linked_task_id: string | null;
  }>;
  time_blocks: Array<{
    id: string;
    title: string;
    start_at: string;
    end_at: string;
    type: string;
    status: string;
    task_id: string | null;
  }>;
  free_windows: Array<{
    id: string;
    start: string;
    end: string;
    label: string;
  }>;
};

export type DeadlineRadar = Record<"overdue" | "today" | "this_week" | "later", Array<{
  id: string;
  title: string;
  due_at: string;
  severity: string;
  status: string;
  task_title?: string | null;
  goal_title?: string | null;
  urgency_score: number;
}>>;

export type HabitData = Array<{
  id: string;
  title: string;
  frequency: string;
  target_count: number;
  streak: number;
  logged_count: number;
  completion_rate: number;
  insight: string;
}>;

export type GoalsData = Array<{
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  is_north_star: number;
  progress: number;
  projects: Array<{
    id: string;
    title: string;
    status: string;
    priority: number;
    tasks: ApiTask[];
  }>;
}>;

export type ReviewData = {
  date: string;
  prompt: string;
  completed: ApiTask[];
  unfinished: ApiTask[];
  energy_check: {
    value: string;
    label: string;
  };
  reschedule_suggestion: Array<{
    task_id: string;
    title: string;
    suggested_start: string;
    suggested_end: string;
    duration_minutes: number;
    reason: string;
    free_window_id?: string;
  }>;
  reschedule_validation: {
    policy: string;
    requested_window: {
      start_time: string;
      end_time: string;
    };
    day_plans: Array<{
      date: string;
      free_windows: Array<{
        id: string;
        start: string;
        end: string;
        label: string;
        minutes: number;
      }>;
      blocked_intervals: Array<{
        id: string;
        title: string;
        type: string;
        start: string;
        end: string;
        source: string;
      }>;
      scheduled: Array<{
        task_id: string;
        title: string;
        suggested_start: string;
        suggested_end: string;
        duration_minutes: number;
      }>;
    }>;
    conflict_count: number;
    scheduled_tasks: number;
    scheduled_minutes: number;
    unscheduled_task_ids: string[];
  };
  habit_insights: HabitData;
  summary: string;
};

export type AiStatus = {
  provider: string;
  ok: boolean;
  online: boolean;
  model: string;
  configured_model: string;
  base_url: string;
  fallback_mode: string;
  setup_hint: string;
  latency_ms: number;
  models?: string[];
  model_available?: boolean;
  error?: string | null;
};

export type AiActionProposal = {
  id: string;
  intent: string;
  title: string;
  summary: string;
  payload: Record<string, unknown> & {
    actions?: InboxOrganizationAction[];
  };
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
};

export type AppData = {
  today: TodayData;
  tasks: TaskCollections;
  calendar: CalendarData;
  deadlines: DeadlineRadar;
  habits: HabitData;
  goals: GoalsData;
  review: ReviewData;
  aiStatus: AiStatus;
};
