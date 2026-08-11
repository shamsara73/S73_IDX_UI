FROM denoland/deno:2.9.0

WORKDIR /app

COPY . .

# Build the SPA (creates dist/ + local node_modules for vite)
RUN deno task ui:build

EXPOSE 50270

# Server binds 0.0.0.0:50270, serves SPA + API, hourly IDX cron
CMD ["deno", "run", "-A", "--unstable-cron", "--node-modules-dir", "src/server/index.ts"]
