# Database Migration & Management Guide (PostgreSQL + EF Core)

This guide covers how to manage, create, and apply database migrations for the **GRM Backend** using **Entity Framework Core** and **PostgreSQL**.

---

## 1. Quick Database Setup & Credentials

The backend connects to PostgreSQL running in Docker:

* **Host:** `localhost`
* **Port:** `5432`
* **Database Name:** `GRM`
* **Username:** `postgres`
* **Password:** `postgres`

### Managing the PostgreSQL Container

```bash
# Check if container is running
docker ps

# Start the PostgreSQL container if stopped
docker start grm-postgres

# Stop the PostgreSQL container
docker stop grm-postgres

# View container logs
docker logs grm-postgres
```

---

## 2. Prerequisites

Ensure the EF Core CLI tool is installed:

```bash
# Install dotnet-ef globally (if not already installed)
dotnet tool install --global dotnet-ef

# If already installed, ensure it is up-to-date
dotnet tool update --global dotnet-ef
```

> **Note for Linux:** If `dotnet ef` returns "command not found", add the .NET tools directory to your PATH:
> ```bash
> export PATH="$PATH:$HOME/.dotnet/tools"
> ```

---

## 3. How Migrations Work in this Project

1. When you run the backend (`dotnet run` or from your IDE), **migrations are automatically applied** at startup via `db.Database.Migrate()` in `Program.cs`.
2. Seed data (default accounts `admin`, `staff`, `customer`, and initial products) is automatically inserted if not already present.

---

## 4. Common Migration Commands

Run all commands from the repository root:

### A. Creating a New Migration
Whenever you modify models in `GRM-Backend/GRM_Backend/Models/` or configuration in `AppDbContext.cs`:

```bash
dotnet ef migrations add <DescriptiveMigrationName> --project GRM-Backend/GRM_Backend/GRM_Backend.csproj
```

*Example:*
```bash
dotnet ef migrations add AddSupplierTable --project GRM-Backend/GRM_Backend/GRM_Backend.csproj
```

This generates a timestamped migration file inside `GRM-Backend/GRM_Backend/Migrations/`.

---

### B. Applying Migrations to the Database Manually
To apply pending migrations immediately without starting the server:

```bash
dotnet ef database update --project GRM-Backend/GRM_Backend/GRM_Backend.csproj
```

---

### C. Listing All Migrations
To check which migrations have been applied and which are pending:

```bash
dotnet ef migrations list --project GRM-Backend/GRM_Backend/GRM_Backend.csproj
```

---

### D. Reverting / Rolling Back Migrations

* **Revert database to a previous migration:**
  ```bash
  dotnet ef database update <TargetMigrationName> --project GRM-Backend/GRM_Backend/GRM_Backend.csproj
  ```
  *Example (roll back to InitialCreate):*
  ```bash
  dotnet ef database update InitialCreate --project GRM-Backend/GRM_Backend/GRM_Backend.csproj
  ```

* **Remove the latest migration file (only if NOT applied to DB or after rolling back):**
  ```bash
  dotnet ef migrations remove --project GRM-Backend/GRM_Backend/GRM_Backend.csproj
  ```

---

### E. Generating Raw SQL Migration Scripts
To view or export the exact SQL generated for production:

```bash
# Generate script for all migrations from scratch
dotnet ef migrations script --project GRM-Backend/GRM_Backend/GRM_Backend.csproj -o migration.sql

# Generate script between two specific migrations
dotnet ef migrations script <FromMigration> <ToMigration> --project GRM-Backend/GRM_Backend/GRM_Backend.csproj -o update.sql
```

---

## 5. Resetting the Database from Scratch

If you ever need a completely clean database:

```bash
# 1. Stop and remove the Postgres container
docker rm -f grm-postgres

# 2. Re-create the container with the GRM database
docker run --name grm-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=GRM \
  -p 5432:5432 \
  -d postgres:16

# 3. Apply all migrations
dotnet ef database update --project GRM-Backend/GRM_Backend/GRM_Backend.csproj
```

---

## 6. Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `Connection refused (localhost:5432)` | Docker container is stopped. | Run `docker start grm-postgres`. |
| `dotnet: command not found: dotnet-ef` | Tools directory not in PATH. | Run `export PATH="$PATH:$HOME/.dotnet/tools"` or use `/home/$USER/.dotnet/tools/dotnet-ef`. |
| `Database 'GRM' does not exist` | Database was not created in container. | Run `docker exec -i grm-postgres psql -U postgres -c "CREATE DATABASE \"GRM\";"` |
| `Table already exists` | Manual changes conflict with EF Core. | Revert conflicting migration or inspect with DBeaver. |
