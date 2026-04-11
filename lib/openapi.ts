/**
 * OpenAPI 3.1.0 specification for the Momo API.
 *
 * This object is served at GET /api/openapi.json and consumed by the Swagger UI
 * at /api-docs. It covers every public API route in the application.
 *
 * Security model:
 *  - bearerAuth  — Personal Access Token (momo_live_...) sent in Authorization header
 *  - cookieAuth  — Auth.js session cookie (browser sessions)
 *
 * Read-only API keys can only call routes marked with `x-readonly-safe: true`
 * (i.e. all GET routes). Mutation routes (POST/PATCH/DELETE) require a write-capable
 * key or an active browser session.
 */

// Use a plain object type to avoid strict OpenAPIV3_1.Document typing issues
// with custom extensions (x-readonly-safe). The runtime shape is fully compliant
// with OpenAPI 3.1.0 — the type widening is purely for TypeScript ergonomics.
export const openApiSpec: object = {
  openapi: "3.1.0",
  info: {
    title: "Momo API",
    version: "1.0.0",
    description: `
## Overview
Momo is a task management app for people with avoidance tendencies and procrastination.
This API exposes all core functionality for tasks, topics, daily quests, wishlist items,
and account management.

## Authentication
All endpoints (except \`/api/health\`) require authentication via one of two methods:

### Bearer Token (Personal Access Token)
\`\`\`
Authorization: Bearer momo_live_<token>
\`\`\`
Tokens can be created at **Settings → API Keys**. Read-only tokens can only call GET endpoints.

### Session Cookie (Browser)
The session cookie (\`authjs.session-token\`) is set automatically when you log in via OAuth.
All browser-based requests are authenticated this way.

## Rate Limiting
Mutation routes (POST/PATCH/DELETE) are rate-limited per user. Responses include
\`Retry-After\` headers when limits are exceeded (HTTP 429).
    `.trim(),
    contact: {
      name: "Momo",
      url: "https://github.com/jp1337/momo",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: "/",
      description: "Current server",
    },
  ],
  tags: [
    { name: "Health", description: "Service health check" },
    { name: "Tasks", description: "Task CRUD and completion" },
    { name: "Topics", description: "Topic (project bucket) management" },
    { name: "Daily Quest", description: "Daily quest selection and postponement" },
    { name: "Wishlist", description: "Wishlist items and purchase tracking" },
    { name: "Settings", description: "User settings (budget)" },
    { name: "User", description: "Account management and data export" },
    { name: "API Keys", description: "Personal Access Token management" },
    { name: "Notification Channels", description: "Multi-channel notification management (ntfy.sh, etc.)" },
    { name: "Calendar", description: "iCal calendar feed subscription" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description:
          "Personal Access Token in the format `momo_live_<44-char base64url>`. " +
          "Read-only tokens (created with `readonly: true`) may only call GET endpoints.",
      },
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "authjs.session-token",
        description: "Browser session cookie set by Auth.js after OAuth login.",
      },
    },
    schemas: {
      // ─── Enums ──────────────────────────────────────────────────────────────

      Priority: {
        type: "string",
        enum: ["HIGH", "NORMAL", "SOMEDAY"],
        description:
          "Task or topic priority level. HIGH tasks are preferred by the daily quest algorithm.",
      },

      TaskType: {
        type: "string",
        enum: ["ONE_TIME", "RECURRING", "DAILY_ELIGIBLE"],
        description:
          "Controls how a task behaves.\n" +
          "- `ONE_TIME` — completed once and done.\n" +
          "- `RECURRING` — resets automatically after `recurrenceInterval` days.\n" +
          "- `DAILY_ELIGIBLE` — can be selected as the daily quest.",
      },

      WishlistPriority: {
        type: "string",
        enum: ["WANT", "NICE_TO_HAVE", "SOMEDAY"],
        description: "How much the user wants the wishlist item.",
      },

      WishlistStatus: {
        type: "string",
        enum: ["OPEN", "BOUGHT", "DISCARDED"],
        description: "Current lifecycle state of a wishlist item.",
      },

      // ─── Core entities ───────────────────────────────────────────────────────

      Task: {
        type: "object",
        required: [
          "id",
          "userId",
          "title",
          "type",
          "priority",
          "coinValue",
          "isDailyQuest",
          "createdAt",
        ],
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "Unique task identifier.",
            example: "550e8400-e29b-41d4-a716-446655440000",
          },
          userId: {
            type: "string",
            format: "uuid",
            description: "ID of the owning user.",
          },
          topicId: {
            type: ["string", "null"],
            format: "uuid",
            description: "Optional topic association. Null if not assigned to a topic.",
          },
          title: {
            type: "string",
            minLength: 1,
            maxLength: 255,
            description: "Task title.",
            example: "Send tax documents",
          },
          notes: {
            type: ["string", "null"],
            description: "Optional free-text notes for the task.",
          },
          type: { $ref: "#/components/schemas/TaskType" },
          priority: { $ref: "#/components/schemas/Priority" },
          recurrenceInterval: {
            type: ["integer", "null"],
            minimum: 1,
            maximum: 365,
            description:
              "Days between occurrences for RECURRING tasks. Null for non-recurring tasks.",
            example: 7,
          },
          dueDate: {
            type: ["string", "null"],
            format: "date",
            description: "Original user-set due date (YYYY-MM-DD).",
            example: "2026-04-15",
          },
          nextDueDate: {
            type: ["string", "null"],
            format: "date",
            description: "Computed next due date for recurring tasks (YYYY-MM-DD).",
          },
          completedAt: {
            type: ["string", "null"],
            format: "date-time",
            description: "Timestamp when a ONE_TIME task was completed. Null if open.",
          },
          coinValue: {
            type: "integer",
            minimum: 1,
            maximum: 10,
            description: "Coin reward awarded when this task is completed.",
            example: 3,
          },
          isDailyQuest: {
            type: "boolean",
            description: "Whether this task is currently selected as the daily quest.",
          },
          snoozedUntil: {
            type: ["string", "null"],
            format: "date",
            description: "Date until which this task is snoozed/hidden (YYYY-MM-DD). Null if active.",
          },
          energyLevel: {
            type: ["string", "null"],
            enum: ["HIGH", "MEDIUM", "LOW", null],
            description: "Energy level required for this task. Null = matches any energy state.",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Creation timestamp.",
          },
        },
      },

      Topic: {
        type: "object",
        required: ["id", "userId", "title", "priority", "archived", "createdAt"],
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "Unique topic identifier.",
          },
          userId: {
            type: "string",
            format: "uuid",
            description: "ID of the owning user.",
          },
          title: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "Topic title.",
            example: "Moving",
          },
          description: {
            type: ["string", "null"],
            description: "Optional description of the topic.",
          },
          color: {
            type: ["string", "null"],
            pattern: "^#[0-9A-Fa-f]{6}$",
            description: "Optional hex color for UI display.",
            example: "#ff5733",
          },
          icon: {
            type: ["string", "null"],
            description: "Optional emoji or icon identifier.",
            example: "🏠",
          },
          priority: { $ref: "#/components/schemas/Priority" },
          archived: {
            type: "boolean",
            description:
              "Archived topics are hidden from the main view but not deleted.",
          },
          sequential: {
            type: "boolean",
            description:
              "When true, only the first still-open task (lowest sortOrder, not snoozed) in this topic is eligible for daily quest selection. Later tasks are blocked until earlier ones are completed.",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Creation timestamp.",
          },
        },
      },

      TopicWithTasks: {
        allOf: [
          { $ref: "#/components/schemas/Topic" },
          {
            type: "object",
            required: ["tasks"],
            properties: {
              tasks: {
                type: "array",
                items: { $ref: "#/components/schemas/Task" },
                description: "All tasks belonging to this topic.",
              },
            },
          },
        ],
      },

      TopicWithTaskCounts: {
        allOf: [
          { $ref: "#/components/schemas/Topic" },
          {
            type: "object",
            properties: {
              taskCount: {
                type: "integer",
                description: "Total number of tasks in this topic.",
              },
              openTaskCount: {
                type: "integer",
                description: "Number of incomplete tasks in this topic.",
              },
            },
          },
        ],
      },

      WishlistItem: {
        type: "object",
        required: ["id", "userId", "title", "priority", "status", "createdAt"],
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "Unique wishlist item identifier.",
          },
          userId: {
            type: "string",
            format: "uuid",
            description: "ID of the owning user.",
          },
          title: {
            type: "string",
            minLength: 1,
            maxLength: 200,
            description: "Item name.",
            example: "Mechanical keyboard",
          },
          price: {
            type: ["number", "null"],
            minimum: 0,
            maximum: 999999,
            description: "Price in the user's currency.",
            example: 149.99,
          },
          url: {
            type: ["string", "null"],
            format: "uri",
            description: "Optional product URL.",
            example: "https://example.com/keyboard",
          },
          priority: { $ref: "#/components/schemas/WishlistPriority" },
          status: { $ref: "#/components/schemas/WishlistStatus" },
          coinUnlockThreshold: {
            type: ["integer", "null"],
            minimum: 0,
            description:
              "Minimum coin balance required to mark as bought. Null means no threshold.",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Creation timestamp.",
          },
        },
      },

      ApiKeyRecord: {
        type: "object",
        required: ["id", "userId", "name", "keyPrefix", "readonly", "createdAt"],
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "Unique API key identifier.",
          },
          userId: {
            type: "string",
            format: "uuid",
            description: "ID of the owning user.",
          },
          name: {
            type: "string",
            minLength: 1,
            maxLength: 64,
            description: "User-defined label for the key.",
            example: "Claude MCP",
          },
          keyPrefix: {
            type: "string",
            description: "First 16 characters of the plaintext key followed by '...'. Safe to display.",
            example: "momo_live_abc123...",
          },
          readonly: {
            type: "boolean",
            description:
              "If true, this key may only be used for GET requests.",
          },
          expiresAt: {
            type: ["string", "null"],
            format: "date-time",
            description: "Expiry timestamp. Null means the key never expires.",
          },
          lastUsedAt: {
            type: ["string", "null"],
            format: "date-time",
            description: "Timestamp of the last successful authentication. Null if never used.",
          },
          revokedAt: {
            type: ["string", "null"],
            format: "date-time",
            description: "Revocation timestamp. Null means the key is active.",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Creation timestamp.",
          },
        },
      },

      DailyQuest: {
        type: "object",
        properties: {
          task: {
            oneOf: [
              { $ref: "#/components/schemas/Task" },
              { type: "null" },
            ],
            description:
              "The selected daily quest task, or null if no eligible tasks exist.",
          },
        },
      },

      // ─── Request bodies ──────────────────────────────────────────────────────

      CreateTaskInput: {
        type: "object",
        required: ["title", "type"],
        properties: {
          title: {
            type: "string",
            minLength: 1,
            maxLength: 255,
            example: "File tax return",
          },
          topicId: {
            type: ["string", "null"],
            format: "uuid",
            description: "Associate with a topic. Omit or null for no topic.",
          },
          notes: {
            type: ["string", "null"],
            description: "Free-text notes.",
          },
          type: { $ref: "#/components/schemas/TaskType" },
          priority: {
            $ref: "#/components/schemas/Priority",
          },
          recurrenceInterval: {
            type: ["integer", "null"],
            minimum: 1,
            maximum: 365,
            description: "Required when type is RECURRING.",
            example: 7,
          },
          dueDate: {
            type: ["string", "null"],
            format: "date",
            description: "Due date in YYYY-MM-DD format.",
            example: "2026-04-30",
          },
          coinValue: {
            type: "integer",
            minimum: 1,
            maximum: 10,
            default: 1,
            description: "Coin reward for completion.",
          },
          energyLevel: {
            type: ["string", "null"],
            enum: ["HIGH", "MEDIUM", "LOW", null],
            description: "Energy level required. Null = matches any.",
          },
        },
      },

      UpdateTaskInput: {
        type: "object",
        description: "All fields are optional. Only provided fields are updated.",
        properties: {
          title: {
            type: "string",
            minLength: 1,
            maxLength: 255,
          },
          topicId: {
            type: ["string", "null"],
            format: "uuid",
          },
          notes: {
            type: ["string", "null"],
          },
          type: { $ref: "#/components/schemas/TaskType" },
          priority: { $ref: "#/components/schemas/Priority" },
          recurrenceInterval: {
            type: ["integer", "null"],
            minimum: 1,
            maximum: 365,
          },
          dueDate: {
            type: ["string", "null"],
            format: "date",
          },
          coinValue: {
            type: "integer",
            minimum: 1,
            maximum: 10,
          },
          energyLevel: {
            type: ["string", "null"],
            enum: ["HIGH", "MEDIUM", "LOW", null],
            description: "Energy level required. Null = matches any.",
          },
        },
      },

      CreateTopicInput: {
        type: "object",
        required: ["title"],
        properties: {
          title: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            example: "Side Project",
          },
          description: {
            type: ["string", "null"],
          },
          color: {
            type: ["string", "null"],
            pattern: "^#[0-9A-Fa-f]{6}$",
            example: "#4a90e2",
          },
          icon: {
            type: ["string", "null"],
            example: "💻",
          },
          priority: { $ref: "#/components/schemas/Priority" },
          sequential: {
            type: "boolean",
            default: false,
            description:
              "Opt-in sequential ordering: only the first still-open task is eligible as daily quest.",
          },
        },
      },

      UpdateTopicInput: {
        type: "object",
        description: "All fields are optional. Only provided fields are updated.",
        properties: {
          title: {
            type: "string",
            minLength: 1,
            maxLength: 100,
          },
          description: {
            type: ["string", "null"],
          },
          color: {
            type: ["string", "null"],
            pattern: "^#[0-9A-Fa-f]{6}$",
          },
          icon: {
            type: ["string", "null"],
          },
          priority: { $ref: "#/components/schemas/Priority" },
          sequential: {
            type: "boolean",
            description:
              "Toggle sequential ordering enforcement for this topic.",
          },
        },
      },

      CreateWishlistItemInput: {
        type: "object",
        required: ["title", "priority"],
        properties: {
          title: {
            type: "string",
            minLength: 1,
            maxLength: 200,
            example: "Noise-cancelling headphones",
          },
          price: {
            type: ["number", "null"],
            minimum: 0,
            maximum: 999999,
            example: 299.0,
          },
          url: {
            type: ["string", "null"],
            format: "uri",
            example: "https://example.com/headphones",
          },
          priority: { $ref: "#/components/schemas/WishlistPriority" },
          coinUnlockThreshold: {
            type: ["integer", "null"],
            minimum: 0,
            description:
              "Minimum coin balance required to mark as bought.",
          },
        },
      },

      UpdateWishlistItemInput: {
        type: "object",
        description: "All fields are optional.",
        properties: {
          title: {
            type: "string",
            minLength: 1,
            maxLength: 200,
          },
          price: {
            type: ["number", "null"],
            minimum: 0,
            maximum: 999999,
          },
          url: {
            type: ["string", "null"],
            format: "uri",
          },
          priority: { $ref: "#/components/schemas/WishlistPriority" },
          coinUnlockThreshold: {
            type: ["integer", "null"],
            minimum: 0,
          },
        },
      },

      CreateApiKeyInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: {
            type: "string",
            minLength: 1,
            maxLength: 64,
            example: "Home automation",
          },
          readonly: {
            type: "boolean",
            default: false,
            description:
              "If true, this key may only be used for GET requests.",
          },
          expiresIn: {
            type: ["string", "null"],
            enum: ["30d", "90d", "1y", null],
            default: null,
            description: "Key expiry duration. Null means the key never expires.",
          },
        },
      },

      UpdateBudgetInput: {
        type: "object",
        required: ["budget"],
        properties: {
          budget: {
            type: ["number", "null"],
            minimum: 0,
            maximum: 9999999,
            description: "Monthly budget in the user's currency. Null to clear.",
            example: 250.0,
          },
        },
      },

      // ─── Response wrappers ───────────────────────────────────────────────────

      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "string",
            description: "Human-readable error message.",
            example: "Unauthorized",
          },
        },
      },

      ValidationError: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "string",
            example: "Validation failed",
          },
          details: {
            type: "object",
            description: "Zod flattened field errors.",
            additionalProperties: true,
          },
        },
      },

      HealthResponse: {
        type: "object",
        required: ["status", "timestamp"],
        properties: {
          status: {
            type: "string",
            enum: ["ok", "error"],
          },
          timestamp: {
            type: "string",
            format: "date-time",
          },
          message: {
            type: "string",
            description: "Present only when status is 'error'.",
          },
        },
      },
    },

    // ─── Reusable responses ────────────────────────────────────────────────────
    responses: {
      Unauthorized: {
        description: "Missing or invalid authentication credentials.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: { error: "Unauthorized" },
          },
        },
      },
      Forbidden: {
        description: "Authenticated but not permitted to perform this action (e.g. read-only key on a write endpoint).",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: { error: "Forbidden: read-only key cannot perform write operations" },
          },
        },
      },
      NotFound: {
        description: "The requested resource does not exist or belongs to another user.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: { error: "Not found" },
          },
        },
      },
      ValidationError: {
        description: "Request body failed Zod validation.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ValidationError" },
          },
        },
      },
      TooManyRequests: {
        description: "Rate limit exceeded.",
        headers: {
          "Retry-After": {
            description: "Seconds until the rate limit window resets.",
            schema: { type: "integer" },
          },
        },
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: { error: "Too many requests" },
          },
        },
      },
      InternalServerError: {
        description: "Unexpected server error.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: { error: "Internal server error" },
          },
        },
      },
    },

    // ─── Reusable parameters ───────────────────────────────────────────────────
    parameters: {
      taskId: {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" },
        description: "Task UUID.",
      },
      topicId: {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" },
        description: "Topic UUID.",
      },
      wishlistItemId: {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" },
        description: "Wishlist item UUID.",
      },
      apiKeyId: {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" },
        description: "API key UUID.",
      },
    },
  },

  // ─── Security (applied globally to authenticated routes) ──────────────────
  // Not set globally — each path declares its own security to allow /health to
  // remain unauthenticated.

  paths: {
    // ─── Health ──────────────────────────────────────────────────────────────

    "/api/health": {
      get: {
        operationId: "getHealth",
        tags: ["Health"],
        summary: "Health check",
        description:
          "Liveness/readiness probe for Docker, Kubernetes, and load balancers. " +
          "No authentication required. Returns 200 when the app and database are healthy, " +
          "503 when the database is unavailable.",
        security: [],
        "x-readonly-safe": true,
        responses: {
          "200": {
            description: "Application and database are healthy.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
                example: { status: "ok", timestamp: "2026-04-03T08:00:00.000Z" },
              },
            },
          },
          "503": {
            description: "Database is unavailable.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
                example: { status: "error", message: "Database unavailable" },
              },
            },
          },
        },
      },
    },

    // ─── Tasks ───────────────────────────────────────────────────────────────

    "/api/tasks": {
      get: {
        operationId: "listTasks",
        tags: ["Tasks"],
        summary: "List tasks",
        description:
          "Returns all tasks for the authenticated user. Supports optional query filters.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        "x-readonly-safe": true,
        parameters: [
          {
            name: "topicId",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" },
            description: "Filter tasks by topic.",
          },
          {
            name: "type",
            in: "query",
            required: false,
            schema: { $ref: "#/components/schemas/TaskType" },
            description: "Filter tasks by type.",
          },
          {
            name: "completed",
            in: "query",
            required: false,
            schema: { type: "boolean" },
            description: "Filter by completion status.",
          },
        ],
        responses: {
          "200": {
            description: "Array of tasks.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["tasks"],
                  properties: {
                    tasks: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Task" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      post: {
        operationId: "createTask",
        tags: ["Tasks"],
        summary: "Create task",
        description: "Creates a new task for the authenticated user.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTaskInput" },
              example: {
                title: "File tax return",
                type: "ONE_TIME",
                priority: "HIGH",
                dueDate: "2026-04-30",
                coinValue: 5,
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Task created successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["task"],
                  properties: {
                    task: { $ref: "#/components/schemas/Task" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    "/api/tasks/{id}": {
      get: {
        operationId: "getTask",
        tags: ["Tasks"],
        summary: "Get task",
        description: "Returns a single task by ID. The task must belong to the authenticated user.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        "x-readonly-safe": true,
        parameters: [{ $ref: "#/components/parameters/taskId" }],
        responses: {
          "200": {
            description: "Task found.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["task"],
                  properties: {
                    task: { $ref: "#/components/schemas/Task" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      patch: {
        operationId: "updateTask",
        tags: ["Tasks"],
        summary: "Update task",
        description:
          "Partially updates a task. Only provided fields are modified. " +
          "The task must belong to the authenticated user.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/taskId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTaskInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Task updated.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["task"],
                  properties: {
                    task: { $ref: "#/components/schemas/Task" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      delete: {
        operationId: "deleteTask",
        tags: ["Tasks"],
        summary: "Delete task",
        description:
          "Permanently deletes a task. The task must belong to the authenticated user.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/taskId" }],
        responses: {
          "200": {
            description: "Task deleted.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success"],
                  properties: {
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    "/api/tasks/{id}/complete": {
      post: {
        operationId: "completeTask",
        tags: ["Tasks"],
        summary: "Complete task",
        description:
          "Marks a task as completed, awards coins to the user, and records the completion. " +
          "For RECURRING tasks, the task is automatically reset with an updated `nextDueDate`.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/taskId" }],
        responses: {
          "200": {
            description: "Task completed. Returns the updated task and new coin balance.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["task", "coinsAwarded", "newBalance", "shieldUsed"],
                  properties: {
                    task: { $ref: "#/components/schemas/Task" },
                    coinsAwarded: {
                      type: "integer",
                      description: "Coins awarded for this completion.",
                    },
                    newBalance: {
                      type: "integer",
                      description: "User's updated coin balance.",
                    },
                    shieldUsed: {
                      type: "boolean",
                      description:
                        "True when the monthly Streak Shield was consumed to preserve " +
                        "the streak (exactly one day missed, shield not yet used this month).",
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      delete: {
        operationId: "uncompleteTask",
        tags: ["Tasks"],
        summary: "Uncomplete task",
        description:
          "Reverses a task completion, refunding the awarded coins. " +
          "Only applicable to ONE_TIME tasks that have been completed.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/taskId" }],
        responses: {
          "200": {
            description: "Task uncompleted. Returns the updated task.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["task"],
                  properties: {
                    task: { $ref: "#/components/schemas/Task" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    "/api/tasks/{id}/snooze": {
      post: {
        operationId: "snoozeTask",
        tags: ["Tasks"],
        summary: "Snooze a task",
        description:
          "Hides a task from all active views (task list, Quick Wins, Daily Quest) until the specified date. " +
          "If the task is the current daily quest, the quest flag is cleared.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/taskId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["snoozedUntil"],
                properties: {
                  snoozedUntil: {
                    type: "string",
                    format: "date",
                    description: "Date until which to snooze the task (YYYY-MM-DD).",
                    example: "2026-04-13",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Task snoozed. Returns the updated task.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["task"],
                  properties: {
                    task: { $ref: "#/components/schemas/Task" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "409": {
            description: "Cannot snooze a completed task.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      delete: {
        operationId: "unsnoozeTask",
        tags: ["Tasks"],
        summary: "Unsnooze a task",
        description:
          "Removes the snooze from a task, making it immediately visible again in all active views.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/taskId" }],
        responses: {
          "200": {
            description: "Task unsnoozed. Returns the updated task.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["task"],
                  properties: {
                    task: { $ref: "#/components/schemas/Task" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    "/api/tasks/bulk": {
      patch: {
        operationId: "bulkUpdateTasks",
        tags: ["Tasks"],
        summary: "Bulk action on multiple tasks",
        description:
          "Applies a bulk action (delete, complete, changeTopic, setPriority) to multiple tasks in a single transaction. " +
          "Bulk complete skips gamification (no coins/streak/achievements) and ignores recurring tasks. Max 100 task IDs per request.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  {
                    type: "object",
                    required: ["action", "taskIds"],
                    properties: {
                      action: { type: "string", enum: ["delete"] },
                      taskIds: { type: "array", items: { type: "string", format: "uuid" }, minItems: 1, maxItems: 100 },
                    },
                  },
                  {
                    type: "object",
                    required: ["action", "taskIds"],
                    properties: {
                      action: { type: "string", enum: ["complete"] },
                      taskIds: { type: "array", items: { type: "string", format: "uuid" }, minItems: 1, maxItems: 100 },
                      timezone: { type: "string", maxLength: 64, nullable: true, description: "IANA timezone (optional)" },
                    },
                  },
                  {
                    type: "object",
                    required: ["action", "taskIds", "topicId"],
                    properties: {
                      action: { type: "string", enum: ["changeTopic"] },
                      taskIds: { type: "array", items: { type: "string", format: "uuid" }, minItems: 1, maxItems: 100 },
                      topicId: { type: "string", format: "uuid", nullable: true, description: "Target topic ID, or null to remove from topic" },
                    },
                  },
                  {
                    type: "object",
                    required: ["action", "taskIds", "priority"],
                    properties: {
                      action: { type: "string", enum: ["setPriority"] },
                      taskIds: { type: "array", items: { type: "string", format: "uuid" }, minItems: 1, maxItems: 100 },
                      priority: { type: "string", enum: ["HIGH", "NORMAL", "SOMEDAY"] },
                    },
                  },
                ],
                discriminator: { propertyName: "action" },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Bulk action applied successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "affected"],
                  properties: {
                    success: { type: "boolean" },
                    affected: { type: "integer", description: "Number of tasks actually modified/deleted" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ─── Topics ──────────────────────────────────────────────────────────────

    "/api/topics": {
      get: {
        operationId: "listTopics",
        tags: ["Topics"],
        summary: "List topics",
        description:
          "Returns all topics for the authenticated user, each including task count metadata.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        "x-readonly-safe": true,
        responses: {
          "200": {
            description: "Array of topics with task counts.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["topics"],
                  properties: {
                    topics: {
                      type: "array",
                      items: { $ref: "#/components/schemas/TopicWithTaskCounts" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      post: {
        operationId: "createTopic",
        tags: ["Topics"],
        summary: "Create topic",
        description: "Creates a new topic (project bucket) for the authenticated user.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTopicInput" },
              example: {
                title: "Home Renovation",
                description: "All tasks related to the kitchen remodel",
                color: "#e2a84b",
                icon: "🏠",
                priority: "HIGH",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Topic created.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["topic"],
                  properties: {
                    topic: { $ref: "#/components/schemas/Topic" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    "/api/topics/{id}": {
      get: {
        operationId: "getTopic",
        tags: ["Topics"],
        summary: "Get topic with tasks",
        description:
          "Returns a single topic including all its tasks. " +
          "The topic must belong to the authenticated user.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        "x-readonly-safe": true,
        parameters: [{ $ref: "#/components/parameters/topicId" }],
        responses: {
          "200": {
            description: "Topic with tasks.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["topic"],
                  properties: {
                    topic: { $ref: "#/components/schemas/TopicWithTasks" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      patch: {
        operationId: "updateTopic",
        tags: ["Topics"],
        summary: "Update topic",
        description:
          "Partially updates a topic. Only provided fields are modified.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/topicId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTopicInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Topic updated.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["topic"],
                  properties: {
                    topic: { $ref: "#/components/schemas/Topic" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      delete: {
        operationId: "deleteTopic",
        tags: ["Topics"],
        summary: "Delete topic",
        description:
          "Permanently deletes a topic. Tasks that were assigned to this topic " +
          "are reassigned to null (no topic) rather than being deleted.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/topicId" }],
        responses: {
          "200": {
            description: "Topic deleted.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success"],
                  properties: {
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    "/api/topics/import-template": {
      post: {
        operationId: "importTopicTemplate",
        tags: ["Topics"],
        summary: "Import a topic from a template",
        description:
          "Creates a new topic with all predefined subtasks from a curated " +
          "template (e.g. 'moving', 'taxes', 'fitness', 'household'). The " +
          "'household' template uses RECURRING tasks with default intervals; " +
          "all other templates use ONE_TIME tasks. Titles and descriptions are " +
          "resolved in the caller's current UI locale and inserted as plain " +
          "editable text. Runs atomically in a single transaction.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["templateKey"],
                properties: {
                  templateKey: {
                    type: "string",
                    enum: ["moving", "taxes", "fitness", "household"],
                    description: "Identifier of the template to import.",
                  },
                },
              },
              example: { templateKey: "moving" },
            },
          },
        },
        responses: {
          "201": {
            description: "Template imported — topic and tasks created.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["topic", "tasks"],
                  properties: {
                    topic: { $ref: "#/components/schemas/Topic" },
                    tasks: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Task" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    "/api/topics/{id}/reorder": {
      put: {
        operationId: "reorderTopicTasks",
        tags: ["Topics"],
        summary: "Reorder tasks within a topic",
        description:
          "Updates the sort order of tasks within a topic. The array index " +
          "of each task ID becomes its new sortOrder value. All task IDs " +
          "must belong to the given topic and the authenticated user.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/topicId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["taskIds"],
                properties: {
                  taskIds: {
                    type: "array",
                    items: { type: "string", format: "uuid" },
                    minItems: 1,
                    maxItems: 200,
                    description: "Ordered array of task UUIDs — index = new sortOrder",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Tasks reordered.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success"],
                  properties: {
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ─── Daily Quest ─────────────────────────────────────────────────────────

    "/api/daily-quest": {
      get: {
        operationId: "getDailyQuest",
        tags: ["Daily Quest"],
        summary: "Get today's quest",
        description:
          "Returns the current daily quest task. If no quest has been selected today, " +
          "the algorithm selects one using the following priority order:\n" +
          "1. Oldest overdue task\n" +
          "2. High-priority topic subtask\n" +
          "3. Due recurring task\n" +
          "4. Random open DAILY_ELIGIBLE task",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        "x-readonly-safe": true,
        responses: {
          "200": {
            description: "Daily quest task (or null if no eligible tasks).",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DailyQuest" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    "/api/daily-quest/postpone": {
      post: {
        operationId: "postponeDailyQuest",
        tags: ["Daily Quest"],
        summary: "Postpone quest",
        description:
          "Deselects the current daily quest and selects a new one from the remaining pool. " +
          "Use this when the user wants to skip today's quest and get a different one.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          "200": {
            description: "New daily quest selected after postponement.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DailyQuest" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    "/api/energy-checkin": {
      post: {
        operationId: "energyCheckin",
        tags: ["Daily Quest"],
        summary: "Energy check-in",
        description:
          "Records the user's daily energy level and selects a matching daily quest in one " +
          "round-trip. The quest algorithm prefers tasks whose energyLevel matches the " +
          "check-in (soft preference — never blocks quest selection).",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["energyLevel"],
                properties: {
                  energyLevel: {
                    type: "string",
                    enum: ["HIGH", "MEDIUM", "LOW"],
                    description: "How the user is feeling today.",
                  },
                  timezone: {
                    type: "string",
                    maxLength: 64,
                    description: "IANA timezone (e.g. Europe/Berlin). Optional, defaults to UTC.",
                  },
                },
              },
              example: { energyLevel: "LOW", timezone: "Europe/Berlin" },
            },
          },
        },
        responses: {
          "200": {
            description: "Energy level saved and quest selected.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DailyQuest" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ─── Wishlist ─────────────────────────────────────────────────────────────

    "/api/wishlist": {
      get: {
        operationId: "listWishlistItems",
        tags: ["Wishlist"],
        summary: "List wishlist items",
        description: "Returns all wishlist items for the authenticated user.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        "x-readonly-safe": true,
        responses: {
          "200": {
            description: "Array of wishlist items.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items"],
                  properties: {
                    items: {
                      type: "array",
                      items: { $ref: "#/components/schemas/WishlistItem" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      post: {
        operationId: "createWishlistItem",
        tags: ["Wishlist"],
        summary: "Create wishlist item",
        description: "Adds a new item to the authenticated user's wishlist.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateWishlistItemInput" },
              example: {
                title: "Mechanical keyboard",
                price: 149.99,
                url: "https://example.com/keyboard",
                priority: "WANT",
                coinUnlockThreshold: 50,
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Wishlist item created.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["item"],
                  properties: {
                    item: { $ref: "#/components/schemas/WishlistItem" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    "/api/wishlist/{id}": {
      patch: {
        operationId: "updateWishlistItem",
        tags: ["Wishlist"],
        summary: "Update wishlist item",
        description:
          "Partially updates a wishlist item. Only provided fields are modified.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/wishlistItemId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateWishlistItemInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Wishlist item updated.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["item"],
                  properties: {
                    item: { $ref: "#/components/schemas/WishlistItem" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      delete: {
        operationId: "deleteWishlistItem",
        tags: ["Wishlist"],
        summary: "Delete wishlist item",
        description:
          "Permanently deletes a wishlist item. The item must belong to the authenticated user.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/wishlistItemId" }],
        responses: {
          "200": {
            description: "Wishlist item deleted.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success"],
                  properties: {
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    "/api/wishlist/{id}/buy": {
      post: {
        operationId: "buyWishlistItem",
        tags: ["Wishlist"],
        summary: "Mark as bought",
        description:
          "Marks a wishlist item as bought and deducts the coin unlock threshold " +
          "from the user's balance (if a threshold was set). " +
          "Fails if the user's coin balance is below the threshold.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/wishlistItemId" }],
        responses: {
          "200": {
            description: "Item marked as bought.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["item", "coinsSpent"],
                  properties: {
                    item: { $ref: "#/components/schemas/WishlistItem" },
                    coinsSpent: {
                      type: "integer",
                      description:
                        "Number of coins deducted (0 if no coinUnlockThreshold).",
                    },
                  },
                },
              },
            },
          },
          "422": {
            description: "Insufficient coin balance.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                example: { error: "INSUFFICIENT_COINS" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      delete: {
        operationId: "undoBuyWishlistItem",
        tags: ["Wishlist"],
        summary: "Undo buy",
        description:
          "Reverses a purchase, setting the item status back to OPEN and " +
          "refunding any deducted coins.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/wishlistItemId" }],
        responses: {
          "200": {
            description: "Purchase reversed.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["item", "coinsRefunded"],
                  properties: {
                    item: { $ref: "#/components/schemas/WishlistItem" },
                    coinsRefunded: {
                      type: "integer",
                      description:
                        "Number of coins refunded (0 if no coinUnlockThreshold).",
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    "/api/wishlist/{id}/discard": {
      post: {
        operationId: "discardWishlistItem",
        tags: ["Wishlist"],
        summary: "Discard item",
        description:
          "Marks a wishlist item as discarded (no longer wanted). " +
          "The item remains in the list with status DISCARDED.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/wishlistItemId" }],
        responses: {
          "200": {
            description: "Item discarded.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["item"],
                  properties: {
                    item: { $ref: "#/components/schemas/WishlistItem" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ─── Settings ─────────────────────────────────────────────────────────────

    "/api/settings/budget": {
      get: {
        operationId: "getBudget",
        tags: ["Settings"],
        summary: "Get budget",
        description:
          "Returns the authenticated user's current monthly budget setting.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        "x-readonly-safe": true,
        responses: {
          "200": {
            description: "Current monthly budget.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["budget"],
                  properties: {
                    budget: {
                      type: ["number", "null"],
                      description:
                        "Monthly budget in the user's currency, or null if not set.",
                      example: 250.0,
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      patch: {
        operationId: "updateBudget",
        tags: ["Settings"],
        summary: "Update budget",
        description:
          "Sets the authenticated user's monthly budget. Pass null to clear the budget.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateBudgetInput" },
              example: { budget: 300.0 },
            },
          },
        },
        responses: {
          "200": {
            description: "Budget updated.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["budget"],
                  properties: {
                    budget: {
                      type: ["number", "null"],
                      description: "Updated monthly budget.",
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    "/api/settings/quest": {
      patch: {
        operationId: "updateQuestSettings",
        tags: ["Settings"],
        summary: "Update quest settings",
        description:
          "Updates quest-related user settings. At least one field must be provided. " +
          "Supports changing the daily postpone limit and toggling the emotional closure " +
          "(affirmation/quote shown after quest completion).",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  postponeLimit: {
                    type: "integer",
                    minimum: 1,
                    maximum: 5,
                    description: "Maximum daily quest postponements (1–5).",
                  },
                  emotionalClosureEnabled: {
                    type: "boolean",
                    description:
                      "Whether to show an affirmation or quote after completing the daily quest.",
                  },
                },
              },
              example: { postponeLimit: 3, emotionalClosureEnabled: true },
            },
          },
        },
        responses: {
          "200": {
            description: "Settings updated.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { success: { type: "boolean" } },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "422": { $ref: "#/components/responses/ValidationError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ─── Calendar Feed ────────────────────────────────────────────────────────

    "/api/calendar/{token}": {
      get: {
        operationId: "getCalendarFeed",
        tags: ["Calendar"],
        summary: "Personal iCal calendar feed",
        description:
          "Returns a private iCalendar (RFC 5545) feed with every non-completed task " +
          "that has a due date. Each task becomes an all-day VEVENT; RECURRING tasks " +
          "emit an open-ended daily RRULE. Intended as a subscription URL for calendar " +
          "clients (Google/Apple/Outlook/Thunderbird) — the token in the path is the " +
          "only authentication. An optional `.ics` suffix is accepted for clients that " +
          "require a file-extension in the URL. Revoked or unknown tokens return 404 " +
          "(not 401) to avoid leaking existence information.",
        parameters: [
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string" },
            description:
              "Plaintext feed token as issued by `POST /api/settings/calendar-feed`. " +
              "A trailing `.ics` is stripped before lookup.",
          },
        ],
        security: [],
        "x-readonly-safe": true,
        responses: {
          "200": {
            description: "iCalendar document (RFC 5545).",
            content: {
              "text/calendar": {
                schema: { type: "string" },
              },
            },
          },
          "404": {
            description: "Unknown or revoked token.",
          },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    "/api/settings/vacation-mode": {
      get: {
        operationId: "getVacationModeStatus",
        tags: ["Settings"],
        summary: "Get vacation mode status",
        description:
          "Returns whether the authenticated user currently has vacation mode active " +
          "and the configured end date.",
        responses: {
          200: {
            description: "Vacation mode status",
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: {
                    active: { type: "boolean" as const },
                    endDate: { type: "string" as const, format: "date", nullable: true },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      patch: {
        operationId: "updateVacationMode",
        tags: ["Settings"],
        summary: "Activate or deactivate vacation mode",
        description:
          "When activated, all RECURRING tasks are paused (pausedAt + pausedUntil set). " +
          "When deactivated, nextDueDate is shifted forward by the actual pause duration. " +
          "Rate-limited to 10 requests per minute.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object" as const,
                required: ["enabled"],
                properties: {
                  enabled: { type: "boolean" as const },
                  endDate: { type: "string" as const, format: "date", description: "Required when enabled = true" },
                  timezone: { type: "string" as const, description: "IANA timezone" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Vacation mode updated",
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: { success: { type: "boolean" as const } },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          422: { $ref: "#/components/responses/ValidationError" },
          429: { $ref: "#/components/responses/RateLimited" },
        },
      },
    },

    "/api/settings/calendar-feed": {
      get: {
        operationId: "getCalendarFeedStatus",
        tags: ["Settings"],
        summary: "Get calendar feed status",
        description:
          "Returns whether the authenticated user has an active calendar feed and " +
          "when its token was last generated. Never returns the token itself.",
        security: [{ cookieAuth: [] }],
        "x-readonly-safe": true,
        responses: {
          "200": {
            description: "Current feed status.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["active", "createdAt"],
                  properties: {
                    active: { type: "boolean" },
                    createdAt: {
                      type: "string",
                      format: "date-time",
                      nullable: true,
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        operationId: "rotateCalendarFeedToken",
        tags: ["Settings"],
        summary: "Create or rotate the calendar feed token",
        description:
          "Generates a fresh 256-bit token, replacing any existing one. The previous " +
          "URL stops working immediately. The plaintext URL is returned in the response " +
          "and is shown only once — the server only stores a SHA-256 hash.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "New feed URL (one-time display).",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["url", "createdAt"],
                  properties: {
                    url: {
                      type: "string",
                      format: "uri",
                      description:
                        "Full subscription URL including the plaintext token — " +
                        "shown only once, never retrievable again.",
                    },
                    createdAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      delete: {
        operationId: "revokeCalendarFeed",
        tags: ["Settings"],
        summary: "Revoke the calendar feed",
        description:
          "Deletes the current feed token. The subscription URL stops working " +
          "immediately. Idempotent — safe to call when no feed is active.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Feed revoked (or already inactive).",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { success: { type: "boolean" } },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ─── Onboarding ──────────────────────────────────────────────────────────

    "/api/onboarding/complete": {
      post: {
        operationId: "completeOnboarding",
        tags: ["Onboarding"],
        summary: "Mark onboarding as completed",
        description:
          "Sets `onboarding_completed = true` for the authenticated user. " +
          "Called when the user finishes or skips the onboarding wizard.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Onboarding marked as completed.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { success: { type: "boolean" } },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ─── User ─────────────────────────────────────────────────────────────────

    "/api/user/export": {
      get: {
        operationId: "exportUserData",
        tags: ["User"],
        summary: "Export user data",
        description:
          "Exports all data belonging to the authenticated user as a JSON file. " +
          "Includes tasks, topics, wishlist items, completions, and account metadata. " +
          "Useful for data portability and backups.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        "x-readonly-safe": true,
        responses: {
          "200": {
            description:
              "JSON file containing all user data. " +
              "Content-Disposition header is set to trigger a browser download.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  description: "Complete user data export.",
                  additionalProperties: true,
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    "/api/user": {
      delete: {
        operationId: "deleteAccount",
        tags: ["User"],
        summary: "Delete account",
        description:
          "Permanently deletes the authenticated user's account and all associated data " +
          "(tasks, topics, wishlist items, completions, API keys, sessions). " +
          "This action is irreversible.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          "200": {
            description: "Account deleted successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success"],
                  properties: {
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    "/api/user/profile": {
      patch: {
        operationId: "updateProfile",
        tags: ["User"],
        summary: "Update profile",
        description:
          "Updates the authenticated user's profile (name, email, profile picture). " +
          "All fields are optional — only provided fields are updated. " +
          "Profile pictures are resized server-side to 200×200px WebP and stored as data URLs.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    minLength: 1,
                    maxLength: 100,
                    description: "Display name",
                    example: "Jane Doe",
                  },
                  email: {
                    type: "string",
                    format: "email",
                    maxLength: 255,
                    description: "Email address (must be unique)",
                    example: "jane@example.com",
                  },
                  image: {
                    type: "string",
                    nullable: true,
                    maxLength: 200000,
                    description:
                      "Base64 data URL (PNG/JPEG/GIF/WebP/BMP) or null to remove. " +
                      "Resized to 200×200px WebP server-side.",
                    example: null,
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Profile updated successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["user"],
                  properties: {
                    user: {
                      type: "object",
                      properties: {
                        name: { type: "string", nullable: true },
                        email: { type: "string", nullable: true },
                        image: { type: "string", nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "409": {
            description: "Email already in use by another account.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "Email is already in use" },
                    code: { type: "string", example: "EMAIL_TAKEN" },
                  },
                },
              },
            },
          },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ─── API Keys ─────────────────────────────────────────────────────────────

    "/api/user/api-keys": {
      get: {
        operationId: "listApiKeys",
        tags: ["API Keys"],
        summary: "List API keys",
        description:
          "Returns all active (non-revoked) API keys for the authenticated user. " +
          "The key hash is never returned — only the display prefix and metadata.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        "x-readonly-safe": true,
        responses: {
          "200": {
            description: "Array of API key records.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["apiKeys"],
                  properties: {
                    apiKeys: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ApiKeyRecord" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      post: {
        operationId: "createApiKey",
        tags: ["API Keys"],
        summary: "Create API key",
        description:
          "Creates a new Personal Access Token. The plaintext key is returned **once** " +
          "in this response and is never stored — save it immediately.\n\n" +
          "Rate limited to 10 requests per hour.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateApiKeyInput" },
              example: {
                name: "Home automation",
                readonly: true,
                expiresIn: "90d",
              },
            },
          },
        },
        responses: {
          "201": {
            description:
              "API key created. The `key` field contains the plaintext token — " +
              "this is the only time it will be shown.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["key", "record"],
                  properties: {
                    key: {
                      type: "string",
                      description:
                        "The full plaintext API key (momo_live_...). Store it now — it cannot be retrieved again.",
                      example: "momo_live_abc123...",
                    },
                    record: { $ref: "#/components/schemas/ApiKeyRecord" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    "/api/user/api-keys/{id}": {
      delete: {
        operationId: "revokeApiKey",
        tags: ["API Keys"],
        summary: "Revoke API key",
        description:
          "Immediately revokes an API key by setting its `revokedAt` timestamp. " +
          "Revoked keys are refused on all subsequent requests. " +
          "The key must belong to the authenticated user.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/apiKeyId" }],
        responses: {
          "200": {
            description: "API key revoked.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success"],
                  properties: {
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ─── Notification Channels ─────────────────────────────────────────────────

    "/api/settings/notification-channels": {
      get: {
        summary: "List notification channels",
        description: "Returns all configured notification channels for the authenticated user.",
        tags: ["Notification Channels"],
        "x-readonly-safe": true,
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          "200": {
            description: "Channel list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["channels"],
                  properties: {
                    channels: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["type", "config", "enabled"],
                        properties: {
                          type: { type: "string", example: "ntfy" },
                          config: { type: "object", example: { topic: "my-momo", server: "https://ntfy.sh" } },
                          enabled: { type: "boolean", example: true },
                          createdAt: { type: "string", format: "date-time" },
                          updatedAt: { type: "string", format: "date-time" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      put: {
        summary: "Create or update a notification channel",
        description: "Upserts a notification channel by type. Each user can have one channel per type.",
        tags: ["Notification Channels"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type", "config"],
                properties: {
                  type: { type: "string", enum: ["ntfy"], description: "Channel type" },
                  config: {
                    type: "object",
                    description: "Channel-specific config. For ntfy: { topic: string, server?: string }",
                    properties: {
                      topic: { type: "string", example: "my-momo-channel" },
                      server: { type: "string", example: "https://ntfy.sh" },
                    },
                    required: ["topic"],
                  },
                  enabled: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Channel saved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success"],
                  properties: { success: { type: "boolean", example: true } },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
        },
      },
    },

    "/api/settings/notification-channels/{type}": {
      delete: {
        summary: "Remove a notification channel",
        description: "Deletes the notification channel of the specified type for the authenticated user.",
        tags: ["Notification Channels"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          {
            name: "type",
            in: "path",
            required: true,
            schema: { type: "string", example: "ntfy" },
            description: "Channel type to remove",
          },
        ],
        responses: {
          "200": {
            description: "Channel removed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success"],
                  properties: { success: { type: "boolean", example: true } },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    "/api/settings/notification-channels/{type}/test": {
      post: {
        summary: "Send a test notification",
        description: "Sends a test notification via the specified channel. Rate limited to 3/min.",
        tags: ["Notification Channels"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          {
            name: "type",
            in: "path",
            required: true,
            schema: { type: "string", example: "ntfy" },
            description: "Channel type to test",
          },
        ],
        responses: {
          "200": {
            description: "Test sent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success"],
                  properties: { success: { type: "boolean", example: true } },
                },
              },
            },
          },
          "400": {
            description: "Channel not configured or send failed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["error"],
                  properties: { error: { type: "string" } },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
        },
      },
    },

    "/api/settings/notification-history": {
      get: {
        summary: "List recent notification delivery attempts",
        description:
          "Returns the last 50 notification log entries for the authenticated user, " +
          "sorted by most recent first. Each entry records a single channel delivery attempt.",
        tags: ["Notification History"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        "x-readonly-safe": true,
        responses: {
          "200": {
            description: "Notification log entries",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["entries"],
                  properties: {
                    entries: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["id", "channel", "title", "status", "sentAt"],
                        properties: {
                          id: { type: "string", format: "uuid" },
                          channel: {
                            type: "string",
                            enum: ["web-push", "ntfy", "pushover", "telegram", "email"],
                          },
                          title: { type: "string" },
                          body: { type: "string", nullable: true },
                          status: { type: "string", enum: ["sent", "failed"] },
                          error: { type: "string", nullable: true },
                          sentAt: { type: "string", format: "date-time" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
  },
};
