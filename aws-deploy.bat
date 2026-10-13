@echo off
REM ==============================================================================
REM Windows AWS Deployment Batch Script for Sanjivani MCP Platform
REM ==============================================================================

set AWS_REGION=us-east-1
set IMAGE_NAME=sanjivani-mcp-app
set TAG=latest

echo ==========================================================
echo 🌾 Deploying Sanjivani MCP Platform to AWS
echo ==========================================================

for /f "tokens=*" %%i in ('aws sts get-caller-identity --query Account --output text') do set AWS_ACCOUNT_ID=%%i
set ECR_URI=%AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%IMAGE_NAME%

echo Account ID: %AWS_ACCOUNT_ID%
echo Target ECR: %ECR_URI%:%TAG%

aws ecr describe-repositories --repository-names %IMAGE_NAME% --region %AWS_REGION% >nul 2>&1
if errorlevel 1 (
    echo Creating ECR repository...
    aws ecr create-repository --repository-name %IMAGE_NAME% --region %AWS_REGION%
)

echo Logging in to Amazon ECR...
aws ecr get-login-password --region %AWS_REGION% | docker login --username AWS --password-stdin %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com

echo Building Docker image...
docker build -t %IMAGE_NAME%:%TAG% .
docker tag %IMAGE_NAME%:%TAG% %ECR_URI%:%TAG%

echo Pushing image to Amazon ECR...
docker push %ECR_URI%:%TAG%

echo ==========================================================
echo Image successfully pushed to Amazon ECR:
echo %ECR_URI%:%TAG%
echo ==========================================================
pause
