# AIIIII

可實際啟動的 Navi Planner（Monorepo）MVP。

目前已完成：
- 前端：Next.js（可建立 Flight Plan + 計算）
- 後端：FastAPI（Flight Plan API + 機場查詢）
- 容器：Docker Compose（Web / API / Postgres）

---

## 專案結構

- `apps/api`：FastAPI 後端
- `apps/web`：Next.js 前端
- `infra`：資料庫 Schema
- `docs`：Roadmap 與 API 文件

---

## 一鍵啟動（Docker）

```bash
docker compose up --build
```

啟動後：
- Web：<http://localhost:3000>
- API 健康檢查：<http://localhost:8000/health>

---

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

---

## 目前可用 API（MVP）

- `GET /health`
- `GET /v1/airports?query=RJTT`
- `POST /v1/flight-plans`
- `GET /v1/flight-plans/{id}`
- `PATCH /v1/flight-plans/{id}`
- `POST /v1/flight-plans/{id}/compute`
- `POST /v1/flight-plans/{id}/export?format=json|pln|fms`

詳細請看：`docs/api.md`

---

## 快速測試流程

1. 開 Web：<http://localhost:3000>
2. 輸入出發/目的機場（例如 `RJTT` → `RCTP`）
3. 點「建立 Flight Plan」
4. 點「計算」查看距離、ETE、燃油估算

---

## 備註

本專案為合法自建產品骨架，不包含任何未授權的商業航圖資料。