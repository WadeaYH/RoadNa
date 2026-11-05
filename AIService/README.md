# AIService

To build: the service behind the AI features. The front end currently simulates them from sample data, so the service can replace that without changing the screens.

Where the AI appears today:

- **Review and assign:** suggested type, priority and duplicates (advice only).
- **Check work:** AI reassessment when a supervisor sends work back.
- **Dashboard:** the daily summary.
- **Finance:** the AI summary and suggestions, and the floating **RoadNa AI** chat for the manager (`FrontEnd/shared/ai-chat.js`, answering from `FrontEnd/shared/finance-data.js`).

[AI-Models](AI-Models/) holds the model experiments and notes.
