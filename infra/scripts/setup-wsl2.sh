#!/bin/bash
# WSL2 Ubuntu에 Docker Engine 직접 설치 스크립트

set -e

echo "=== Docker Engine 설치 시작 ==="

# 기존 패키지 제거
sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# 의존성 설치
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Docker GPG 키 추가
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 저장소 추가
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker Engine 설치
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

echo "=== 설치 완료 ==="
echo "터미널을 재시작하거나 'newgrp docker' 실행 후 'docker run hello-world'로 확인하세요."
