# ==============================================================================
# Multi-Stage Production Dockerfile for Render (Full-Stack Unified Service)
# - Stage 1: Build React (Vite) Frontend
# - Stage 2: Build Spring Boot Backend with embedded static frontend assets
# - Stage 3: Lightweight, Secure OpenJDK 17 Runtime
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
# Build production bundle to /app/frontend/dist
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Build Spring Boot Backend
# ------------------------------------------------------------------------------
FROM maven:3.9.6-eclipse-temurin-17 AS backend-builder
WORKDIR /app/backend

# Copy Maven POM and pre-fetch dependencies for faster cached builds
COPY backend/pom.xml ./
RUN mvn dependency:go-offline -B

# Copy backend source code
COPY backend/src ./src

# Copy built frontend assets into Spring Boot's static resources directory
COPY --from=frontend-builder /app/frontend/dist ./src/main/resources/static

# Package executable JAR (skip unit tests for fast deployment)
RUN mvn clean package -DskipTests -B

# ------------------------------------------------------------------------------
# Stage 3: Production Runtime Image
# ------------------------------------------------------------------------------
FROM eclipse-temurin:17-jre-jammy AS runner
WORKDIR /app

# Create a non-root application user for container security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copy executable jar from builder stage
COPY --from=backend-builder /app/backend/target/*.jar app.jar
RUN chown -R appuser:appgroup /app

USER appuser

# Render assigns dynamic PORT environment variable (default 8080)
ENV PORT=8080
ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError"

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

