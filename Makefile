.PHONY: check backend-test backend-run frontend-install frontend-run frontend-test frontend-build angular-skill

check:
	./scripts/check-local.sh

backend-test:
	cd backend && mvn test

backend-run:
	cd backend && mvn spring-boot:run

frontend-install:
	cd frontend && npm install

frontend-run:
	cd frontend && npm start

frontend-test:
	cd frontend && npm test

frontend-build:
	cd frontend && npm run build

angular-skill:
	./scripts/install-official-angular-skill.sh

.PHONY: match-test match-e2e

match-test:
	cd backend && mvn -Dtest=InteractionServiceMatchTest,MatchServiceTest,MatchReconciliationListenerTest,MatchLifecycleTest test
	cd frontend && npm test -- --watch=false

match-e2e:
	./scripts/e2e-match-flow.sh
