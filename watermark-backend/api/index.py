import sys
from pathlib import Path

# Add project root to sys.path so all local imports work seamlessly
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from app import app

# Export handler for Vercel Serverless
handler = app

