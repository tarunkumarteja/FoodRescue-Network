# Development Rules & Collaboration Guidelines

## 1. Agreed Technology Stack

All team members must adhere strictly to the chosen technology stack:

- **Frontend:** React + Vite + JavaScript
- **Styling:** Tailwind CSS
- **Backend:** Python + Django REST Framework (DRF)
- **Database:** PostgreSQL
- **Authentication:** JWT (JSON Web Tokens) using `djangorestframework-simplejwt`
- **Source Control & Collaboration:** GitHub
- **Coding Environment:** Visual Studio Code (VS Code)
- **AI Coding Assistant:** Antigravity

---

## 2. Git Workflow & Collaboration Rules

To ensure smooth collaboration among all 3 team members and maintain a clean project history:

### 2.1. Branching Strategy
- **`main` is protected:** No direct commits or pushes to `main`. The `main` branch must always remain in a working, deployable state.
- **Feature Branches:** All work must be conducted in dedicated feature branches branched off the latest `main`.
  - Naming convention:
    - `feature/<developer-name>-<short-description>` (e.g., `feature/member-1-auth`)
    - `bugfix/<developer-name>-<short-description>`
    - `docs/<developer-name>-<short-description>`

### 2.2. Synchronization & Commits
- **Pull latest `main` frequently:** Before starting any new task and before opening a Pull Request, pull the latest changes from `main` to prevent drift:
  ```bash
  git checkout main
  git pull origin main
  git checkout <your-feature-branch>
  git merge main   # or git rebase main
  ```
- **Meaningful, Atomic Commits:** Write clear commit messages summarizing what was changed and why. Prefer Conventional Commits format:
  - `feat: add user authentication endpoints`
  - `fix: correct token expiration calculation`
  - `docs: update proposed reservation API contract`

### 2.3. Pull Requests & Code Review
- **Push branches to GitHub:** Push your feature branch to the remote repository.
- **Open a Pull Request (PR):** Describe the purpose of the changes, relevant documentation, and instructions for how to test.
- **Mandatory Peer Review:** Every PR must be reviewed and approved by at least one other team member before merging into `main`.
- **No force pushes:** Never force-push (`git push -f`) to `main` or shared team branches.

---

## 3. AI Coding Assistant (Antigravity) Rules

When utilizing Antigravity to assist with code, design, or documentation, the following rules apply:

1. **Inspect before modifying:** Always inspect existing files and project structure before proposing or generating any edits.
2. **Do not duplicate code:** Check existing utilities, serializers, models, components, and endpoints before creating new ones.
3. **Strict adherence to documentation:**
   - Refer to `docs/DATABASE_SCHEMA.md` before defining models.
   - Refer to `docs/API_DOCUMENTATION.md` before building endpoints or frontend API client calls.
   - Refer to this file (`docs/DEVELOPMENT_RULES.md`) for all workflows.
4. **Never overwrite teammate work:** Do not delete, overwrite, or reformat code created by other team members without understanding its context and providing explicit rationale.
5. **Explain all changes:** Every automated or suggested modification must be clearly explained so all team members understand what was changed and why.

---

## 4. Security & Environment Configuration

Keeping credentials and secrets secure is mandatory for all team members:

> [!CAUTION]
> **Zero Secret Leaks in Git:**
> - **Never commit secrets:** Never commit `.env` files, passwords, database credentials, API keys, or Django secret keys to GitHub.
> - **Use `.env.example`:** Store a template file named `.env.example` in version control showing variable names with dummy/placeholder values (e.g., `DATABASE_URL=postgres://user:password@localhost:5432/food_rescue_db`).
> - **Verify `.gitignore`:** Ensure `.env`, local settings, virtual environments, and sensitive configuration files are ignored before running `git add`.
> - If a secret is accidentally committed, notify the team immediately so the credential can be rotated and the commit scrubbed.
