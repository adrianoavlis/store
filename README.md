# Valeria Store Static Site

This repository hosts the static storefront for Valeria Store. The project is built with [Vite](https://vitejs.dev/) and serves pre-generated JSON data from the `public/data` directory. There is no backend application or database involved.

## Removal of Spring configuration

A legacy Spring Boot backend previously shipped with the project. All traces of that backend—including the `src/main/resources/application.properties` file that contained `spring.datasource.*` and JPA settings—have been removed. The GitHub Actions workflow now guards against reintroducing JDBC/JPA configuration so the project remains a purely static site.

## Local development

```bash
npm install
npm run dev
```

The development server runs at `http://localhost:5173/` by default.

## Deployment

Deployments are handled by GitHub Actions via the `Deploy static site` workflow, which publishes the production build to GitHub Pages.

### Handling secrets for automations

If future automations (for example, scripts that hydrate the Instagram feed) require credentials, define them as GitHub Secrets. The build step already exposes an optional `INSTAGRAM_ACCESS_TOKEN` variable sourced from `${{ secrets.INSTAGRAM_ACCESS_TOKEN }}` so sensitive values never need to live in the repository. Your scripts can read that variable during `npm run build`.
