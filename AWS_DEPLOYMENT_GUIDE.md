# 🌾 Sanjivani MCP Platform — AWS Cloud Hosting Guide

This guide details how to deploy the **Sanjivani Sugar Factory MCP AI Application** (Angular 19 Frontend + Node.js MCP Express Server + PostgreSQL Database) onto **Amazon Web Services (AWS)**.

---

## 🏗️ Architecture Overview

```text
                                  +-----------------------------+
                                  |        Web Clients          |
                                  +--------------+--------------+
                                                 |
                                                 v
                                  +-----------------------------+
                                  |    Route 53 / CloudFront    |
                                  |       (SSL Termination)     |
                                  +--------------+--------------+
                                                 |
                                                 v
                                  +-----------------------------+
                                  |       AWS App Runner        |
                                  |             OR              |
                                  |      Amazon ECS Fargate     |
                                  | (Container: Angular+Express)|
                                  +-------+--------------+------+
                                          |              |
                    (Queries over MCP)    |              | (Model Context)
                                          v              v
               +----------------------------+   +-------------------+
               |   Amazon RDS PostgreSQL    |   |    OpenAI API     |
               |  (sanjivani_db, farmers)   |   |   (gpt-4.1-mini)  |
               +----------------------------+   +-------------------+
```

---

## 🚀 Option 1: AWS App Runner (Recommended & Easiest)

**AWS App Runner** provides fully managed container execution, automatic scaling, built-in HTTPS, and zero server maintenance.

### 1. Build and Push Container to Amazon ECR
```bash
# Set your AWS Region & Account ID
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/sanjivani-mcp-app"

# Authenticate Docker with Amazon ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Create repository if not already created
aws ecr create-repository --repository-name sanjivani-mcp-app --region ${AWS_REGION} || true

# Build & push Docker image
docker build -t sanjivani-mcp-app .
docker tag sanjivani-mcp-app:latest ${ECR_URI}:latest
docker push ${ECR_URI}:latest
```
*(On Windows, you can simply double-click `aws-deploy.bat`)*

### 2. Create the App Runner Service
Run with AWS CLI:
```bash
aws apprunner create-service \
  --service-name sanjivani-mcp-service \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "'"${ECR_URI}"':latest",
      "ImageConfiguration": {
        "Port": "3000",
        "RuntimeEnvironmentVariables": {
          "DB_HOST": "your-rds-endpoint.us-east-1.rds.amazonaws.com",
          "DB_PORT": "5432",
          "DB_NAME": "sanjivani_db",
          "DB_USER": "postgres",
          "DB_PASSWORD": "your_database_password",
          "OPENAI_API_KEY": "sk-proj-your-openai-api-key"
        }
      },
      "ImageRepositoryType": "ECR"
    }
  }'
```
App Runner will provide a live HTTPS URL (e.g. `https://xxxxxx.us-east-1.awsapprunner.com`) within 2 minutes!

---

## 🐘 Setting Up Amazon RDS for PostgreSQL

1. Open the **Amazon RDS Console** and click **Create Database**.
2. Select **PostgreSQL** (version 16 or 15).
3. Template: **Free tier** (db.t4g.micro) or **Production**.
4. Settings:
   - DB instance identifier: `sanjivani-db`
   - Master username: `postgres`
   - Master password: `your_secure_password`
5. Connectivity:
   - Virtual Private Cloud (VPC): Default or your production VPC.
   - Public access: **Yes** (if connecting from outside VPC) or use VPC peering / App Runner VPC connector.
   - Initial database name: `sanjivani_db`
6. Once provisioned, execute the database schema from `schema.sql`:
   ```bash
   psql -h sanjivani-db.xxxx.us-east-1.rds.amazonaws.com -U postgres -d sanjivani_db -f schema.sql
   ```

---

## 🌐 Option 2: S3 + CloudFront (Frontend) + ECS/App Runner (API)

If you prefer hosting the Angular client statically:
1. Build the production Angular bundle:
   ```bash
   npm --prefix frontend run build
   ```
2. Upload the `frontend/dist/frontend/browser` folder to an Amazon S3 bucket configured for static website hosting:
   ```bash
   aws s3 sync frontend/dist/frontend/browser s3://your-sanjivani-mcp-bucket --delete
   ```
3. Attach an Amazon CloudFront distribution pointing to the S3 bucket with an origin behavior mapping `/api/*` to your backend server.

---

## 🔐 Security Best Practices on AWS

- **AWS Secrets Manager**: Store `OPENAI_API_KEY` and `DB_PASSWORD` in Secrets Manager rather than plaintext environment variables.
- **Security Groups**: Restrict Amazon RDS port `5432` ingress strictly to the Security Group of the App Runner / ECS task.
- **HTTPS & SSL**: App Runner and CloudFront manage SSL/TLS certificates automatically with zero configuration.
