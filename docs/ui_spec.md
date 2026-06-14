# HelpMe Minimalist Flat Dark Mode UI Specification

This specification outlines the redesign of the HelpMe interface to adopt a **Minimalist Flat Dark Mode** theme. The system is designed to provide a premium, cohesive, distraction-free environment that is easy to read and highly performant.

---

## 1. Cohesive Dark Color System & Typography

The interface uses a consistent, luxury slate dark color palette with high-contrast, modern accents.

### Color Variables (`src/styles.css`)

```css
:root {
  color-scheme: dark;
  
  /* Background & Panels */
  --bg: #090d16;              /* Midnight Slate Dark */
  --panel: #111827;           /* Slate Dark / Deep Gray */
  --panel-soft: #1f2937;      /* Subtle lighter gray for active elements */
  
  /* Ink (Text) */
  --ink: #f9fafb;             /* High contrast white */
  --muted: #9ca3af;           /* Muted Gray */
  --soft: #6b7280;            /* Medium Gray */
  
  /* Borders and Dividers */
  --line: #374151;            /* Slate 700 / Dark border line */
  --line-strong: #4b5563;     /* Active border line */
  
  /* Accent States */
  --accent: #0284c7;          /* Sky Blue - primary action */
  --accent-2: #6366f1;        /* Indigo - secondary action */
  --warning: #f59e0b;         /* Amber - upcoming / warning */
  --danger: #ef4444;          /* Red - overdue / urgent */
  --success: #10b981;         /* Green - done / success */
  
  /* AI/Oracular Highlight */
  --ai-highlight: #d9f99d;    /* Soft lime green highlight */
  --ai-highlight-line: #a3e635;
  
  /* Shadows and Rounding */
  --shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
  --radius: 8px;              /* Consistent border radius */
  --control: 40px;
}
```

### Typography
- **Google Fonts Inter:** Primary sans-serif font for UI elements, text, and headings.
- **Google Fonts JetBrains Mono:** Monospaced font for code, logs, timers, statistics, and system states.

---

## 2. Layout and Styling Guidelines

All components adopt a clean, flat aesthetic with minimal dividers and soft drop shadows to distinguish layering.

### Cards (`.viewport-card`, `.viewport-row-item`)
- Thin border: `1px solid var(--line)`.
- Background: `var(--panel)`.
- Shadow: `var(--shadow)` for active state.
- Flat transitions: Hover effects should be subtle and smooth.
  ```css
  .viewport-card:hover {
    border-color: var(--line-strong);
    background: var(--panel-soft);
  }
  ```

### Inputs & Buttons
- Inputs use a dark background (`var(--bg)`), light text, and sky blue borders on focus.
- Buttons have clear hover states with subtle background changes, keeping the flat look.

---

## 3. Today View Restructure

The Today View serves as a clean "command console" containing:
1. **Header Brief:** Greeting, current date, and quick stats.
2. **Suggested Focus:** Renders the primary recommended task in a highly visible card.
3. **Alternatives:** Lists other top recommendations in a clean, vertical format below the focus card.
4. **Timeline Flow:** A simplified chronological feed of today's schedule, calendar events, and time blocks.
