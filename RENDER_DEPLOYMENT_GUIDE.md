# 🚀 Render Deployment Guide - Employee Leave Management System

This guide explains how to deploy the **Employee Leave Management System (LeaveHub)** to **Render** using Docker.

---

## 🏗️ Architecture Overview

The project is packaged using a **Multi-Stage Production Dockerfile**:
1. **Stage 1 (Frontend)**: Node 20 builds the React Vite application into optimized static assets.
2. **Stage 2 (Backend)**: Maven packages Spring Boot with the built frontend embedded in `src/main/resources/static`.
3. **Stage 3 (Runtime)**: Eclipse Temurin OpenJDK 17 lightweight JRE runs the single self-contained application.

### Why this setup is optimal for Render:
- ✅ **100% Free-Tier Friendly**: Requires only **one** Render Web Service instead of two.
- ✅ **Zero CORS Headaches**: Frontend and backend share the exact same origin (`https://your-app.onrender.com`).
- ✅ **HttpOnly Cookies Work Seamlessly**: Secure cookies (`SameSite=Lax`) work without cross-site blocking.
- ✅ **Automatic Dynamic Port**: Spring Boot automatically adapts to Render's dynamic `$PORT`.

---

## 📋 Step 1: Get a Free Cloud MySQL Database

Render's built-in managed database is PostgreSQL, but this application uses MySQL. You can get a free MySQL database in under 2 minutes from any of these providers:

### Option A: Aiven for MySQL (Recommended - Free Tier)
1. Go to [https://aiven.io](https://aiven.io) and create a free account.
2. Click **Create Service** → Select **MySQL** → Select **Free Plan**.
3. Choose a region (e.g., closest to your Render region).
4. Once created, copy the **Service URI** or the individual credentials:
   - **Host**
   - **Port** (e.g., `12345`)
   - **User** (`avnadmin`)
   - **Password**
   - **Database Name** (`defaultdb`)

### Option B: TiDB Serverless (Free Forever MySQL-Compatible)
1. Go to [https://tidbcloud.com](https://tidbcloud.com) and create a free cluster.
2. Under cluster connection details, select **General** / **Java**.
3. Copy the JDBC connection URL.

---

## 🚀 Step 2: Deploy to Render

### Method 1: Using Render Dashboard (Recommended & Simple)

1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → Select **Web Service**.
3. Connect your GitHub repository:
   ```text
   https://github.com/shri2004S/Employee-Leave-Management-1.git
   ```
4. Configure the service settings:
   | Setting | Value |
   |---|---|
   | **Name** | `leavehub-app` (or any name you choose) |
   | **Region** | Oregon (US West) or Frankfurt (EU) |
   | **Branch** | `main` |
   | **Runtime** | **Docker** |
   | **Dockerfile Path** | `./Dockerfile` |
   | **Instance Type** | **Free** |

5. Scroll down to **Environment Variables** and add the following:

   | Key | Value | Notes |
   |---|---|---|
   | `SPRING_DATASOURCE_URL` | `jdbc:mysql://<HOST>:<PORT>/<DB_NAME>?useSSL=true&requireSSL=false&allowPublicKeyRetrieval=true` | Replace with your Cloud MySQL URL |
   | `SPRING_DATASOURCE_USERNAME` | `<YOUR_DB_USERNAME>` | e.g. `avnadmin` |
   | `SPRING_DATASOURCE_PASSWORD` | `<YOUR_DB_PASSWORD>` | Your cloud MySQL password |
   | `JWT_SECRET` | `404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970` | 256-bit secret key for signing JWTs |
   | `APP_COOKIE_SECURE` | `true` | Enables HTTPS-only secure cookies on Render |
   | `JAVA_OPTS` | `-Xms256m -Xmx480m -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError` | Memory tuning for 512MB RAM |

6. Click **Create Web Service**.
7. Render will automatically pull the repo, build the Docker image, run database migrations, and deploy!

---

### Method 2: 1-Click Blueprint (Using `render.yaml`)

1. In Render Dashboard, click **New +** → **Blueprint**.
2. Select your repository.
3. Render reads `render.yaml` automatically.
4. Input your database credentials when prompted.
5. Click **Apply**.

---

## 🗄️ Step 3: Initialize Database Sample Data

Once your application connects to MySQL, Spring Boot will automatically create all tables via `ddl-auto=update`.

To seed initial test users and sample leaves, run the script [`database/sample-data.sql`](file:///c:/Users/shri/OneDrive/Desktop/Empolyee%20Leave%20Management%201/database/sample-data.sql) in your cloud MySQL console:

### Default Test Credentials:
- **Admin**:
  - Email: `admin@settribe.com`
  - Password: `Password@123`
- **Employee**:
  - Email: `john@settribe.com`
  - Password: `Password@123`

---

## 🐳 Local Docker Testing (Before Deploying)

You can run the entire stack locally using `docker-compose`:

```bash
# Build and start Database, Backend, and Frontend containers
docker-compose up --build

# Open the app in your browser:
# Frontend: http://localhost:5173
# Backend API: http://localhost:8080
```

To stop containers:
```bash
docker-compose down
```

---

## 🔍 Troubleshooting Checklist

| Issue | Cause | Fix |
|---|---|---|
| **Free tier spin down (delay on first request)** | Render free services sleep after 15 min of inactivity. | Allow ~30–50 seconds on cold start or use an uptime pinger (e.g. UptimeRobot) targeting `/api/auth/me`. |
| **Database connection refused** | Cloud MySQL requires SSL or public IP access. | Ensure JDBC URL includes `?useSSL=true&allowPublicKeyRetrieval=true`. |
| **Out of Memory Error (OOM)** | JVM exceeding Render free tier 512MB RAM limit. | The provided Dockerfile includes `-Xms256m -Xmx480m -XX:+UseG1GC` to stay safely within memory bounds. |
| **Cookie not saved on login** | Non-HTTPS domain with `APP_COOKIE_SECURE=true`. | Only set `APP_COOKIE_SECURE=true` on live Render HTTPS URLs (`https://*.onrender.com`). |

