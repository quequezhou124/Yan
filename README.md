# Yan Backend

Yan is a Flask backend that uses Ollama to generate scene-based phonics and sentence content in JSON format.

## Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
export OLLAMA_BASE_URL=http://localhost:11434
export OLLAMA_MODEL=gpt-oss:120b-cloud
venv/bin/python run.py
```

## API Endpoints

- `GET /api/v1/health`
- `POST /api/v1/echo`
- `GET /api/v1/content/<userid>/<scene>/<origin_lang>/<country>`

## Content Endpoint

`GET /api/v1/content/<userid>/<scene>/<origin_lang>/<country>` calls Ollama to generate:

- `p1`: 3 to 6 phonics or letter-combination items in the form `[ipa, letter_combo, example_word]`
- `p2.sentences`: 5 to 10 English scene sentences
- `p2.tsentences`: aligned translations in `origin_lang`, localized for `country`
- `userid` is used to remember previously generated phonics items for that learner; items seen more often are deprioritized in future generations

Example request:

```bash
curl -s "http://127.0.0.1:8000/api/v1/content/1/shopping/zh-CN/China"
```

Example response:

```json
{
  "p1": [
    ["/sh/", "sh", "shop"],
    ["/ch/", "ch", "chair"],
    ["/th/", "th", "think"]
  ],
  "p2": {
    "sentences": [
      "I walk into the shop.",
      "The chair is near the door.",
      "I think about what to buy.",
      "The cashier smiles at me.",
      "I carry my bag home."
    ],
    "tsentences": [
      "我走进商店。",
      "椅子在门边。",
      "我想买什么。",
      "收银员对我微笑。",
      "我提着袋子回家。"
    ]
  }
}
```

## Ollama Configuration

The `/content` endpoint reads these environment variables:

- `OLLAMA_BASE_URL` default: `http://localhost:11434`
- `OLLAMA_MODEL` default: `gpt-oss:120b-cloud`
- `OLLAMA_TIMEOUT_SECONDS` default: `60`
- `OLLAMA_MAX_RETRIES` default: `2`
- `YAN_USER_PROGRESS_FILE` default: `data/user_progress.json`

If generation fails after retries, the API returns:

```json
{
  "error": "ollama_generation_failed",
  "message": "Model did not return valid content JSON"
}
```

## Local Testing

Check that Ollama is reachable:

```bash
curl http://localhost:11434/api/tags
```

Run unit tests:

```bash
venv/bin/python -m unittest discover -s tests -v
```

Pretty-print a live response with `jq`:

```bash
curl -s "http://127.0.0.1:8000/api/v1/content/1/airport/ja/Japan" | jq
```
