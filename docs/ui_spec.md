# HelpMe UI/UX Mockup Specification

## 1. Product Direction

HelpMe is an AI-first, local-first personal life admin app.

The app is not a traditional dashboard, not a Todoist clone, not a Notion dashboard, and not a calendar-first app.

The main idea is:

> The user should not need to inspect all tasks, deadlines, calendar events, and goals manually. HelpMe should analyze that information and show only what is useful right now.

The interface must reduce distraction. Most information should be collapsed by default. The user should only see the next useful decision unless they intentionally ask for more context.

Core philosophy:

```text
AI is the interface.
Dashboard is not the interface.
Show less by default.
Reveal details only when needed.
One screen should support one decision.
```

---

## 2. UX Principles

### 2.1 AI-first, not dashboard-first

The app should not open with many cards, statistics, task lists, deadline lists, charts, or calendars.

Instead, the app opens with a single AI briefing:

```text
I checked your goal, tasks, deadlines and free time.
The best thing to do now is...
```

The AI is responsible for reading and filtering the raw data.

---

### 2.2 Collapsed by default

Everything that is not immediately useful must be hidden by default.

Collapsed by default applies to:

```text
- Navigation
- Task lists
- Deadline lists
- Calendar details
- Activity log
- Context details
- Ask/chat surface
- Settings
```

The default screen should not expose raw data unless it directly supports the current decision.

---

### 2.3 Next Best Action

The main screen exists to answer one question:

```text
What should I do now?
```

The answer should be a concrete recommended action, not a list of options.

Example:

```text
Next Best Action:
Do a 90-minute focus block to finalize the HelpMe UX direction.
```

The recommended action should include minimal metadata:

```text
- Duration
- Linked goal
- Reason
- Deadline relevance
- Available time fit
```

---

### 2.4 Explain briefly, reveal details on demand

The main screen should include a short reason summary, but not a long explanation.

Good:

```text
This unlocks the Codex implementation phase. If this is not decided, the project may drift back into a normal todo/calendar app.
```

Bad:

```text
Long task list, full calendar, all deadlines, all metrics, and full AI reasoning.
```

Details must be available through a context drawer or the Ask overlay.

---

### 2.5 Orb as the only Ask entry point

There must not be:

```text
- A separate Ask tab
- A permanent Ask bar
- Multiple chat inputs
```

The AI Orb is the only global entry point for asking HelpMe something.

Interaction model:

```text
Click Orb
→ Ask overlay opens
→ User can type or speak
→ HelpMe answers or proposes an action
```

The Orb should be available globally from any screen.

---

### 2.6 Navigation is hidden behind a menu

The app should not show a full sidebar with visible tabs all the time.

Navigation should be collapsed into a single menu icon.

Clicking the menu icon reveals a dropdown list:

```text
Now
Review
Archive
Settings
```

The menu is not the main experience. It is only for navigation when needed.

---

## 3. Information Architecture

The app has four main sections:

```text
Now
Review
Archive
Settings
```

There is no permanent Ask tab. Ask is opened through the Orb.

---

## 4. Main Sections

### 4.1 Now

Now is the default screen.

Purpose:

```text
Show the AI briefing and the next best action.
```

Now should contain:

```text
- AI Context Scan Line
- AI Briefing / Main Decision
- Short Explanation
- Next Best Action card
- Reason / Risk Summary
- Maximum 3 action buttons
- Collapsed Summary
```

Now should not contain:

```text
- Full task list
- Full deadline list
- Full calendar
- Charts
- KPI grid
- Activity timeline
- Habit dashboard
- Goal dashboard
```

---

### 4.2 Review

Review is for daily, weekly, and goal-alignment reflection.

It should answer questions like:

```text
- What did I complete today?
- What was missed?
- Am I drifting away from my main goal?
- What should be adjusted tomorrow?
- What pattern is HelpMe noticing?
```

Review is not the default view.

---

### 4.3 Archive

Archive contains raw data.

Archive is where the user can inspect:

```text
- Tasks
- Deadlines
- Calendar
- Goals
- Habits
- AI activity log
```

Archive should be available but not prominent.

Archive exists because users sometimes need full visibility, but it should not compete with the Now screen.

---

### 4.4 Settings

Settings contains:

```text
- AI behavior
- Proactivity level
- Quiet hours
- Notification budget
- Local model configuration
- Visual mode
- Automation permissions
```

Settings should also be hidden behind the menu.

---

## 5. Global UI Elements

### 5.1 Menu Icon

Location:

```text
Top-left corner
```

Behavior:

```text
Click menu icon
→ dropdown opens
→ user can choose Now, Review, Archive, Settings
```

The menu dropdown should be hidden by default.

The menu should not be a persistent sidebar.

---

### 5.2 AI Status Pill

Location:

```text
Top-right corner
```

Purpose:

```text
Show HelpMe's current ambient state.
```

Examples:

```text
HelpMe is filtering context
HelpMe is watching deadlines
HelpMe is waiting quietly
HelpMe is preparing review
```

