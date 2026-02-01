# Azure App Service Deployment Plan

## Overview

Deploy the Hono API to Azure App Service as a Docker container, with CI/CD via GitHub Actions. PostgreSQL and Redis are already provisioned in Azure.

**What we need to create/configure:**

- Azure Container Registry (ACR) to host Docker images
- Azure App Service (Linux, Docker container)
- GitHub Actions workflow for CI/CD
- Environment variables and App Service settings

**Files to create:** `.github/workflows/deploy.yml`
**Existing files changed:** None (Dockerfile and app code are already deployment-ready)

---

## Step 1: Create Azure Container Registry (ACR)

```bash
RESOURCE_GROUP="rg-kore"
ACR_NAME="betemplatecr"          # globally unique, lowercase alphanumeric
LOCATION="eastasia"               # adjust to your region

# Create resource group if needed
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create ACR
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true
```

---

## Step 2: Create App Service Plan + Web App

```bash
APP_SERVICE_PLAN="asp-kore"
WEB_APP_NAME="app-kore"   # globally unique

# Create Linux App Service Plan (P1v3 for production, B1 for staging/dev)
az appservice plan create \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --is-linux \
  --sku P1v3

# Create Web App with Docker container
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --name $WEB_APP_NAME \
  --deployment-container-image-name "${ACR_NAME}.azurecr.io/kore:latest"
```

**SKU notes:**

- **B1**: Minimum for always-on. No auto-scale or deployment slots.
- **P1v3**: Recommended for production. Supports always-on, deployment slots, auto-scale, and VNet integration.

---

## Step 3: Connect ACR to App Service (Managed Identity)

```bash
# Assign managed identity to the web app
az webapp identity assign \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME

# Grant AcrPull role to the managed identity
PRINCIPAL_ID=$(az webapp identity show --resource-group $RESOURCE_GROUP --name $WEB_APP_NAME --query principalId --output tsv)
ACR_ID=$(az acr show --name $ACR_NAME --query id --output tsv)

az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role AcrPull \
  --scope $ACR_ID

# Tell App Service to use managed identity for ACR
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --generic-configurations '{"acrUseManagedIdentityCreds": true}'
```

---

## Step 4: Configure App Service Settings

### 4a. Environment Variables

```bash
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --settings \
    NODE_ENV="production" \
    PORT="3000" \
    WEBSITES_PORT="3000" \
    BASE_URL="https://${WEB_APP_NAME}.azurewebsites.net" \
    CORS_ORIGINS="https://your-frontend-domain.com" \
    DATABASE_URL="postgresql://user:pass@your-pg.postgres.database.azure.com:5432/dbname?schema=public&sslmode=require" \
    AUTH_SECRET="<generate-with-openssl-rand-base64-32>" \
    REDIS_URL="rediss://default:<access-key>@your-redis.redis.cache.windows.net:6380" \
    SOCKET_IO_ENABLED="true" \
    SOCKET_IO_PATH="/socket.io"
```

**Critical details:**

- `WEBSITES_PORT=3000` tells Azure which container port to forward traffic to
- `DATABASE_URL` must include `sslmode=require` for Azure PostgreSQL
- `REDIS_URL` must use `rediss://` (TLS) on port 6380 for Azure Cache for Redis
- `AUTH_SECRET` must be 32+ characters (validated by Zod on startup)

### 4b. Platform Settings

```bash
# Enable WebSockets (required for Socket.IO)
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --web-sockets-enabled true

# Enable always-on, health check, enforce TLS 1.2, disable FTPS
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --always-on true \
  --ftps-state Disabled \
  --min-tls-version 1.2 \
  --http20-enabled true \
  --generic-configurations '{"healthCheckPath": "/health"}'

# Increase container start timeout (default 230s, set 300s for safety)
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --settings WEBSITES_CONTAINER_START_TIME_LIMIT="300"
```

---

