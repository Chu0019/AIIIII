# API 文件（MVP v0.2）

Base URL：`http://localhost:8000`

## 健康檢查

### `GET /health`
回傳：

```json
{ "ok": true }
```

## 機場

### `GET /v1/airports?query=RJTT`
- `query` 可選，支援 ICAO/IATA/名稱關鍵字

## Flight Plans

### `POST /v1/flight-plans`
建立航班。

請求範例：

```json
{
  "user_id": "demo-user",
  "dep_icao": "RJTT",
  "arr_icao": "RCTP",
  "route_text": "DCT",
  "flight_level": 350,
  "cycle": "2503"
}
```

### `GET /v1/flight-plans/{id}`
取得航班。

### `PATCH /v1/flight-plans/{id}`
更新 `route_text` / `flight_level` / `cycle`。

### `POST /v1/flight-plans/{id}/compute`
計算直飛距離、ETE、燃油估算。

### `POST /v1/flight-plans/{id}/export?format=json|pln|fms`
匯出航班內容（MVP 為簡化格式）。
