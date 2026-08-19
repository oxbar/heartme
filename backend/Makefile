.PHONY: up down logs test package clean
up:
	docker compose up -d --build
down:
	docker compose down
logs:
	docker compose logs -f app
test:
	./mvnw test
package:
	./mvnw clean package
clean:
	./mvnw clean
