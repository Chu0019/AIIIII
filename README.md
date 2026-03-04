# AIIIII

可實際啟動的 Navi Planner（Monorepo）MVP。

目前已完成：
- 前端：Next.js（登入/註冊、建立 Flight Plan、歷史列表、刪除、匯出下載、計算、天氣卡）
- 後端：FastAPI（JWT 認證 + Flight Plan CRUD + 匯出 + 機場查詢 + 即時天氣）
- 容器：Docker Compose（Web / API / Postgres）

---

## 專案結構

- `apps/api`：FastAPI 後端
- `apps/web`：Next.js 前端
- `infra`：資料庫 Schema
- `docs`：Roadmap 與 API 文件
- `packages/shared`：前後端共用型別（shared package）

---

## 一鍵啟動（Docker）

### macOS / Linux

```bash
./start.sh
```

### Windows

雙擊 `start.bat`（或在命令列執行）

```bat
start.bat
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
- `POST /v1/auth/signup`
- `POST /v1/auth/login`
- `GET /v1/auth/me`
- `GET /v1/airports?query=RJTT`
- `GET /v1/weather/{icao}`
- `GET /v1/flight-plans`（需登入）
- `POST /v1/flight-plans`（需登入）
- `GET /v1/flight-plans/{id}`（需登入）
- `PATCH /v1/flight-plans/{id}`（需登入）
- `DELETE /v1/flight-plans/{id}`（需登入）
- `POST /v1/flight-plans/{id}/compute`（需登入）
- `POST /v1/flight-plans/{id}/export?format=json|pln|fms`（需登入）

詳細請看：`docs/api.md`

---

## 快速測試流程

1. 開 Web：<http://localhost:3000>
2. 先登入（預設 demo：`demo@example.com` / `demo1234`）
3. 輸入出發/目的機場（例如 `RJTT` → `RCTP`）
4. 點「建立 Flight Plan」
5. 點「計算」查看距離、ETE、燃油估算

---

## 備註

本專案為合法自建產品骨架，不包含任何未授權的商業航圖資料。