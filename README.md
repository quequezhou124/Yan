# Yan

Yan is a hackathon prototype for practicing real-world English conversations in high-stress newcomer scenarios like airports, shopping, and daily interactions.

The frontend lets users choose a scenario, generate guided dialogue with phonetic hints, and practice the conversation in an interactive scene.

## Demo

![Page 1 setup and content generation](docs/images/page1-generate-state.png)
![Page 2 airport dialogue practice](docs/images/page2-airport-dialogue.png)

## Technology Stack

### AI & Language Models

- **GPT-4o** - scenario generation and conversational responses
- **GPT-5.4** - advanced dialogue generation and reasoning
- **Ollama** - local model hosting and inference

### Speech & Linguistic Resources

- **CMU Pronouncing Dictionary (CMUDict)** - phonetic transcription and pronunciation support

### Backend

- **Flask** - API services and application logic

Backend code is maintained on the `backend` branch.

### Frontend

- **React**
- **TypeScript**
- **Vite**
- **ESLint**
- **CSS**

## Local Setup

```bash
npm install
npm run dev
```

Create `.env.local` with:

```env
VITE_API_BASE_URL=/api/v1
API_PROXY_TARGET=http://127.0.0.1:8000
```

Start the backend server separately (see `backend` branch for instructions).

## Scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`
