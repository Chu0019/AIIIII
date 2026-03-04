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

## 認證

### `POST /v1/auth/signup`
註冊並回傳 JWT。

### `POST /v1/auth/login`
登入並回傳 JWT。

### `GET /v1/auth/me`
需 Bearer Token。

## 天氣

### `GET /v1/weather/{icao}`
- 依機場座標查詢即時天氣（Open-Meteo）
- 回傳：溫度、風速、風向、天氣碼、觀測時間

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

### `GET /v1/flight-plans`
取得當前登入使用者的航班列表（需 Bearer Token）。

### `GET /v1/flight-plans/{id}`
取得單一航班。

### `PATCH /v1/flight-plans/{id}`
更新 `route_text` / `flight_level` / `cycle`。

### `DELETE /v1/flight-plans/{id}`
刪除航班。
### `POST /v1/flight-plans/{id}/compute`
計算直飛距離、ETE、燃油估算。

### `POST /v1/flight-plans/{id}/export?format=json|pln|fms`
匯出航班內容（MVP 為簡化格式）。
