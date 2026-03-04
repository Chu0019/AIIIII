# AIIIII

Navi Planner 單一儲存庫（Monorepo）MVP 骨架。

## 專案結構

- `apps/api`：FastAPI 後端
- `apps/web`：Next.js 前端
- `infra`：資料庫 Schema
- `docs`：產品規劃與 API 文件

## 使用 Docker 啟動

```bash
docker compose up --build
```

啟動後可開啟：
- Web：<http://localhost:3000>
- API 健康檢查：<http://localhost:8000/health>

## 本機啟動（不使用 Docker）

### 啟動 API

```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 啟動 Web

```bash
cd apps/web
npm install
npm run dev
```
