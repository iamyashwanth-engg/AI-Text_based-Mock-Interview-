# AI Mock Interview Platform - Startup Guide

Follow these instructions to start the backend and frontend servers, access the browser interface, and query the stored sessions.

---

## 1. Start the Backend Server (Terminal 1)
Open a terminal in the project root directory (`C:\Users\aruna\AI-Interview`) and run:

```powershell
# Start the FastAPI server with auto-reload
.\backend\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload
```
* **Endpoint:** `http://127.0.0.1:8000`
* **Health Check:** `http://127.0.0.1:8000/health`

---

## 2. Start the Frontend Server (Terminal 2)
Open a second terminal, navigate into the `frontend` folder, and start the development server:

```powershell
# Navigate to the frontend directory
cd frontend

# Start Next.js in development mode
npm run dev
```
* **Local URL:** `http://localhost:3000`

---

## 3. Query Saved Interview Sessions from MySQL
To see the saved interview sessions directly from your terminal, run this script from the project root directory:

```powershell
# Print a list of all saved sessions in MySQL
.\backend\.venv\Scripts\python.exe -c "import pymysql, os, dotenv; dotenv.load_dotenv('backend/.env'); conn=pymysql.connect(host=os.getenv('MYSQL_HOST'), user=os.getenv('MYSQL_USER'), password=os.getenv('MYSQL_PASSWORD'), database=os.getenv('MYSQL_DATABASE'), cursorclass=pymysql.cursors.DictCursor); cursor=conn.cursor(); cursor.execute('SELECT id, session_id, round_type, created_at FROM interviews'); print(cursor.fetchall())"
```

To view a detailed scorecard JSON directly:
```powershell
# Replace <SESSION_ID> with the UUID token of your choice
.\backend\.venv\Scripts\python.exe -c "import pymysql, os, dotenv, json; dotenv.load_dotenv('backend/.env'); conn=pymysql.connect(host=os.getenv('MYSQL_HOST'), user=os.getenv('MYSQL_USER'), password=os.getenv('MYSQL_PASSWORD'), database=os.getenv('MYSQL_DATABASE'), cursorclass=pymysql.cursors.DictCursor); cursor=conn.cursor(); cursor.execute('SELECT scorecard FROM interviews WHERE session_id = \'<SESSION_ID>\''); row=cursor.fetchone(); print(json.dumps(json.loads(row['scorecard']), indent=2)) if row else print('No record found')"
```
