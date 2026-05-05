# Lab Manager

## Run locally

1. Install dependencies:

```bash
npm run install-all
```

2. Create server env file:

- Copy `server/.env.example` to `server/.env`
- Fill required values:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `SUPER_ADMIN_PASSWORD`

3. Start backend + frontend:

```bash
npm run dev
```

## Open the app

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:5000](http://localhost:5000)
