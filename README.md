# Z-Cal API

Simple REST API that identifies food calories and generates healthy recipes using OpenAI via the Zypher Agent.

## 🎯 Features

- **Vision-powered nutrition reports** – Upload a food image and receive calories, macro split, health score, and contextual insights.
- **Health scoring & insights** – Every response includes a 0-100 health score with a short justification.
- **Conversational recipe co-pilot** – Chat-style endpoint that remembers context across turns to craft healthy recipes.
- **Hardening & DX** – Input validation, base64 size checks (5 MB cap), CORS, typed agents, and route/unit tests.

## 🚀 Getting Started

### Prerequisites

- Deno installed (https://deno.land/)
- OpenAI API key

### Setup

1. Clone the repository.
2. Copy `env.sample` to `.env`:
   ```bash
   cp env.sample .env
   ```
3. Edit `.env` and add your API key:
   ```
   OPENAI_API_KEY=your_key_here
   ```

### Run

```bash
# Development (with hot reload)
deno task dev

# Production
deno task start
```

The server listens on `http://localhost:8000`.

### Configuration

| Variable         | Required | Default | Description                            |
| ---------------- | -------- | ------- | -------------------------------------- |
| `OPENAI_API_KEY` | ✅       | –       | Zypher/OpenAI key used by both agents. |
| `PORT`           | ❌       | `8000`  | HTTP port for `deno serve`.            |

## 📚 Endpoints

### Health Check

```http
GET /health
```

**Sample response**

```json
{
  "status": "healthy",
  "service": "z-cal-api",
  "timestamp": "2025-11-24T10:00:00.000Z"
}
```

### Identify Food

```http
POST /api/identify-food
Content-Type: application/json

{
  "image": "base64_encoded_image_string"
}
```

**Sample response**

```json
{
  "name": "Greek Salad",
  "calories": 320,
  "macros": {
    "protein": "15g",
    "carbs": "34g",
    "fat": "14g"
  },
  "healthScore": 82,
  "insights": "Fresh veggies plus olive oil keep calories moderate and add healthy fats."
}
```

- Validates base64 format and rejects images above **5 MB**.
- Uses GPT-4o vision via Zypher to normalize the response schema.

### Generate Healthy Recipe

```http
POST /api/generate-recipe
Content-Type: application/json

{
  "messages": [
    {
      "role": "user",
      "content": "I have chicken thighs, sweet potato and spinach. Keep it under 500 calories."
    }
  ]
}
```

**Sample response**

```json
{
  "response": "# Sweet Potato & Spinach Chicken Skillet\n\n## Ingredients\n- 2 chicken thighs (180g)\n- 1 cup diced sweet potato...\n\n## Steps\n1. Sear chicken...\n\n**Estimated calories:** ~480 kcal · **Prep time:** 25 min"
}
```

- Accepts a chat transcript (`messages[]`) so you can build multi-turn assistants.
- Always injects a healthy-chef system prompt before calling GPT-4o through Zypher.

## 🏗️ Architecture

```
z-cal-api/
├── src/
│   ├── agents/           # Business logic
│   ├── tools/            # Reusable integrations
│   ├── routes/           # HTTP handlers
│   ├── types/            # Shared types
│   └── router.ts         # Main router
├── main.ts               # HTTP server entrypoint
├── deno.json             # Deno configuration
└── env.sample            # Environment variable template
```

### Responsibility split

- **Agents** – Business logic (identify food, generate recipe).
- **Tools** – Reusable helpers (OpenAI client, image processing).
- **Routes** – HTTP handlers that validate input and format responses.
- **Router** – Centralized request routing.

### Key resources

- `FoodIdentifierAgent` bundles base64 validation, GPT-4o vision calls, and response normalization.
- `RecipeGeneratorAgent` handles chat prompts and injects the healthy-chef system override.
- `ImageProcessor` validates format/size and strips `data:image/*;base64,` prefixes.
- `ZypherClient` wraps `@corespeed/zypher` streaming APIs for both text and vision calls.

## 🧪 Tests

Unit tests cover routes, validation flows, and router dispatch logic.

```bash
deno task test          # runs deno test -A
# or
deno test -A main_test.ts
```

Key scenarios: health payloads, food request validation/error mapping, recipe chat validation, and router 404s.

## 📝 Usage examples

### Postman Collection

A ready-to-use Postman collection with all endpoints is available:

🔗 [**Import Postman Collection**](https://gabriel-rabelo-1458.postman.co/workspace/z-cal~ff580779-c75e-4538-907e-c9ea6e324dab/collection/6259551-ce9b3d52-e43d-4536-888f-1535f1221b8f?action=share&creator=6259551)

The collection includes pre-configured requests for all endpoints with example payloads.

### cURL – Identify food

```bash
curl -X POST http://localhost:8000/api/identify-food \
  -H "Content-Type: application/json" \
  -d '{
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }'
```

### cURL – Generate recipe

```bash
curl -X POST http://localhost:8000/api/generate-recipe \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Need a vegetarian dinner with lentils and tomatoes under 600 calories."
      }
    ]
  }'
```

## 📦 Dependencies

- Deno runtime (no npm/yarn deps).
- Zypher API integration (https://zypher.corespeed.io/).
