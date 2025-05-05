#!/bin/bash

TEST_DATABASE_URL="postgres://postgres:postgres@localhost:5433/postgres?sslmode=disable" go test -v