<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Repo-Local Skills

This repo has a local `skills/` folder. Treat these as project-scoped skills only; do not assume they are installed globally or available in other repositories.

Use them when the request matches the skill:
- `taste-skill`: premium frontend taste and anti-template visual direction.
- `bencium-impact-designer`: distinctive production UI design for web components, pages, and apps.
- `refactoring-ui`: Wondelai visual hierarchy, spacing, color, depth, and component polish.
- `ux-heuristics`: Wondelai usability and heuristic evaluation.
- `top-design`: Wondelai premium/agency-quality web design patterns.
- `wcag-accessibility-audit`: WCAG 2.1/2.2 accessibility audit and remediation guidance.

Before using a local skill, read its `skills/<skill-name>/SKILL.md` file and only load referenced files when needed.
