# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目简介

AI 自主学习平台。用户输入主题，系统生成结构化幻灯片课程 + 每页 TTS 音频，前端可翻页播放。

## 技术栈

- 后端：Python 3.11 + FastAPI + uvicorn
- LLM：zhipu API，模型 zhipu glm5.1
- TTS：OpenAI TTS API，模型 tts-1，voice: alloy
- 前端：React 18 + Vite，无 Next.js
- 包管理：pip（后端），npm（前端）

## 重要约束

- API keys 全部从环境变量读取，不硬编码
- 幻灯片内容以 JSON 格式在前后端传递，不生成 .pptx 文件
- 每页音频单独生成，文件名格式：{lesson_id}_slide_{n}.mp3
- 所有 API 调用必须有 error handling 和 timeout

## 目录结构约定

- backend/app/api/ 放路由
- backend/app/services/ 放 LLM/TTS 逻辑
- frontend/src/components/ 放组件

## Common Commands

### Backend
```bash
cd backend
pip install -r requirements.txt
cp ../.env.example ../.env  # 填入真实 API key
uvicorn app.main:app --reload
```

### Frontend
```bash
# Add frontend commands here
```

## Code Architecture

This section will be updated as the codebase grows to include:
- High-level architecture overview
- Key components and their relationships
- Important patterns and conventions used