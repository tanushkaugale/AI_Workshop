#!/bin/bash
# ==============================================================================
# AWS Deployment Script for Sanjivani MCP Platform
# Deploys to AWS App Runner / Amazon Elastic Container Registry (ECR)
# ==============================================================================

set -e

# Configuration
AWS_REGION="us-east-1"
IMAGE_NAME="sanjivani-mcp-app"
TAG="latest"

echo "=========================================================="
echo "🌾 Deploying Sanjivani MCP Platform to AWS"
echo "=========================================================="

# 1. Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   https://aws.amazon.com/cli/"
    exit 1
fi

# 2. Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_NAME}"

echo "✅ AWS Account ID: ${AWS_ACCOUNT_ID}"
echo "✅ Target ECR URI: ${ECR_URI}:${TAG}"

# 3. Create ECR repository if it does not exist
echo "📦 Ensuring ECR repository exists..."
aws ecr describe-repositories --repository-names ${IMAGE_NAME} --region ${AWS_REGION} > /dev/null 2>&1 || \
aws ecr create-repository --repository-name ${IMAGE_NAME} --region ${AWS_REGION}

# 4. Authenticate Docker with AWS ECR
echo "🔑 Logging in to AWS ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# 5. Build Docker Image
echo "🔨 Building multi-stage container image..."
docker build -t ${IMAGE_NAME}:${TAG} .
docker tag ${IMAGE_NAME}:${TAG} ${ECR_URI}:${TAG}

# 6. Push to ECR
echo "🚀 Pushing image to Amazon ECR..."
docker push ${ECR_URI}:${TAG}

echo "=========================================================="
echo "🎉 Image pushed successfully to ECR!"
echo "   ${ECR_URI}:${TAG}"
echo ""
echo "Next step: Deploy service in AWS App Runner Console or CLI:"
echo "   aws apprunner create-service --service-name ${IMAGE_NAME} ..."
echo "=========================================================="
