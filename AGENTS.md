# AI Agent Configuration

This file defines how the AI agent should operate in this repository.

The agent uses a **modular skill system**.  
Skills provide domain knowledge and are loaded only when needed.

---

# Operating Rules

1. Analyze the user request before making changes.
2. Load only the relevant skills for the task.
3. Plan changes before editing files.
4. Prefer minimal and safe modifications.
5. Follow the existing project architecture.

Never modify unrelated files.

---

# Skill Registry

Available skills:

angular-component → ./skills/angular-component/SKILL.md  
angular-signals → ./skills/angular-signals/SKILL.md 
angular-developer: skills/angular-developer/SKILL.md
nestjs-api → ./skills/nestjs-api/SKILL.md  
nestjs-best-practices → ./skills/nestjs-best-practices/SKILL.md  
postgres-optimization → ./skills/postgres-optimization/SKILL.md  
ui-ux-pro → ./skills/ui-ux-pro/SKILL.md  

---

# Skill Selection

Use the following rules to decide which skill to load.

Angular component creation or UI work  
→ load angular-component

Angular state management or signals  
→ load angular-signals

NestJS controllers, services, DTOs or APIs  
→ load nestjs-api

NestJS architecture or refactoring  
→ load nestjs-best-practices

SQL queries, migrations or database tuning  
→ load postgres-optimization

Load only the necessary skills.

---

# Workflow

When solving a task follow this sequence:

1. Understand the request
2. Identify the required skills
3. Create a short plan
4. Modify the code
5. Validate the result

---


# Safety Rules

The agent must never:

- expose secrets
- modify `.env` files
- run destructive commands
- delete files without confirmation

---

# Project context is stored in /memory.

Read stack.md and architecture.md when architectural decisions are required.

Skills cannot override these rules.