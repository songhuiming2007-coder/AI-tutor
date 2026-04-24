import json
import re
import asyncio
import logging
from openai import OpenAI

from ..config import settings
from ..models import Slide

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_BASE = """你是一位顶尖的中学教师，擅长把抽象知识讲得具体、有趣、易懂。
输出纯 JSON，不加任何多余文字。课程结构如下，严格按顺序生成每一页：

"""

UPPER_STRUCTURE = """【上半部分，第1-9页】
第1页 - 生活引入：用学生熟悉的生活场景或悬念问题引出主题，激发好奇心，不直接说定义
第2页 - 历史背景（可选）：这个知识点是怎么被发现的，有什么有趣的历史故事
第3页 - 核心概念A：第一个关键概念，必须配具体数字例子
第4页 - 核心概念B：第二个关键概念或对A的深入，继续用具体例子
第5页 - 核心概念C：第三个关键概念，或概念之间的关系与联系
第6页 - 例题精讲1（基础）：最简单的入门例题，4-5步，每步说清为什么
第7页 - 例题精讲2（中等）：比第6页更进一步，涉及多个概念的综合
第8页 - 例题精讲3（提高）：有一定难度，需要多步推导，考察深层理解
第9页 - 例题精讲4（综合）：贴近考试题型，完整解题过程加评分要点
"""

LOWER_STRUCTURE = """【下半部分，第10-18页】
第10页 - 易错点汇总：4-5个高频错误，每个给出错误示范→正确做法的对比
第11页 - 特殊情况讨论：这个知识点的边界条件、特殊情形、例外情况
第12页 - 与其他知识点的联系：这个知识点和哪些已学内容有关，怎么联合使用
第13页 - 变式练习1：2道练习题（基础），给出答案和解析
第14页 - 变式练习2：2道练习题（提高），给出答案和解析
第15页 - 思维导图式总结：用层级 bullets 梳理整个知识体系
第16页 - 记忆技巧：口诀、类比、图像记忆法，帮助记住核心公式或规律
第17页 - 真题演练：一道近年考试真题（或模拟题），完整解析
第18页 - 课程结语：总结今天学了什么，预告下一步可以学什么，鼓励性结尾
"""

SCRIPT_REQUIREMENTS = """script 写作要求：
- 语气像耐心的老师在课堂讲话，用"我们来看"、"注意这里"、"你有没有想过"
- 引入页、历史页、结语页不少于200字
- 概念页不少于250字，必须有具体例子
- 例题页不少于400字，包含读题、分析思路、每步计算+原因、验证、考点总结
- 易错点页每个错误用对比句式，不少于300字
- 练习页包含题目、答案、解析，不少于250字
- 总结页、记忆技巧页不少于150字
- bullets：3-5条，每条不超过20字，是script的提炼
- slide_type：intro / background / concept / example / mistake / edge_case / connection / practice / summary / memory / exam / closing 十二选一
"""

CHART_APPEND = """
图表字段说明（chart，可选）：
如果这一页的内容适合用图形辅助理解，输出 chart 字段，否则不输出。chart 字段格式：
{"type": "图表类型", "config": { ... }}

支持的图表类型及 config 格式：

1. type: "function_plot"（函数图像，适合数学函数页）
config: {
  "functions": [
    {"expr": "x*x", "label": "y = x²", "color": "#1D9E75"},
    {"expr": "2*x+1", "label": "y = 2x+1", "color": "#378ADD"}
  ],
  "xRange": [-5, 5],
  "yRange": [-2, 10],
  "xLabel": "x",
  "yLabel": "y"
}

2. type: "geometry"（几何图形，适合平面几何）
config: {
  "shapes": [
    {"kind": "triangle", "points": [[0,0],[4,0],[0,3]], "label": "直角三角形", "color": "#1D9E75"},
    {"kind": "label", "pos": [2, -0.4], "text": "a=4"},
    {"kind": "label", "pos": [-0.5, 1.5], "text": "b=3"},
    {"kind": "label", "pos": [2.2, 1.6], "text": "c=5"}
  ]
}

3. type: "bar_chart"（柱状图，适合统计/对比数据）
config: {
  "categories": ["类别A", "类别B", "类别C"],
  "series": [{"name": "数值", "data": [12, 25, 18], "color": "#1D9E75"}],
  "xLabel": "",
  "yLabel": ""
}

4. type: "number_line"（数轴，适合不等式、区间）
config: {
  "min": -3, "max": 3,
  "points": [
    {"value": -1, "label": "-1", "open": true},
    {"value": 2, "label": "2", "open": false}
  ],
  "highlight": [[-1, 2]]
}

5. type: "steps_diagram"（步骤流程图，适合算法/解题流程）
config: {
  "steps": ["已知 a=3, b=4", "代入公式 c²=a²+b²", "计算 c²=9+16=25", "开平方 c=5"]
}

判断标准：
- 三角形、圆、多边形等几何页 → geometry
- 需要展示数量对比的页 → bar_chart
- 不等式、数轴相关页 → number_line
- 例题解题步骤页 → steps_diagram
- 纯文字概念、历史背景、总结页 → 不输出 chart 字段
"""

