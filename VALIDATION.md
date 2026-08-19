# Validation performed in artifact environment

The generated repository was checked for:

- valid frontend JSON configuration;
- valid Maven `pom.xml` XML;
- all relative TypeScript imports resolve to files in the repository;
- no frontend source references browser local/session storage for authentication;
- shell-script syntax;
- Java source parsing with the local `javac` frontend (external Spring/Jakarta symbols are unavailable in this environment);
- TypeScript parsing with local `tsc` while excluding expected unresolved external-package diagnostics.

Full dependency-aware builds could **not** be completed in the artifact environment:

- Maven is not installed in this container;
- the container Node version is 22.16.0, below the project's Angular 22 engine requirement;
- `npm install` could not complete before the environment network timeout.

Run the authoritative checks on the development machine:

```bash
# backend
cd backend
mvn clean test

# frontend: use Node 24 or a compatible Node version
cd frontend
npm install
npm run build
npm test
```

The user's reported Java 21 and Maven 3.9.9 are appropriate for the backend.
