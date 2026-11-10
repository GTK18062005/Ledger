# ==============================================================================
# BalanceVault Backend Engine - Multi-Stage Production Dockerfile
# ==============================================================================

# Stage 1: Build JAR package using Maven & Eclipse Temurin JDK 21
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# Cache dependency layer
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy sources and compile production artifact
COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Hardened Minimal JRE Runtime
FROM eclipse-temurin:21-jre-alpine AS runner

# Create non-root balancevault user for defense-in-depth container security
RUN addgroup -S balancevault && adduser -S balancevault -G balancevault

WORKDIR /app

# Copy executable jar from builder stage
COPY --from=builder /build/target/ledgerline-engine-*.jar /app/balancevault-engine.jar

# Set ownership
RUN chown -R balancevault:balancevault /app

USER balancevault

EXPOSE 8080

ENV SPRING_PROFILES_ACTIVE=prod \
    JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/balancevault-engine.jar"]

