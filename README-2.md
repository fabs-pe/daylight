# ☀️ Daylight

**Less scrolling. More outside.**

Daylight helps you turn a spare 10, 20, or 30 minutes into an outdoor walking break. Describe what you need, choose your pace, and let an open model match you with a walking session. Then put your phone away and head outside.

Built for the **Touch Grass** hackathon theme—and as a hands-on project to practise React, browser AI, and deployment.

🌿 **[Try Daylight](https://trackdaylight.netlify.app/)** · 💻 **[Source code](https://github.com/fabs-pe/daylight)**

## What you can do

- **Find a break that fits your mood:** unwind, step away from studying, explore, or get moving.
- **Choose your time and intensity:** 10, 20, or 30 minutes, with easy or moderate walking.
- **Track your break:** a timestamp-based timer catches up when you return to the page.
- **Keep your progress:** restore an active break after refreshing, and confirm your outdoor minutes before saving.
- **Build an outdoor journal:** see today's total and your previous breaks, stored in your browser.
- **Check the UV forecast:** request your location to view today's forecast maximum UV index.

## A quick walk-through

1. Write something like: “I've been studying all day and need some fresh air.”
2. Pick your time and intensity, then select **Plan my break**.
3. Read your plan and optionally check the UV forecast.
4. Select **Start my break**, put your phone away, and enjoy being outside.
5. Return, finish the timer, confirm your outdoor minutes, and save your break.

The first AI match may take a little longer while the model downloads.

## How the AI works

Daylight runs **[Xenova/all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2)** in your browser using **[Transformers.js](https://github.com/huggingface/transformers.js)**.

It filters a small collection of curated walking sessions by your chosen intensity, creates embeddings for your request and the session descriptions, then selects the closest match using similarity scores. Your selected duration sets the length of the plan.

This is semantic matching rather than generated exercise advice. The walking instructions are curated, while the open model makes the matching responsive to the meaning of what you write.

Inference runs in a **Web Worker** using WebAssembly and a quantized model, keeping the work separate from the main interface.

## Why open innovation matters

- **On-device matching:** your written request is processed in your browser rather than sent to a hosted AI inference service.
- **No AI API key:** visitors can use the matcher without an account or paid inference API.
- **Control over the experience:** the model, matching logic, and walking session collection can be inspected and changed.
- **A simple deployment:** the app runs as a static site without a dedicated AI backend.

An internet connection is needed to load the app and download the model initially. The UV forecast also requires a network request. Daylight does not currently guarantee offline use.

## Privacy and measurement

Your journal and unfinished break are saved in **localStorage** on the browser you use. They are not synced between devices; clearing browser data can remove them.

The UV check asks for location permission only when you request it. Rounded coordinates are sent to **[Open-Meteo](https://open-meteo.com/)** to retrieve the forecast. Daylight does not save those coordinates in your journal.

Recorded minutes represent **self-confirmed outdoor time**, including time in shade. They do not measure sunlight exposure, UV dose, or vitamin D. The UV card shows the forecast daily maximum, rather than the UV level at the moment you check it.

## Built with

| Piece | Technology |
| --- | --- |
| Interface | React and CSS |
| Development and build | Vite |
| Browser AI | Transformers.js and MiniLM |
| Background inference | Web Worker and WebAssembly |
| Local persistence | Browser localStorage |
| UV forecast | Open-Meteo API |
| Hosting | Netlify |

## Run locally

Install Node.js and npm, then run:

```bash
git clone https://github.com/fabs-pe/daylight.git
cd daylight
npm install
npm run dev
```

Open the local URL printed by Vite. No AI API key or environment file is required for the browser matcher and UV forecast.

### Check and build

```bash
npm run lint
npm run build
npm run preview
```

`npm run preview` serves the production build locally. Browser geolocation requires permission and a secure context, such as localhost or an HTTPS deployment.

## Deploy to Netlify

Import your GitHub repository into Netlify and use:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `dist` |

After deployment, check AI matching and the location-based UV forecast on the live HTTPS site.

## What I learned

This project gave me practice with React state and effects, extracting components, browser storage, Web Workers, running an open model in the browser, handling API and permission errors, and deploying with GitHub and Netlify.

The goal is simple: make planning the shortest part of the experience, so more of the break happens outside.

---

Made by **[Fabian Perre](https://github.com/fabs-pe)**. 🌞