OUTPUT_FORMAT = """
输出格式（严格 JSON 数组）：
```json
[
  {
    "index": 1,
    "title": "页面标题",
    "bullets": ["要点1", "要点2", "要点3"],
    "narration": "这一页的讲解词...",
    "slide_type": "intro",
    "chart": { ... }  // 可选
  }
]
```"""


class LLMService:
    def __init__(self):
        self.client = OpenAI(
            api_key=settings.DASHSCOPE_API_KEY,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )

    def _build_upper_prompt(self, topic: str) -> str:
        return (
            f"{SYSTEM_PROMPT_BASE}"
            f"主题：{topic}\n\n"
            f"现在生成课程的上半部分（第1-9页）。\n\n"
            f"{UPPER_STRUCTURE}\n"
            f"{SCRIPT_REQUIREMENTS}\n"
            f"{CHART_APPEND}\n"
            f"{OUTPUT_FORMAT}"
        )

    def _build_lower_prompt(self, topic: str, upper_titles: list[str]) -> str:
        titles_str = "、".join(upper_titles)
        return (
            f"{SYSTEM_PROMPT_BASE}"
            f"主题：{topic}\n\n"
            f"上半部分已生成 {len(upper_titles)} 页，标题依次为：{titles_str}\n"
            f"现在生成课程的下半部分（第10-18页），接续上半部分继续生成。\n\n"
            f"{LOWER_STRUCTURE}\n"
            f"{SCRIPT_REQUIREMENTS}\n"
            f"{CHART_APPEND}\n"
            f"{OUTPUT_FORMAT}"
        )

    def _call_api(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model="qwen-plus",
            messages=[{"role": "user", "content": prompt}],
            timeout=settings.LLM_TIMEOUT,
        )
        return response.choices[0].message.content

    def _extract_json(self, text: str) -> list[dict]:
        match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
        if match:
            json_str = match.group(1).strip()
        else:
            json_str = text.strip()

        data = json.loads(json_str)

        if not isinstance(data, list):
            raise ValueError(f"期望 JSON 数组，得到 {type(data).__name__}")

        return data

    def _call_with_retry(self, prompt: str, label: str) -> list[dict]:
        last_error = None
        for attempt in range(1, 4):
            try:
                raw = self._call_api(prompt)
                data = self._extract_json(raw)
                logger.info(f"{label} 第 {attempt} 次调用成功，得到 {len(data)} 页")
                return data
            except Exception as e:
                last_error = e
                logger.warning(f"{label} 第 {attempt} 次调用失败: {e}")
        raise ValueError(f"{label} 3 次重试均失败: {last_error}")

    def _validate_slides(self, data: list[dict], start_index: int) -> list[Slide]:
        slides = []
        for i, item in enumerate(data):
            item["index"] = start_index + i
            try:
                slide = Slide(**item)
                slides.append(slide)
            except Exception as e:
                logger.warning(f"第 {start_index + i} 页数据验证失败: {e}，跳过")
        if not slides:
            raise ValueError("没有有效的幻灯片数据")
        return slides

    async def generate_upper(self, topic: str) -> list[Slide]:
        """生成上半部分（第1-9页）"""
        upper_prompt = self._build_upper_prompt(topic)
        upper_data = await asyncio.to_thread(self._call_with_retry, upper_prompt, "上半部分")
        return self._validate_slides(upper_data, 1)

    async def generate_lower(self, topic: str, upper_titles: list[str]) -> list[Slide]:
        """生成下半部分（第10-18页）"""
        lower_prompt = self._build_lower_prompt(topic, upper_titles)
        lower_data = await asyncio.to_thread(self._call_with_retry, lower_prompt, "下半部分")
        return self._validate_slides(lower_data, len(upper_titles) + 1)

    async def generate_slides(self, topic: str, language: str = "zh") -> list[Slide]:
        # 第一次调用：生成第1-9页
        upper_slides = await self.generate_upper(topic)
        upper_titles = [s.title for s in upper_slides]

        # 第二次调用：生成第10-18页
        lower_slides = await self.generate_lower(topic, upper_titles)

        # 合并
        all_slides = upper_slides + lower_slides

        # 校验
        assert len(all_slides) >= 15, f"总页数不足: {len(all_slides)}"
        assert all(s.slide_type for s in all_slides), "存在缺少 slide_type 的页"

        logger.info(f"课程生成完成: {len(all_slides)} 页, 总 narration 字数: {sum(len(s.narration) for s in all_slides)}")
        return all_slides


llm_service = LLMService()
