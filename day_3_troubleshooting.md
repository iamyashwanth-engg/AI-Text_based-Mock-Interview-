# Day 3 Integration & Troubleshooting Report: Database Layer

This document compiles the implementation steps, issues faced, and resolutions during the **Day 3: Database & MySQL Integration** phase of the AI Voice Mock Interviewer Web Application. It is structured to be easy to read and explain in a system design or coding interview.

---

## 1. Objective of Day 3
To build the database access layer in [`backend/db.py`](file:///c:/Users/aruna/AI-Interview/backend/db.py) to handle:
*   **Database Connectivity**: Manage connections using `pymysql` with settings pulled from environment variables.
*   **Schema Creation**: Create the `interviews` table automatically if it does not exist, utilizing MySQL `JSON` columns for the transcripts and scorecard documents.
*   **Data Persistence (Upsert)**: Save/update active conversations using MySQL's `ON DUPLICATE KEY UPDATE` to avoid duplicate sessions.
*   **Data Retrieval**: Fetch past sessions by their `session_id` and deserialize the JSON columns back into Python lists and dictionaries.

---

## 2. Troubleshooting & Rectification History

Here are the 4 main bugs we encountered, why they happened, and how we resolved them:

### Issue 1: `ModuleNotFoundError: No module named 'db'`
*   **Symptom**: Running `python -c "from db import init_db; init_db()"` failed.
*   **Root Cause**: The terminal working directory was the project root (`C:\Users\aruna\AI-Interview`), but `db.py` was inside the `backend` subdirectory. Python’s path did not include the `backend` folder.
*   **Rectification**: We updated the import statement to use the `backend` package namespace:
    ```powershell
    python -c "from backend.db import init_db; init_db()"
    ```

### Issue 2: `ModuleNotFoundError: No module named 'pymysql'`
*   **Symptom**: Python could not import `pymysql` even though it was listed in `requirements.txt`.
*   **Root Cause**: The command was executed using the global system Python compiler, which lacked the project-specific dependencies. The dependencies were installed inside the virtual environment (`.venv`).
*   **Rectification**: We targeted the virtual environment’s Python binary directly to isolate the environment:
    ```powershell
    # 1. Install dependencies directly into the .venv
    .\backend\.venv\Scripts\pip.exe install -r .\backend\requirements.txt

    # 2. Run the command using the .venv Python
    .\backend\.venv\Scripts\python.exe -c "from backend.db import init_db; init_db()"
    ```

### Issue 3: `pymysql.err.OperationalError: (1045, "Access denied for user 'aruna'@'localhost' (using password: NO)")`
*   **Symptom**: PyMySQL attempted to log in as the Windows OS user (`aruna`) with no password, ignoring the `.env` file credentials.
*   **Root Causes**:
    1.  **Dotenv Loading Context**: By default, `load_dotenv()` looks for a `.env` file in the current working directory of the terminal (the root folder). It did not find the `.env` file which was inside the `backend/` folder. Consequently, `os.getenv(...)` returned `None` for all database configurations.
    2.  **PyMySQL Fallback**: When connection parameters (like user and password) are passed as `None`, `pymysql` defaults to the OS user and no password.
*   **Rectification**:
    1.  We modified `db.py` to compute the absolute path of the `.env` file relative to the file location of `db.py` itself:
        ```python
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        dotenv_path = os.path.join(backend_dir, ".env")
        load_dotenv(dotenv_path=dotenv_path)
        ```
    2.  We configured the correct local MySQL username (`root`), password, and created the database schema (`ai_interview_db`) in MySQL Workbench.

### Issue 4: Python Syntax & Indentation Errors
*   **Symptom**: Running the code triggered `SyntaxError: invalid syntax` in `get_interview_session`.
*   **Root Causes**:
    1.  **Indentation Mismatch**: The `except` and `finally` blocks in `get_interview_session` were indented too deep (aligned with the `with` block instead of the parent `try` block).
    2.  **Signature Mismatch**: The function signature `def get_interview_session()` was missing the `session_id` parameter, and the identifier was hardcoded to `None` inside.
*   **Rectification**: We aligned the `except` and `finally` keywords back to the same indentation level as the `try` keyword, added `session_id` to the function parameters, and removed the hardcoded `None` override.

---

## 3. Key Concepts to Explain to an Interviewer

If asked about this database design and debugging phase, highlight these three takeaways:
1.  **Virtual Environment Isolation**: Running tools using full paths (like `.\backend\.venv\Scripts\python.exe`) prevents polluting the global host system and guarantees that dependencies are loaded from the project's sandboxed environment.
2.  **Deterministic Path Resolution**: Relying on raw `load_dotenv()` is dangerous in multi-directory setups because execution context changes. Computing paths dynamically using `__file__` ensures the environment variables are loaded reliably.
3.  **JSON Serialization & Storage**: Utilizing MySQL’s native `JSON` column type allows us to store arbitrary, nested transcript objects and scorecards cleanly without setting up a massive relational schema for chat messages, while maintaining the safety of standard relational ACID guarantees.
