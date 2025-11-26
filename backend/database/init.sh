#!/bin/bash

# MySQL 데이터베이스 초기화 스크립트

echo "🗄️  Initializing database..."

# MySQL 접속 정보
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}

# 비밀번호 입력 프롬프트
if [ -z "$DB_PASSWORD" ]; then
  echo "Enter MySQL password for user '$DB_USER':"
  read -s DB_PASSWORD
fi

# SQL 파일 실행
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" < database/schema.sql

if [ $? -eq 0 ]; then
  echo "✅ Database initialized successfully!"
else
  echo "❌ Failed to initialize database"
  exit 1
fi