## Step 5: Network Access for PostgreSQL and Redis

Ensure the App Service can reach both services. Two options:

**Option A: Firewall rules (simpler)**

```bash
# Allow Azure services to access PostgreSQL
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name your-pg-server \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

**Option B: VNet integration + private endpoints (more secure, requires P1v3)**

- Create VNet with subnets for App Service and private endpoints
- Integrate App Service with VNet
- Create private endpoints for PostgreSQL and Redis

```bash
# Create VNet and subnets
az network vnet create \
  --resource-group $RESOURCE_GROUP \
  --name vnet-kore \
  --address-prefix 10.0.0.0/16 \
  --subnet-name snet-app \
  --subnet-prefix 10.0.1.0/24

az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name vnet-kore \
  --name snet-private-endpoints \
  --address-prefix 10.0.2.0/24

# Delegate the app subnet to App Service
az network vnet subnet update \
  --resource-group $RESOURCE_GROUP \
  --vnet-name vnet-kore \
  --name snet-app \
  --delegations Microsoft.Web/serverFarms

# Integrate App Service with VNet
az webapp vnet-integration add \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --vnet vnet-kore \
  --subnet snet-app

# Create private endpoint for PostgreSQL
az network private-endpoint create \
  --resource-group $RESOURCE_GROUP \
  --name pe-postgres \
  --vnet-name vnet-kore \
  --subnet snet-private-endpoints \
  --private-connection-resource-id $(az postgres flexible-server show --resource-group $RESOURCE_GROUP --name your-pg-server --query id --output tsv) \
  --group-ids postgresqlServer \
  --connection-name conn-postgres

# Create private endpoint for Redis
az network private-endpoint create \
  --resource-group $RESOURCE_GROUP \
  --name pe-redis \
  --vnet-name vnet-kore \
  --subnet snet-private-endpoints \
  --private-connection-resource-id $(az redis show --resource-group $RESOURCE_GROUP --name your-redis --query id --output tsv) \
  --group-ids redisCache \
  --connection-name conn-redis
```

---

## Step 6: Run Initial Database Migration

Before the first deployment, apply all Prisma migrations:

```bash
export DATABASE_URL="postgresql://user:pass@your-pg.postgres.database.azure.com:5432/dbname?schema=public&sslmode=require"
npx prisma migrate deploy --config prisma/prisma.config.ts
```

---

## Step 7: Create GitHub Actions CI/CD Workflow

### 7a. Set Up GitHub Secrets

| Secret              | Value                                            |
| ------------------- | ------------------------------------------------ |
| `ACR_LOGIN_SERVER`  | `betemplatecr.azurecr.io`                        |
| `ACR_USERNAME`      | ACR admin username                               |
| `ACR_PASSWORD`      | ACR admin password                               |
| `AZURE_CREDENTIALS` | JSON from `az ad sp create-for-rbac --json-auth` |
| `DATABASE_URL`      | Production PostgreSQL connection string          |
| `AZURE_WEBAPP_NAME` | `app-kore`                                |

Create the service principal for GitHub Actions:

```bash
az ad sp create-for-rbac \
  --name "sp-betemplate-deploy" \
  --role Contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/$RESOURCE_GROUP \
  --json-auth
```

Store the entire JSON output as the `AZURE_CREDENTIALS` GitHub secret.

### 7b. Create `.github/workflows/deploy.yml`

Three-stage pipeline: **test -> migrate -> build-and-deploy**

```yaml
name: Build and Deploy to Azure

on:
  push:
    branches: [main]

env:
  ACR_LOGIN_SERVER: ${{ secrets.ACR_LOGIN_SERVER }}
  IMAGE_NAME: kore
  AZURE_WEBAPP_NAME: ${{ secrets.AZURE_WEBAPP_NAME }}

