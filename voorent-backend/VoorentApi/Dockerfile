# ── Stage 1: Build ──────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

COPY VoorentApi.csproj .
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# ── Stage 2: Runtime ─────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app

# Non-root user for security
RUN addgroup -S voorent && adduser -S voorent -G voorent
USER voorent

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 5000

ENTRYPOINT ["dotnet", "VoorentApi.dll"]
