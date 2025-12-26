#!/bin/bash
# =============================================================================
# OmniChannel SaaS Platform - Automated Backup Script
# Backs up PostgreSQL database and Redis data
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
BACKUP_DIR="/opt/omnichannel/backups"
POSTGRES_CONTAINER="omnichannel-db"
REDIS_CONTAINER="omnichannel-redis"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}OmniChannel Backup - ${DATE}${NC}"
echo -e "${GREEN}========================================${NC}"

# Create backup directories
mkdir -p ${BACKUP_DIR}/postgres
mkdir -p ${BACKUP_DIR}/redis

# =============================================================================
# PostgreSQL Backup
# =============================================================================
echo -e "${YELLOW}Backing up PostgreSQL database...${NC}"

# Get database credentials from environment or use defaults
DB_USER=${POSTGRES_USER:-omnichannel}
DB_NAME=${POSTGRES_DB:-omnichannel}

# Perform dump inside container and output to backup directory
docker exec ${POSTGRES_CONTAINER} pg_dump -U ${DB_USER} -d ${DB_NAME} | gzip > ${BACKUP_DIR}/postgres/db_backup_${DATE}.sql.gz

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PostgreSQL backup completed: db_backup_${DATE}.sql.gz${NC}"
    # Get backup size
    BACKUP_SIZE=$(du -h ${BACKUP_DIR}/postgres/db_backup_${DATE}.sql.gz | cut -f1)
    echo -e "  Size: ${BACKUP_SIZE}"
else
    echo -e "${RED}✗ PostgreSQL backup failed!${NC}"
    exit 1
fi

# =============================================================================
# Redis Backup
# =============================================================================
echo -e "${YELLOW}Backing up Redis data...${NC}"

# Trigger Redis BGSAVE and copy RDB file
docker exec ${REDIS_CONTAINER} redis-cli BGSAVE

# Wait for background save to complete
sleep 5

# Copy RDB file from container
docker cp ${REDIS_CONTAINER}:/data/dump.rdb ${BACKUP_DIR}/redis/redis_backup_${DATE}.rdb 2>/dev/null || true

if [ -f "${BACKUP_DIR}/redis/redis_backup_${DATE}.rdb" ]; then
    gzip ${BACKUP_DIR}/redis/redis_backup_${DATE}.rdb
    echo -e "${GREEN}✓ Redis backup completed: redis_backup_${DATE}.rdb.gz${NC}"
else
    echo -e "${YELLOW}⚠ Redis backup skipped (no RDB file found)${NC}"
fi

# =============================================================================
# Cleanup Old Backups
# =============================================================================
echo -e "${YELLOW}Cleaning up backups older than ${RETENTION_DAYS} days...${NC}"

# Remove old PostgreSQL backups
find ${BACKUP_DIR}/postgres -name "db_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
PG_DELETED=$?

# Remove old Redis backups
find ${BACKUP_DIR}/redis -name "redis_backup_*.rdb.gz" -mtime +${RETENTION_DAYS} -delete
REDIS_DELETED=$?

echo -e "${GREEN}✓ Cleanup completed${NC}"

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Backup Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Date: $(date)"
echo -e "PostgreSQL: ${BACKUP_DIR}/postgres/db_backup_${DATE}.sql.gz"
echo -e "Redis: ${BACKUP_DIR}/redis/redis_backup_${DATE}.rdb.gz"
echo ""

# List recent backups
echo -e "Recent PostgreSQL backups:"
ls -lh ${BACKUP_DIR}/postgres/*.sql.gz 2>/dev/null | tail -5 || echo "  None found"
echo ""
echo -e "Recent Redis backups:"
ls -lh ${BACKUP_DIR}/redis/*.rdb.gz 2>/dev/null | tail -5 || echo "  None found"

echo ""
echo -e "${GREEN}Backup completed successfully!${NC}"
