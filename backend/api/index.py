import sys
from pathlib import Path

# 将 backend/ 加入 Python path，使 `from app.xxx` 导入可用
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app  # noqa: E402
