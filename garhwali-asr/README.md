---
title: Garhwali ASR
emoji: 🏔️
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# Garhwali speech-to-text

A small service that runs [Meta Omnilingual ASR](https://github.com/facebookresearch/omnilingual-asr) for Garhwali (`gbm_Deva`), used by the CM Helpline 1905 phone agent when a caller speaks Garhwali (or presses 2). Hindi and English stay on Sarvam, which is faster.

## Deploy as a free Hugging Face Space

1. Create a Space at huggingface.co/new-space: SDK **Docker**, hardware **CPU basic** (free).
2. Upload `app.py`, `requirements.txt`, `Dockerfile` and this `README.md`.
3. In the Space's **Settings → Variables and secrets**, add a secret `TOKEN` with a long random value.
4. When the build finishes, open `https://<user>-<space>.hf.space/`: it should return `{"ok": true, ...}`.
5. On the API server (Render), set `GARHWALI_ASR_URL=https://<user>-<space>.hf.space` and `GARHWALI_ASR_TOKEN` to the same token.

Test it with a WAV file:

```sh
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: audio/wav" --data-binary @sample.wav https://<user>-<space>.hf.space/transcribe
```

## Notes

- Not yet tested end to end: the first build downloads the model (about 1.2 GB) and takes several minutes.
- Free Spaces sleep after 48 idle hours; the first request after that takes a minute. The phone agent gives up after 3.5 s and carries on with the Sarvam transcript alone, so a sleeping Space never blocks a call.
- `MODEL_CARD` (default `omniASR_LLM_300M_v2`) can be set to a larger model on better hardware for more accuracy.
