# Departmental Clash bowling demo

Local demo for the TU Graduate Student Association event at AMF Sheridan Lanes, Friday, November 20, 2026, 6:00–9:00 PM.

## See the demo

Open `index.html` in a browser and add `?demo=1#checkin` to its address. If your browser restricts local files, run `python3 -m http.server 8000` from this folder and visit `http://localhost:8000/?demo=1#checkin`. It starts with fictional sample bowlers, several check-ins, sample Round 1 scores, a searchable lane board, a read-only Scores view, and a department average score graphic. Use **Roster → Reset all check-ins and scores** to reset the sample event.

The demo stores changes in that browser only. It is useful for showing the interface and flow, but it does not simulate live updates across different devices.

## Shared check-in for staff and results for participants

A Google Form is **not required** for the site to work. For a shared event, the current implementation needs a Google Sheet plus the included Apps Script backend. That backend serializes writes with Apps Script `LockService`, so simultaneous check-in requests are handled one at a time. Participants can view Lanes and Scores without signing in; check-in, roster changes, and score editing remain staff-only. Staff can load the event roster in the site from CSV.

If you want a Google Form for participant sign-up, its responses can be exported from the linked Sheet to CSV and imported into the site. Automatic reading of Form responses is not included yet; that would be a separate integration.

### Before a real event deployment

1. Create a Google Sheet and add the included `apps-script/Code.gs` in **Extensions → Apps Script**.
2. Change the placeholder `PIN` in the script to a private staff PIN before deploying it as a web app.
3. Set the web app URL in `BOARD_CONFIG.api` in `index.html` (or use the `?api=...` query parameter).
4. Rehearse two simultaneous check-ins from separate devices and confirm the public Lanes and Scores views.

Anyone who can open the public board can currently read the roster and scores. Use only attendee details that are appropriate to show to event participants.
