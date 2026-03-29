#!/bin/bash
# Let's Encrypt 인증서 자동 갱신 스크립트

certbot renew --quiet
docker compose -f /path/to/docker-compose.prod.yml restart nginx
