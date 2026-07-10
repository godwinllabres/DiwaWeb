# ⚠️ This repository is frozen — development moved to DiwaWeb

**As of 2026-07-10, `DiwaWeb` is the canonical frontend repository.**
SeviWeb and DiwaWeb shared identical history up to `0cd1116` (widget iframe
fix); everything after that lands in DiwaWeb only.

## Why

- DiwaWeb carries the production deployment (GitHub Pages workflow,
  `godwincreates.net` CNAME, `widget.js` embed for cvsu.edu.ph) and the
  active connector/envelope work.
- Keeping two mirrored repositories means every push must happen twice;
  the resulting drift has already cost cleanup time.

## If your checkout points here (e.g., the office machine)

Re-point it — no history is lost, the repos are identical:

```bash
git remote set-url origin <DiwaWeb remote URL>
git fetch origin
git status   # should be clean; branch continues seamlessly
```

Do not push new work to the SeviWeb remote. Once all machines are
re-pointed, archive the GitHub repository (Settings → Archive, or
`gh repo archive`) so accidental pushes are impossible.
