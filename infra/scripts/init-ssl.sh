#!/bin/bash
# SSL 인증서 초기 발급 스크립트
# 사용법: ./infra/scripts/init-ssl.sh your-domain.com your-email@gmail.com

DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "Usage: $0 <domain> <email>"
  exit 1
fi

echo "=== SSL 인증서 발급: $DOMAIN ==="

# 1. Certbot으로 인증서 발급
sudo certbot certonly --standalone \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive

# 2. nginx.prod.conf에서 도메인 치환
sed -i "s/your-domain.com/$DOMAIN/g" infra/nginx/nginx.prod.conf

echo "=== 완료. docker compose -f docker-compose.prod.yml up -d 로 서비스를 시작하세요. ==="
