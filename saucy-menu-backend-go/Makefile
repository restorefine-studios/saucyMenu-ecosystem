SQLC := $(shell go env GOPATH)/bin/sqlc

include .env
export

.PHONY: sqlc test run worker tidy
sqlc:
	$(SQLC) generate
test:
	go test ./...
run:
	go run ./cmd/server
worker:
	go run ./cmd/worker
tidy:
	go mod tidy
