# 1. Distributed URL shortener with analytics

> base62 ID generation under high write concurrency (avoid collisions without a single bottleneck — look at Postgres sequences vs. Snowflake-style IDs), a hot-path redirect service that must be fast (Redis cache in front of Postgres, cache invalidation on updates), and a click-analytics pipeline (batched writes, time-bucketed aggregation, maybe TimescaleDB/partitioned tables). Good for learning read/write splitting and caching strategy.

## Project Structure

```simple text
url-shortener/
├── src/
│   ├── config/
│   │   ├── index.js              # loads & validates env vars (fail fast on boot)
│   │   ├── database.js           # pg pool config
│   │   ├── redis.js              # redis client config
│   │   └── env.schema.js         # joi/zod schema for env validation
│   │
│   ├── modules/                  # feature-based, not type-based
│   │   ├── links/
│   │   │   ├── links.routes.js
│   │   │   ├── links.controller.js
│   │   │   ├── links.service.js      # business logic lives here
│   │   │   ├── links.repository.js   # all SQL for this domain lives here
│   │   │   ├── links.validation.js   # request schema validation
│   │   │   └── links.test.js
│   │   │
│   │   ├── redirects/
│   │   │   ├── redirects.routes.js
│   │   │   ├── redirects.controller.js
│   │   │   ├── redirects.service.js  # cache-aside logic lives here
│   │   │   └── redirects.test.js
│   │   │
│   │   ├── analytics/
│   │   │   ├── analytics.routes.js
│   │   │   ├── analytics.controller.js
│   │   │   ├── analytics.service.js
│   │   │   ├── analytics.repository.js
│   │   │   └── analytics.worker.js   # consumes click events async
│   │   │
│   │   └── auth/
│   │       ├── auth.routes.js
│   │       ├── auth.controller.js
│   │       ├── auth.service.js
│   │       └── auth.middleware.js
│   │
│   ├── jobs/                     # background workers, separate from request/response cycle
│   │   ├── clickProcessor.job.js     # SKIP LOCKED consumer
│   │   ├── cacheWarmer.job.js
│   │   └── scheduler.js              # cron-style registration
│   │
│   ├── db/
│   │   ├── migrations/           # numbered, reversible migrations (node-pg-migrate or knex)
│   │   │   ├── 001_create_links_table.js
│   │   │   ├── 002_create_clicks_table.js
│   │   │   └── 003_partition_clicks_by_month.js
│   │   ├── seeds/
│   │   └── pool.js               # single shared pg pool instance
│   │
│   ├── cache/
│   │   ├── redisClient.js
│   │   └── cacheKeys.js          # centralized key naming to avoid collisions/typos
│   │
│   ├── middlewares/
│   │   ├── errorHandler.js       # centralized error handling, never ad-hoc try/catch per route
│   │   ├── rateLimiter.js
│   │   ├── requestLogger.js
│   │   └── validateRequest.js
│   │
│   ├── utils/
│   │   ├── base62.js             # ID encoding logic
│   │   ├── logger.js             # winston/pino, structured JSON logs
│   │   └── asyncHandler.js       # wraps async routes so errors reach errorHandler
│   │
│   ├── shared/
│   │   ├── errors/
│   │   │   ├── AppError.js       # base custom error class
│   │   │   ├── NotFoundError.js
│   │   │   └── ConflictError.js
│   │   └── constants.js
│   │
│   ├── app.js                    # express app setup, middleware wiring — NO listen() here
│   └── server.js                 # imports app, calls listen(), handles graceful shutdown
│
├── tests/
│   ├── integration/               # hits real test DB via docker
│   ├── unit/
│   └── load/
│       └── redirect.k6.js         # your load test script, versioned with the code
│
├── scripts/
│   ├── wait-for-db.sh
│   └── seed-dev-data.js
│
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml         # app + postgres + redis, one command to run everything
│   └── docker-compose.test.yml
│
├── docs/
│   ├── DECISIONS.md               # the tradeoffs doc — this is your interview ammo
│   ├── SYSTEM_DESIGN.md           # diagram + write-path vs read-path explanation
│   └── API.md                     # or an OpenAPI/swagger spec
│
├── .github/
│   └── workflows/
│       └── ci.yml                 # lint, test, build on every PR
│
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── package.json
└── README.md
```
