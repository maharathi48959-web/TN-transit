# TN Transmit Transport Authority

A separate Flask + SQLite authority dashboard prototype for receiving bus/AI alerts, acknowledging emergencies, tracking recurring crowded locations, and assigning available standby buses.

## Requirements
- Python 3.10+
- Internet is not required after Flask is installed.

## Run on Windows PowerShell
```powershell
py --list
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```
Use the Python version actually installed on your computer; change `-3.13` as needed.
Open the authority dashboard at http://127.0.0.1:5001/ and the driver dashboard at http://127.0.0.1:5001/driver.

## Demo data
Three reserve buses and one on-route bus are seeded as illustrative demo records. Replace them with verified fleet data before operational use.

## Connect the bus project
The authority server exposes `POST /api/alerts`. From the bus backend, send JSON to:
`http://127.0.0.1:5001/api/alerts`
This works when both applications run on the same computer. For separate computers, replace 127.0.0.1 with the authority server's reachable LAN address and configure firewall/network access securely.

Example:
```json
{
  "event_id": "TNCA-0001",
  "vehicle_id": "TN-TRANSMIT-DEMO-01",
  "route": "Route 21G",
  "stop_name": "Anna Nagar",
  "event_type": "overcrowding",
  "severity": "high",
  "occupancy": 46,
  "capacity": 45,
  "source": "bus_ai",
  "message": "Configured crowd threshold exceeded"
}
```

Allowed event types include `crowd`, `overcrowding`, `congestion`, `medical_emergency`, `vehicle_breakdown`, `safety_threat`, `door_obstruction`, and `other`.

## API summary
- `GET /api/dashboard` dashboard data
- `GET /api/driver/dashboard?vehicle_id=<registered-vehicle-id>` driver data for one registered vehicle
- `POST /api/alerts` receive bus/AI alerts
- `POST /api/alerts/<id>/status` acknowledge/resolve an alert
- `DELETE /api/alerts/<id>` delete one alert
- `DELETE /api/alerts` clear alert history
- `POST /api/vehicles` add a fleet vehicle
- `POST /api/allocations` assign an available bus to an alert/route
- `POST /api/allocations/<id>/status` update assignment status
- `GET /health` service health

## Driver alert workflow
The authority dashboard's Incoming Alerts section links to the driver dashboard. Each alert also has a vehicle-specific Driver view link. The driver dashboard only returns alerts whose `vehicle_id` exactly matches the selected vehicle in the fleet register. Authority status changes are stored on the shared alert record in SQLite; the driver dashboard polls for updates every three seconds and displays the acknowledgment or resolution timestamp. Repeating the same status update does not create another notification or change its timestamp, and a resolved alert cannot be acknowledged again.

The local prototype does not authenticate drivers. Selecting a registered vehicle routes its alert feed but is not proof of driver identity; use an approved authenticated sign-in and secure deployment before operational use.

## Safety/security notes
This is a local prototype, not a production dispatch service. Before deployment add authentication and role-based access, HTTPS, API tokens/signatures, audit logging, rate limits, backups, privacy controls and real driver/vehicle identity verification. Medical alerts need a monitored escalation process and must not rely solely on this prototype. Never send physical door-control commands from this authority dashboard.
