.DEFAULT_GOAL := help
COMPOSE := docker compose

.PHONY: help env config up down logs ps test test-image smoke tools clean

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-12s %s\n", $$1, $$2}'

env: ## Create .env from .env.example (if missing)
	@test -f .env || cp .env.example .env && echo ".env ready"

config: ## Validate and print the resolved Compose file
	$(COMPOSE) config

up: env ## Build images and start the stack in the background
	$(COMPOSE) up -d --build

ps: ## Show service status and health
	$(COMPOSE) ps

logs: ## Follow logs from all services
	$(COMPOSE) logs -f

test: ## Run API unit tests locally (needs Node.js 20+)
	cd api && npm ci && npm test

test-image: ## Run API unit tests inside Docker (test build stage)
	docker build --target test -t taskboard-api:test ./api

smoke: ## End-to-end smoke test against the running stack
	./scripts/smoke-test.sh

tools: ## Start the optional Adminer DB UI
	$(COMPOSE) --profile tools up -d

down: ## Stop and remove containers and networks (keeps data)
	$(COMPOSE) --profile tools down

clean: ## Remove containers, networks, the DB volume and built images
	$(COMPOSE) --profile tools down -v --rmi local
