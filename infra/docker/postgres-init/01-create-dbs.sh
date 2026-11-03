#!/bin/sh
# Runs once, on first init of the postgres volume. One Postgres instance, two
# isolated databases/roles so Medusa and Strapi never see each other's tables.
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE ROLE medusa WITH LOGIN PASSWORD '${MEDUSA_DB_PASSWORD}';
  CREATE DATABASE medusa OWNER medusa;
  CREATE ROLE strapi WITH LOGIN PASSWORD '${STRAPI_DB_PASSWORD}';
  CREATE DATABASE strapi OWNER strapi;
EOSQL
echo "created databases medusa and strapi"
