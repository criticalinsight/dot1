# Contributing

## Development Setup

```bash
git clone <repo>
cd dot1

# Install dependencies
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# Run locally
cd frontend && npm run dev &
cd backend && npx wrangler dev &
```

## Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Use Prettier defaults
- **Imports**: Prefer type-only imports where applicable

## Project Structure Rules

| Directory | Purpose | Rules |
|-----------|---------|-------|
| `frontend/src/components/` | UI components | One component per file |
| `frontend/src/db/` | Database layer | No UI imports |
| `backend/src/` | Worker logic | No frontend imports |
| `shared/` | Shared types | Types only, no runtime code |

## Pull Request Checklist

- [ ] TypeScript compiles without errors
- [ ] Frontend builds: `cd frontend && npm run build`
- [ ] Backend typechecks: `cd backend && npx tsc --noEmit`
- [ ] No console.log in production code
- [ ] Updated relevant docs if API changed

## Commit Messages

Use conventional commits:

```
feat: add task creation modal
fix: resolve sync race condition
docs: update API reference
refactor: simplify ProjectBrain
```

## Testing

```bash
# Frontend
cd frontend && npm test

# Type checking
cd backend && npx tsc --noEmit
```
