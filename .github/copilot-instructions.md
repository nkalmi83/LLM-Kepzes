# AI Coding Agent Instructions for LLM-Kepzes

## Project Overview

This is a FastAPI-based product management system with a hybrid architecture combining REST API endpoints with server-side rendered HTML templates. The main application is located in `05_design/` directory.

## Architecture & Key Components

### Backend Stack

- **FastAPI** with async/await patterns throughout
- **SQLAlchemy 2.x** with async engine and SQLite via aiosqlite
- **Pydantic v2** for data validation and settings management
- **UV** for dependency management (not pip/poetry)

### Frontend Integration

- **Jinja2 templates** with TailwindCSS styling
- **Vanilla JavaScript** for SPA-like interactions
- **Static file serving** via FastAPI's StaticFiles

## Critical Development Patterns

### Database Architecture

- **Async-first**: All database operations use `AsyncSession` and `await`
- **Dependency injection**: Database sessions via `Depends(get_db)`
- **Table creation**: Automatic via `lifespan` context manager in `main.py`
- **Models**: Single `ProductDTO` class serves as both SQLAlchemy model and domain entity

```python
# Standard pattern for database operations
result = await db.execute(select(ProductDTO).where(ProductDTO.id == product_id))
product = result.scalar_one_or_none()
```

### Configuration Management

- **Pydantic Settings**: All config in `config.py` using `BaseSettings`
- **Environment variables**: Automatically loaded from `.env` file
- **Database URL**: SQLite with async driver `sqlite+aiosqlite:///./app.db`

### API Design Patterns

- **Separate DTOs**: `ProductDTOCreate` for input, `ProductDTOResponse` for output
- **Resource-based routing**: `/products/` with full CRUD operations
- **Error handling**: Consistent HTTPException with status codes and detail messages

## Development Workflow

### Running the Application

```bash
# Development with auto-reload
uv run uvicorn main:app --reload

# Production mode
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

### Dependency Management

- **Add packages**: Modify `pyproject.toml` dependencies array, then `uv sync`
- **Dev dependencies**: Use `[project.optional-dependencies.dev]` section
- **Lock file**: `uv.lock` tracks exact versions (commit this)

### Frontend Development

- **TailwindCSS**: Compiled via npm, config in `tailwind.config.js`
- **Content path**: `./templates/**/*.html` for Tailwind scanning
- **Build CSS**: `npm run build` (if build script exists)

## File Structure Conventions

### Core Files

- `main.py`: FastAPI app, routes, and lifespan management
- `database.py`: SQLAlchemy models, session management, table creation
- `config.py`: Application settings and environment configuration
- `templates/`: Jinja2 templates (currently only `index.html` is functional)
- `static/`: CSS, JS, and asset files

### Template Architecture

- **Single page app feel**: `index.html` loads all product functionality via JavaScript
- **Modal-based interactions**: Add/edit/view products in overlays
- **AJAX patterns**: Fetch data from `/products/` endpoints dynamically

## Integration Points

### Frontend ↔ Backend Communication

- **REST API**: JavaScript makes fetch() calls to `/products/` endpoints
- **JSON responses**: All API endpoints return/accept JSON
- **Template rendering**: Root route `/` serves the main HTML interface

### Database Integration

- **Auto-migration**: Tables created automatically on startup via `create_tables()`
- **Session management**: Async context managers handle connection lifecycle
- **Query patterns**: Use SQLAlchemy select() with async execution

## Common Gotchas

1. **Async everywhere**: Don't forget `await` on database operations
2. **Session dependencies**: Always use `Depends(get_db)` for database access
3. **UV commands**: Use `uv run` prefix for Python commands, not direct python/pip
4. **Template directory**: Jinja2Templates looks in `templates/` relative to main.py
5. **Static files**: Mount at `/static` route, served from `static/` directory

## Adding New Features

### New API Endpoints

1. Add route function to `main.py`
2. Create Pydantic models for request/response
3. Use async database session dependency
4. Follow existing error handling patterns

### New Database Models

1. Add SQLAlchemy model to `database.py`
2. Inherit from `Base`
3. Include in auto-table creation (it's automatic)
4. Create corresponding Pydantic DTOs in `main.py`

### Frontend Enhancements

1. Modify `templates/index.html` for UI changes
2. Update `static/script.js` for JavaScript functionality
3. Use Tailwind classes for styling
4. Follow existing modal/AJAX patterns for interactions
