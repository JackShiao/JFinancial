# =====================================================
# Stage 1 — BUILD
# 使用含 Maven 的完整 JDK image 來編譯打包
# =====================================================
FROM eclipse-temurin:21-jdk AS build

WORKDIR /app

# 先只複製 pom.xml + mvnw，讓 Maven 相依套件被 Docker layer 快取
# 只要 pom.xml 沒變，下次 build 就不需要重新下載套件
COPY mvnw ./
COPY .mvn .mvn
COPY pom.xml ./

# 下載相依套件（不編譯程式碼）
RUN chmod +x ./mvnw && ./mvnw dependency:go-offline -q

# 複製程式碼並打包，跳過測試（測試已由 CI 負責）
COPY src ./src
RUN ./mvnw package -DskipTests -q

# =====================================================
# Stage 2 — RUNTIME
# 只用輕量 JRE image（不含 Maven / JDK 編譯工具）
# image 大小：~600MB → ~200MB
# =====================================================
FROM eclipse-temurin:21-jre

WORKDIR /app

# 從 build stage 複製打包好的 JAR
COPY --from=build /app/target/js-financial-0.0.1-SNAPSHOT.jar app.jar

# Cloud Run 預設使用 PORT 環境變數（預設 8080）
EXPOSE 8080

# 以 non-root 使用者執行（安全最佳實踐）
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

ENTRYPOINT ["java", "-jar", "app.jar"]
