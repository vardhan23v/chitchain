import os
from dotenv import load_dotenv

load_dotenv()

DEFAULT_MODEL = os.getenv("MODEL", "groq/llama-3.3-70b-versatile")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")
MAX_BID_PERCENTAGE = float(os.getenv("MAX_BID_PERCENT", "30.0"))
MIN_BID_PERCENTAGE = float(os.getenv("MIN_BID_PERCENT", "1.0"))
AUTO_BID_ENABLED = os.getenv("AUTO_BID_ENABLED", "true").lower() == "true"
