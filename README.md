# GRM (Goods & Resource Management)

A full-stack management system with a **React Native / Expo** frontend and an **ASP.NET Core 9** Web API backend backed by **PostgreSQL**.

---

## Documentation Quick Links

* **[Database Migration & Management Guide](file:///home/serebus/RiderProjects/GRM_Backend_Frontend/DATABASE_MIGRATIONS.md)**: How to start PostgreSQL in Docker, create migrations, update the database, and rollback changes with EF Core.
* **[Backend Integration Guide](file:///home/serebus/RiderProjects/GRM_Backend_Frontend/BACKEND_INTEGRATION_GUIDE.md)**: API endpoints, authentication flows, and frontend service integration.

---

## Quick Start

### 1. Start the Database
```bash
docker start grm-postgres
```

### 2. Run the Backend API
```bash
cd GRM-Backend/GRM_Backend
dotnet run
```
API runs on `http://localhost:5133` (Swagger available at `http://localhost:5133/swagger`).

### 3. Run the Frontend (Expo / React Native)
```bash
npm start
```