permissions:
  contents: read

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Generate Prisma client
        run: pnpm db:generate

      - name: Type check
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Run tests
        run: pnpm test:run

  migrate:
    name: Run Database Migrations
    runs-on: ubuntu-latest
    needs: test
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run Prisma migrations
        run: npx prisma migrate deploy --config prisma/prisma.config.ts
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

  build-and-deploy:
    name: Build Image and Deploy
    runs-on: ubuntu-latest
    needs: [test, migrate]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to ACR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.ACR_LOGIN_SERVER }}
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push Docker image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: ./Dockerfile
          target: production
          push: true
          tags: |
            ${{ env.ACR_LOGIN_SERVER }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
            ${{ env.ACR_LOGIN_SERVER }}/${{ env.IMAGE_NAME }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to Azure App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          images: ${{ env.ACR_LOGIN_SERVER }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

**Pipeline design:**

- **test**: Runs typecheck, lint, and tests. Fast feedback on broken code.
- **migrate**: Runs `prisma migrate deploy` against production DB. Aborts deployment if migrations fail.
- **build-and-deploy**: Builds Docker image, pushes to ACR, deploys to App Service. Only runs if tests and migrations pass.
- Images tagged with both `github.sha` (immutable, for rollback) and `latest`.

---

## Step 8: Enable Logging and Monitoring

```bash
# Enable container and application logging
az webapp log config \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --application-logging filesystem \
  --level information \
  --docker-container-logging filesystem

# Stream logs in real-time (for debugging)
az webapp log tail \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME
```

Optional: Set `SENTRY_DSN` in app settings for error tracking (already supported by the app's error middleware).

### Optional: Alerts

```bash
# Alert on high 5xx error rate
az monitor metrics alert create \
  --resource-group $RESOURCE_GROUP \
  --name "alert-high-5xx" \
  --scopes $(az webapp show --resource-group $RESOURCE_GROUP --name $WEB_APP_NAME --query id --output tsv) \
  --condition "total Http5xx > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --description "High server error rate"
```

---

## Step 9 (Optional): Deployment Slots for Zero-Downtime

With P1v3, use a staging slot:

```bash
# Create staging slot
az webapp deployment slot create \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --slot staging

# Configure staging slot with same environment variables
# ...

# After deploying to staging and verifying health:
az webapp deployment slot swap \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --slot staging \
  --target-slot production
```

---

## Step 10 (Optional): Custom Domain and TLS

```bash
# Add custom domain
az webapp config hostname add \
  --resource-group $RESOURCE_GROUP \
  --webapp-name $WEB_APP_NAME \
  --hostname api.yourdomain.com

# Create free managed SSL certificate
az webapp config ssl create \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --hostname api.yourdomain.com

# Bind the certificate
az webapp config ssl bind \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI
```

Remember to update `BASE_URL` in app settings to the custom domain.

---

## Pre-Deployment Checklist

- [ ] Resource group, ACR, App Service Plan, and Web App created
- [ ] Managed identity configured for ACR pull
- [ ] All required environment variables set in App Service
- [ ] `WEBSITES_PORT=3000` configured
- [ ] WebSockets enabled
- [ ] Always-on enabled
- [ ] Health check path set to `/health`
- [ ] PostgreSQL accessible from App Service (firewall or VNet)
- [ ] Redis accessible from App Service
- [ ] `AUTH_SECRET` generated (32+ chars)
- [ ] `BASE_URL` matches actual deployment URL
- [ ] Initial `prisma migrate deploy` executed
- [ ] GitHub Secrets configured
- [ ] GitHub Actions workflow file committed

## Verification

1. Push to `main` and confirm the GitHub Actions workflow completes all 3 stages
2. Visit `https://<app-name>.azurewebsites.net/health` and confirm `{"status":"ok"}`
3. Check `/openapi.json` returns the API schema
4. Check `az webapp log tail` for startup logs confirming Socket.IO, BullMQ, and Prisma initialized
5. Test an authenticated endpoint to confirm database and auth are working
