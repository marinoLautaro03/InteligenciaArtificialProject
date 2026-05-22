---
name: project-responsive-breakpoints
description: Canonical mobile breakpoints established across all frontend CSS files
metadata:
  type: project
---

The project uses a single canonical mobile breakpoint of `max-width: 768px` across all page-level CSS files. This was established during the responsive design branch (branch: responsive-design).

Breakpoint inventory:
- `shell.css`: 768px (app grid, sidebar slide-out)
- `LoginPage.css`: 768px (primary), 900px (intermediate layout)
- `ProjectGallery.css`: 768px (gallery-intro collapse)
- `Generator.css`: 768px (gen-grid collapse, result-panel min-height removal)

**Why:** Consistency across the shell and all page layouts so the mobile sidebar toggle and page content collapse at the same viewport width.

**How to apply:** Any new page-level CSS that needs a mobile layout override should default to `max-width: 768px`. Deviations (like the 900px in LoginPage.css) require explicit justification.
