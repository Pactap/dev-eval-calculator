# Bulk data samples

Reference files for the **Admin → Bulk data → Import & export** panel. Each is a plain JSON list of
`{ date, day, name }` rows. Download the matching **Sample** in-app to get the same template pre-filled.

| File | Uploads to | Notes |
| --- | --- | --- |
| `company-holidays-sample.json` | Company holidays | `name` optional. Weekend dates are recorded but have no scoring impact. |
| `restricted-holidays-sample.json` | Restricted holidays | `name` required. A developer may avail **one per calendar year**; the same day is open to every developer independently. |
| `developer-usage-sample.json` | Developer usage | One row per developer per year (`employeeId` + the restricted holiday used). Employee IDs are matched case-insensitively, alphanumeric only (`PT-1042` = `pt1042`). |

Rules on import:
- `date` must be a real `YYYY-MM-DD`. `day` is derived from the date — you don't need to get it right.
- Uploading **replaces** the whole dataset with the file's contents.
- A date cannot be both a company holiday and a restricted holiday.
- Developer usage allows at most one restricted holiday per employee ID per calendar year.