This should be small and non-distracting.

---

### 5.3 AI Orb

Location:

```text
Bottom-right corner
```

Purpose:

```text
The only global Ask entry point.
```

Behavior:

```text
Click Orb
→ Ask overlay opens
```

Visual style:

```text
- Small
- Calm
- Minimal
- Subtle breathing animation
- No 3D
- No particle effect
- No heavy animation
```

The Orb should feel alive, but not distracting.

---

### 5.4 Ask Overlay

Opened only from the Orb.

Purpose:

```text
Let the user ask HelpMe questions or give commands.
```

Ask overlay contains:

```text
- AI Orb / identity header
- Short description
- Suggested questions
- Input field
- Send button
```

Suggested questions can include:

```text
- Why did you choose this?
- What tasks are hidden?
- Am I drifting from my goal?
- What deadline is risky?
- What should I do if I only have 30 minutes?
```

The Ask overlay should not be visible by default.

---

### 5.5 Context Drawer

Opened only when the user asks for details.

Triggers:

```text
- Click Show hidden context
- Ask HelpMe for more context
- Ask why a recommendation was made
```

Context drawer contains:

```text
- North Star / Main Goal
- Hidden tasks summary
- Watched deadline summary
- Available time and constraints
- Relevant reason summary
```

The context drawer should not show everything. It should still summarize.

If the user wants full raw data, send them to Archive.

---

## 6. Now Screen Layout

The Now screen should be visually centered and calm.

Recommended structure:

```text
Top-left: collapsed menu icon
Top-right: AI status pill

Center:
  AI briefing card

Bottom-right:
  Floating AI Orb

Optional:
  Context drawer only when opened
  Ask overlay only when opened
```

The main AI briefing card contains:

```text
1. AI Context Scan Line
2. AI Briefing / Main Decision
3. Short Explanation
4. Next Best Action
5. Reason / Risk Summary
6. Action buttons
7. Collapsed Summary
```

---

## 7. Now Screen Content Blocks

### 7.1 AI Context Scan Line

Purpose:

```text
Tell the user what HelpMe has already checked.
```

Example content:

```text
I checked your goal, tasks, deadlines and free time.
```

Data sources represented here:

```text
- Goals
- Tasks
- Deadlines
- Calendar
- Free time
- Habits
- Energy state, if available
```

---

### 7.2 AI Briefing / Main Decision

Purpose:

```text
Show the most important conclusion from HelpMe.
```

Example:

```text
The best thing to do now is to finalize the HelpMe UX direction.
```

This should be the largest text on the screen.

It must not be a list.

---

### 7.3 Short Explanation

Purpose:

```text
Explain the conclusion in one short paragraph.
```

Example:

```text
I hid the other tasks because they do not directly unlock the next phase. Completing this lets you write the Codex spec and start the real prototype.
```

This should be concise and should not expose all raw data.

---

### 7.4 Next Best Action

Purpose:

```text
Translate AI's conclusion into a concrete action.
```

Example:

```text
Do a 90-minute focus block to finalize Now + Review + Archive.
```

Metadata:

```text
- Duration
- Linked goal
- Deadline relevance
- Fit with available time
```

---

### 7.5 Reason / Risk Summary

Purpose:

```text
Give the user confidence in the AI decision.
```

Example:

```text
Reason: If HelpMe still becomes a dashboard, it does not use AI meaningfully.
Risk: The project may drift into a normal todo/calendar app.
```

This is not a chain-of-thought. It is a short user-facing decision summary.

---

### 7.6 Action Buttons

Maximum 3 visible actions.

Recommended actions:

```text
Start focus
Show hidden context
Choose another task
```

Rules:

```text
- The primary action should be visually strongest.
- Do not show more than 3 actions.
- Do not expose advanced actions on the main screen.
```

---

### 7.7 Collapsed Summary

Purpose:

```text
Tell the user that details exist, but do not show them.
```

Example:

```text
5 tasks hidden · 1 deadline watched · Archive collapsed
```

This reassures the user that HelpMe is tracking things without forcing them to inspect everything.

---

## 8. Placeholder Wireframe Meaning

The placeholder wireframe uses labeled blocks instead of fake data.

Each placeholder indicates what kind of real data should appear there later.

### Placeholder list

#### AI Context Scan Line

Contains:

```text
A short statement of what HelpMe has checked.
```

#### AI Briefing / Main Decision

Contains:

```text
The main AI conclusion.
```

#### Short Explanation

Contains:

```text
Why this conclusion matters.
```

#### Next Best Action

Contains:

```text
The concrete action HelpMe recommends.
```

#### Action Metadata

Contains:

```text
Duration, priority, linked goal, available time, deadline relation.
```

#### Reason / Risk Summary

Contains:

```text
Short explanation of why the action matters and what happens if ignored.
```

#### Collapsed Summary

Contains:

```text
Count or summary of hidden data.
```

#### Context Drawer

Contains:

```text
Summarized supporting context.
```

#### Ask Overlay

Contains:

```text
Input surface for interacting with HelpMe.
```

