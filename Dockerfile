# ──────────────────────────────────────────────
# Stage 1: Build the React frontend
# ──────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ──────────────────────────────────────────────
# Stage 2: Build the Spring Boot backend JAR
# (also copies the compiled frontend into the
#  JAR's static resources so one container
#  serves everything)
# ──────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17 AS backend-build
WORKDIR /app

# Cache Maven dependencies first (only re-downloads when pom.xml changes)
COPY pom.xml ./
RUN mvn -B dependency:resolve dependency:resolve-plugins

# Copy backend source
COPY src/ src/

# Copy built frontend into Spring Boot static resources
COPY --from=frontend-build /app/frontend/dist/ src/main/resources/static/

# Build the fat JAR (skip tests — CI already ran them)
RUN mvn -B package -DskipTests

# ──────────────────────────────────────────────
# Stage 3: Minimal runtime image
# ──────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine AS runtime
WORKDIR /app

# Security: run as non-root user
RUN addgroup -S payflow && adduser -S payflow -G payflow
USER payflow

# Copy the fat JAR from the build stage
COPY --from=backend-build /app/target/*.jar app.jar

# Expose Spring Boot default port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# Run with UTC timezone
ENTRYPOINT ["java", "-Duser.timezone=UTC", "-jar", "app.jar"]
