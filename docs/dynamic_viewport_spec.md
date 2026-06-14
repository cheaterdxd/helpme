# Specification: Dynamic Viewport & Font Customization

This specification outlines the redesign of the HelpMe interface to replace route-based page layouts with a unified dynamic card-based viewport, and customize the typography for full Vietnamese language compatibility.

## 1. Typography and Formatting (Vietnamese Support)

To prevent text formatting and alignment breakage when displaying and inputting Vietnamese:
* Import Google Fonts **Inter** (for UI controls, cards, and headings) and **JetBrains Mono** (for monospace console text logs and signposts).
* Set global fallbacks to ensure Unicode characters are rendered consistently across different OS devices (Windows/Mac/Linux).

## 2. Dynamic Viewport Architecture

We will eliminate the routing system (`activeRoute` and `RoutePanel.tsx`). Instead, the top portion (`cli-view-viewport`) will act as a **dynamic result canvas** that renders cards representing the latest data context.

```
┌────────────────────────────────────────────────────────┐
│  ⚡ personal-os://viewport                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │  [Goal Card: Learn AWS]  [Goal Card: Read Book]  │  │
│  │  - Progress: 60%          - Progress: 20%         │  │
│  │  - [New Project] [Delete] - [New Project] [Delete]│  │
│  └──────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────┤
│  HelpMe › [ Input Command                             ]│
└────────────────────────────────────────────────────────┘
```

### State Management
In `App.tsx`, we will introduce a state `viewportContext`:
```typescript
type ViewportContext = {
  intent: string;
  data: any;
};
```
* Executing a command updates `viewportContext` with the intent and returned data (e.g. `list_goals` sets intent to `list_goals` and data to the goals array).
* If `viewportContext` is null or the intent is `now` / `today`, the viewport displays a **Unified Today Feed** combining active cards from tasks, time blocks, habits, and goals.

---

## 3. Dynamic Card Elements & Interaction Triggers

Each data entity has a dedicated React card component rendering its specific status metrics and inline action buttons.

### Goal Cards (`GoalCard`)
* **Data:** Title, status, progress %, North Star indicator, projects list.
* **Actions:**
  * **Edit Goal:** Opens the goal editor modal.
  * **Add Project:** Opens the project creator modal linked to this goal.
  * **Delete Goal:** Immediately triggers `deleteGoal` and reloads.

### Project Cards (`ProjectCard`)
* **Data:** Title, status, priority, goal name, task counts (e.g., "2 open / 4 done").
* **Actions:**
  * **Edit Project**
  * **Add Task:** Opens the task editor modal linked to this project.
  * **Delete Project**

### Task Cards (`TaskCard`)
* **Data:** Title, status (inbox, todo, doing, done), priority, scheduled start time, goal/project labels.
* **Actions:**
  * **Complete / Reopen:** Direct toggle between done and open status.
  * **Snooze/Reschedule:** Quick offset buttons (+15m, +1h, tomorrow).
  * **Breakdown Task:** Triggers the AI breakdown handler to split the task.
  * **Delete Task**

### Habit Cards (`HabitCard`)
* **Data:** Title, streak count, frequency, logged status today.
* **Actions:**
  * **Log Today:** Marks the habit as completed for today (adds log, updates streak).
  * **Delete Habit**

### Deadline Cards (`DeadlineCard`)
* **Data:** Title, due date, severity (high/medium/low), goal/project associations.
* **Actions:**
  * **Edit / Delete Deadline**

---

## 4. Implementation Plan

1. **Update `src/styles.css`:** Import fonts, replace global font family declarations, and define styles for the dynamic cards and feed container.
2. **Revert navigation routes in `src/navigation.ts`:** Simplify routes since navigation is context-driven now.
3. **Build `src/components/DynamicViewport.tsx`:** Implement the main results canvas and the collection of interactive card components.
4. **Update `src/App.tsx`:** Wire `viewportContext` into the app shell and connect the action triggers to the reload routine.
5. **Clean up `src/components/RoutePanel.tsx`:** Remove the legacy tab panels to reduce bundle size and code clutter.