#### Menu Dropdown

Contains:

```text
Collapsed navigation.
```

---

## 9. Visual Design Direction

The mockup uses a very minimal style.

Design direction:

```text
- Mostly monochrome
- Warm neutral background
- Low contrast panels
- Dashed borders for placeholders
- Minimal card count
- No colorful dashboard
- No KPI grid
- No chart
- No sidebar
- No permanent AI panel
```

Animation direction:

```text
- Only the Orb has subtle breathing animation.
- No 3D.
- No canvas.
- No WebGL.
- No particles.
- No Lottie.
```

The visual design should help the user focus, not entertain the user.

---

## 10. Interaction Rules

### 10.1 Default state

When the app opens:

```text
- Menu dropdown is closed.
- Context drawer is closed.
- Ask overlay is closed.
- Only Now screen is visible.
- Floating Orb is visible.
- AI status pill is visible.
```

The current mockup may show dropdown/drawer/overlay open to demonstrate structure, but the real implementation must hide them by default.

---

### 10.2 Menu interaction

```text
Click menu icon
→ show dropdown
Click outside
→ close dropdown
Select item
→ navigate and close dropdown
```

---

### 10.3 Orb interaction

```text
Click Orb
→ open Ask overlay
Click outside or press Escape
→ close Ask overlay
```

---

### 10.4 Context interaction

```text
Click Show hidden context
→ open context drawer
Click outside or press Escape
→ close context drawer
```

---

### 10.5 Action confirmation

Any important change must require confirmation.

Examples requiring confirmation:

```text
- Reschedule tasks
- Move deadline
- Hide task from Now
- Change current goal
- Auto-create tasks
```

Safe actions:

```text
- Start focus
- Open context
- Ask why
- Show archive
```

---

## 11. Functional Role of AI

HelpMe's AI must perform four core functions:

```text
1. Filter
2. Prioritize
3. Explain
4. Act after confirmation
```

### 11.1 Filter

The AI hides irrelevant or low-priority information by default.

### 11.2 Prioritize

The AI selects the next best action based on:

```text
- Main goal
- Deadlines
- Task priority
- Available time
- Estimated effort
- Dependencies
- User focus state
```

### 11.3 Explain

The AI gives a short reason summary.

### 11.4 Act after confirmation

The AI can suggest changes, but important changes require user confirmation.

---

## 12. Data Needed by the AI

To generate the Now screen, HelpMe needs:

```text
- Current time
- User's main goal
- Current milestone
- Open tasks
- Deadlines
- Calendar events
- Available time
- Estimated task duration
- Priority
- Task dependencies
- User settings
- Quiet hours
- Proactivity level
```

---

## 13. Output Expected from AI Planner

The AI planner should produce structured output similar to:

```json
{
  "context_scan_line": "I checked your goal, tasks, deadlines and free time.",
  "main_decision": "The best thing to do now is to finalize the HelpMe UX direction.",
  "short_explanation": "I hid other tasks because they do not unlock the next phase.",
  "next_best_action": {
    "title": "Do a 90-minute focus block to finalize Now + Review + Archive.",
    "duration_minutes": 90,
    "linked_goal": "Build HelpMe AI life admin",
    "priority": "high"
  },
  "reason_summary": "This decision prevents the product from becoming a normal dashboard app.",
  "risk_summary": "If ignored, the project may drift into a todo/calendar clone.",
  "collapsed_summary": {
    "hidden_tasks": 5,
    "watched_deadlines": 1,
    "mode": "focus-first"
  },
  "suggested_actions": [
    {
      "label": "Start focus",
      "type": "start_focus",
      "requires_confirmation": false
    },
    {
      "label": "Show hidden context",
      "type": "open_context_drawer",
      "requires_confirmation": false
    },
    {
      "label": "Choose another task",
      "type": "choose_alternative",
      "requires_confirmation": false
    }
  ]
}
```

---

## 14. Implementation Notes for Codex

When implementing this mockup:

```text
- Start with static UI first.
- Use placeholder components before real data.
- Keep components minimal.
- Do not add a dashboard grid.
- Do not add a permanent sidebar.
- Do not add a permanent Ask page.
- Do not add a permanent right AI panel.
- Do not show raw task/deadline/calendar data on Now.
- Use the Orb as the global ask entry point.
- Use the menu icon as the only visible navigation entry point.
- Keep drawer and overlay closed by default.
```

Recommended components:

```text
AppShell
TopBar
MenuButton
MenuDropdown
NowScreen
AIBriefCard
NextBestActionCard
CollapsedSummary
ContextDrawer
AskOrb
AskOverlay
StatusPill
```

---

## 15. Final UX Summary

The intended experience is:

```text
User opens HelpMe.
HelpMe has already checked the context.
HelpMe shows one clear decision.
User can start, ask why, or reveal hidden context.
Everything else stays collapsed until needed.
```

The app should make the user feel:

```text
I do not need to inspect my life manually.
HelpMe has already filtered the noise.
I only need to make the next small decision.
```

This is the core UX direction.
