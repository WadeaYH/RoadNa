# BackEnd

To build: an ASP.NET API on SQL Server, using the design in [../DataBase](../DataBase/).

What the front end already expects, screen by screen, is described in [../FrontEnd/README.md](../FrontEnd/README.md) (roles, the main flow, donations, finance). In outline:

- **Accounts and roles:** resident, reviewer, team member, team leader, supervisor, manager, super admin. Real sign-in replaces the preview's role picker.
- **Reports and work orders:** report, review, assign, work steps, supervisor check, rework, reopen, archive.
- **Community votes** and **funding campaigns** (donations, refunds, moving a gift to another campaign).
- **Finance data** for the manager's Finance page.
- **Notifications** and a payment provider for donations.
