# Specification: Unified CLI Control Interface for HelpMe

This specification outlines the design and implementation details for rebuilding the main HelpMe screen into a unified CLI-centric interface, replacing the legacy multi-route dashboard.

## 1. Core Architecture

The layout is a vertical split screen, divided into two primary sections:

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│                     TOP PORTION                        │
│            Visual Viewport (Active React Screen)       │
│    (Calendar, Tasks, Habits, Goals, Today Summary)     │
│                                                        │
├────────────────────────────────────────────────────────┤
│                 BOTTOM PORTION (Console)               │
│   ┌────────────────────────────────────────────────┐   │
│   │  Chat Log (AI Answers, Proposal Cards)         │   │
│   └────────────────────────────────────────────────┘   │
│   HelpMe › [ Command Input                      ] [Send]│
└────────────────────────────────────────────────────────┘
```

1. **Top Portion: Visual Viewport (`cli-view-viewport`)**
   * Occupies approximately 65-70% of the vertical screen height.
   * Renders the active rich React screen component (e.g., Today view, Calendar, Tasks, Habits, Goals, Settings).
   * Transitions smoothly between views when the active screen state changes (triggered by commands or AI intents).

2. **Bottom Portion: Interactive Console (`cli-control-console`)**
   * Occupies approximately 30-35% of the vertical screen height.
   * Contains a scrolling history log displaying user prompts, AI explanations, errors, and **Action Proposal Cards** (with Confirm/Reject triggers).
   * Features a command bar with a prompt label (`HelpMe ›`), an input field, and a submit button.

---

## 2. Interaction Flow & Command Handlers

### Command Input
The user inputs either a slash command (e.g., `/calendar`, `/tasks`) or a natural language command (e.g., *"lên kế hoạch học tập tối nay"*).

### Slash Commands
Slash commands bypass the Ollama LLM intent parser for speed, modifying the active screen state directly:
* `/today` or `/now` -> Set top viewport to `today` (combination of timeline, overload, and next task).
* `/tasks` or `/inbox` -> Set top viewport to `tasks` list.
* `/calendar` -> Set top viewport to `calendar` events & time blocks.
* `/deadlines` -> Set top viewport to `deadlines` radar.
* `/goals` -> Set top viewport to `goals` & projects.
* `/habits` -> Set top viewport to `habits` dashboard.
* `/settings` -> Set top viewport to `settings` panel.
* `/review` -> Set top viewport to `review` history & entry.
* `/clear` -> Clears the bottom console chat log.
* `/help` -> Outputs a help block in the bottom console chat log showing available commands.

### Natural Language AI Commands
When the user chats normally:
1. A loading status indicator appears in the bottom console chat log.
2. The AI intent parser handles the command.
3. The response is outputted to the bottom console chat log.
4. **Context-Aware Screen Transitions:** If the parsed intent relates to a specific domain, the top portion transitions to show that screen:
   * Intent `plan_day`, `create_time_block`, `create_event` -> Switch top view to `calendar`.
   * Intent `create_task`, `reschedule_task`, `breakdown_task`, `organize_inbox` -> Switch top view to `tasks`.
   * Intent `create_goal`, `create_project`, `breakdown_goal` -> Switch top view to `goals`.
   * Intent `deadline_radar`, `create_deadline` -> Switch top view to `deadlines`.
   * Intent `list_habits` -> Switch top view to `habits`.
   * Intent `daily_review` -> Switch top view to `review`.
5. If the AI returns a **proposal**, it renders a Proposal Card with inline Confirm/Reject buttons in the console. Confirming the proposal triggers a reload of the database, updating the visual view immediately.

---

## 3. UI/UX and Aesthetic Design

* **Color Scheme:** Deep dark console aesthetic using HSL tail-colors, glassmorphic panels, and neon glow accents (`--accent` and `--ai-highlight`).
* **Viewport Transitions:** Smooth CSS animations (such as fade-in and slide-up) when shifting between active screen states.
* **Layout Integrity:** The split screen is fixed to the viewport height (`100vh`) to prevent vertical page scrolling, containing scrollbars strictly within the top viewport and bottom console individually.
