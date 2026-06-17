# API Documentation

## DataSite & Inventory
### GET `/api/datasite/assets/by_type`
- **Description:** Returns all assets of a specified type across all stations, sorted by `site_id` alphabetically.
- **Parameters:** `type` (string) - Category constant like `MAY_LANH`, `MAY_PHAT`, `TU_NGUON`.
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "site_id": "DNTN28",
        "asset_name": "Máy Lạnh 1",
        "brand": "Daikin",
        "capacity": "12000 BTU",
        "quantity": 1,
        "status": "Hoạt động tốt",
        "extra_info_1": "...",
        "extra_info_2": "..."
      }
    ]
  }
  ```


## Station Intelligence
### GET `/api/station-info/<station_id>`
- **Description:** Fetches comprehensive data for a specific station, combining general info, latest fuel refill, latest generator log, and overall fuel statistics.
- **Parameters:** `station_id` (string) - The unique ID of the station.
- **Response:**
  ```json
  {
    "success": true,
    "station": { "id_tram": "...", "ma_khach_hang": "...", "huyen": "...", "quan_ly_tram": "...", "dung_tich": 0, "loai_nhien_lieu": "..." },
    "latest_refill": { "date": "...", "quantity": 0, "refill_count_30d": 0 },
    "latest_log": { "date": "...", "duration": 0, "consumed": 0 },
    "fuel_stats": { "total_refilled": 0, "total_consumed": 0, "total_purchased": 0, "estimated_remaining": 0 }
  }
  ```

## Power Outages
### GET `/admin/fetch-outages`
- **Description:** Manual trigger to crawl power outage data from EVNSPC for all stations.
- **Auth:** Required (Admin)

## Other Endpoints
### GET `/`
- Dashboard with overall metrics and anomaly detection.

### GET `/power-schedule`
- View and manage power outage schedules.

### GET `/daily-work`
- View and manage daily maintenance work logs.

## Viber Bot Integration
### POST `/api/viber`
- **Description:** Serverless Webhook callback handler deployed on Vercel for Viber Bot communication and verification.
- **Response:**
  ```json
  { "status": 0, "status_message": "ok" }
  ```
