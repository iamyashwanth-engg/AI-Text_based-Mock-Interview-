import os
import json
import pymysql
import pymysql.cursors
from dotenv import load_dotenv

# Load .env relative to the location of this db.py file
backend_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(backend_dir, ".env")
load_dotenv(dotenv_path=dotenv_path)


def get_db_connection():
    """
    Creates and returns the connection to the MySQL Database.
    """
    return pymysql.connect(
        host=os.getenv("MYSQL_HOST", "localhost"), # Fixed key to MYSQL_HOST
        port=int(os.getenv("MYSQL_PORT", 3306)),
        user=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        database=os.getenv("MYSQL_DATABASE"),
        cursorclass=pymysql.cursors.DictCursor
    )

def init_db():
    """
    Initializes the MySQL database by creating users and interviews tables,
    and runs schema migrations.
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 1. Create the new 'users' table
            create_users_table = """
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
            cursor.execute(create_users_table)

            # 2. Create 'interviews' table
            create_interviews_table = """
            CREATE TABLE IF NOT EXISTS interviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id VARCHAR(255) NOT NULL UNIQUE,
                round_type VARCHAR(50) NOT NULL,
                transcript JSON NOT NULL,
                scorecard JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
            cursor.execute(create_interviews_table)

            # 3. Migration: Add 'user_id' column to 'interviews' if it doesn't exist
            cursor.execute("SHOW COLUMNS FROM interviews LIKE 'user_id'")
            column_exists = cursor.fetchone()
            if not column_exists:
                print("Migrating: Adding 'user_id' column to 'interviews' table...")
                cursor.execute("ALTER TABLE interviews ADD COLUMN user_id INT NULL")

        connection.commit()
        print("Database initialized successfully with authentication support.")
    except Exception as e:
        print(f"Error initializing the database: {e}")
        raise e
    finally:
        connection.close()


def save_interview_session(session_id, round_type, transcript, scorecard=None, user_id=None):
    """
    Saves or updates an interview session.
    """
    connection = get_db_connection() # Fixed typo
    try:
        transcript_str = json.dumps(transcript)
        scorecard_str = json.dumps(scorecard) if scorecard else None

        with connection.cursor() as cursor: # Removed 'connection = None'
            query = """
            INSERT INTO interviews (session_id, round_type, transcript, scorecard, user_id)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                transcript = VALUES(transcript),
                scorecard = VALUES(scorecard),
                user_id = VALUES(user_id)
            """
            cursor.execute(query, (session_id, round_type, transcript_str, scorecard_str, user_id))
        connection.commit()
        print(f"Interview session {session_id} saved/updated successfully.")
    except Exception as e:
        print(f"Error saving interview session {session_id}: {e}")
        raise e
    finally:
        connection.close()

def get_interview_session(session_id): # Added session_id parameter
    """
    Retrieves an interview session, parsing the JSON fields back into Python dictionaries/lists.
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            query = "SELECT * FROM interviews WHERE session_id = %s"
            cursor.execute(query, (session_id,))
            result = cursor.fetchone()

            if result:
                if isinstance(result["transcript"], str):
                    result["transcript"] = json.loads(result["transcript"])
                if isinstance(result["scorecard"], str) and result["scorecard"]:
                    result["scorecard"] = json.loads(result["scorecard"])
            
            return result
    except Exception as e: # Aligned with try
        print(f"Error in finding the session_id {session_id}: {e}")    
        return None
    finally: # Aligned with try
        connection.close()    
  
def create_user(name, email, password_hash):
    """
    Registers a new user inside the MySQL database. Returns the newly created User ID.
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            query = "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)"
            cursor.execute(query, (name, email, password_hash))
            new_id = cursor.lastrowid
        connection.commit()
        return new_id
    except Exception as e:
        print(f"Error creating user: {e}")
        raise e
    finally:
        connection.close()

def get_user_by_email(email):
    """
    Retrieves a user profile by email address (for login checks).
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            query = "SELECT * FROM users WHERE email = %s"
            cursor.execute(query, (email,))
            return cursor.fetchone()
    except Exception as e:
        print(f"Error fetching user by email: {e}")
        return None
    finally:
        connection.close()

def get_user_sessions(user_id):
    """
    Retrieves all past interview scorecards and details for a given User ID.
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            query = """
            SELECT id, session_id, round_type, scorecard, created_at 
            FROM interviews 
            WHERE user_id = %s 
            ORDER BY created_at DESC
            """
            cursor.execute(query, (user_id,))
            results = cursor.fetchall()
            
            # De-serialize the scorecard JSON strings back into dictionaries
            for row in results:
                if isinstance(row["scorecard"], str) and row["scorecard"]:
                    row["scorecard"] = json.loads(row["scorecard"])
            return results
    except Exception as e:
        print(f"Error fetching user interview sessions: {e}")
        return []
    finally:
        connection.close()


    








# pyrefly: ignore [parse-error]
