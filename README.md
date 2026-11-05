# RoadNa JO

A municipal issue-reporting platform for Greater Irbid Municipality: residents report problems, the municipality reviews and assigns them, field teams fix them, supervisors check the work, and managers watch the money.

| Folder | What it holds | State |
|---|---|---|
| [FrontEnd](FrontEnd/) | The whole web app as a clickable preview (HTML, CSS and JavaScript, sample data) | Built |
| [BackEnd](BackEnd/) | ASP.NET API on SQL Server | To build |
| [AIService](AIService/) | The AI assistant, summaries and suggestions | Simulated in the front end; service to build |
| [DataBase](DataBase/) | The database design site: ER diagram, schema diagram, table list, SQL script | Built |

## Run it

```bash
cd FrontEnd
node tools/serve.mjs
```

Open http://127.0.0.1:4173. The database design site is at http://127.0.0.1:4173/database/ while the server runs, or open `DataBase/database.html` directly.

Check the front end: `cd FrontEnd && node tools/check.mjs`.
