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

A small service that runs [Meta Omnilingual ASR](https://github.com/facebookresearch/omnilingual-asr) for Garhwali (`gbm_Deva`). The CM Helpline 1905 phone agent and WhatsApp bot use it when a caller speaks Garhwali or Kumaoni: chosen in the greeting or on WhatsApp (*भाषा*), keypad 2 or 4, or spotted from their words. Hindi and English stay on Sarvam, which is faster.

Kumaoni is not one of Omnilingual's 1,600 languages, so Kumaoni speech is sent here too, as Garhwali, the closest language it has. Omnilingual's published Garhwali error rate is 11% of characters (with its largest model), so the agent reads this transcript alongside Sarvam's.

## Deploy as a free Hugging Face Space

1. Create a Space at huggingface.co/new-space: SDK **Docker**, hardware **CPU basic** (free: 2 vCPU, 16 GB RAM).
2. Upload `app.py`, `requirements.txt`, `Dockerfile` and this `README.md`.
3. In the Space's **Settings → Variables and secrets**, add a secret `TOKEN` with a long random value.
4. When the build finishes, open `https://<user>-<space>.hf.space/`: it should return `{"ok": true, ...}`.
5. On the API server (Render), set `GARHWALI_ASR_URL=https://<user>-<space>.hf.space` and `GARHWALI_ASR_TOKEN` to the same token.

Test it with a WAV file:

```sh
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: audio/wav" --data-binary @sample.wav https://<user>-<space>.hf.space/transcribe
```

## Notes

- The first start downloads the model (`omniASR_CTC_1B_v2`, 3.7 GB) and takes several minutes.
- Free Spaces sleep after 48 idle hours; the first request after that takes a minute. Point a keep-awake ping at `https://<user>-<space>.hf.space/` as well. On a call the agent waits at most 5 s for this service and otherwise carries on with Sarvam's transcript, so a slow or sleeping Space never blocks a call.
- `MODEL_CARD` can be set to `omniASR_LLM_300M_v2` or `omniASR_LLM_1B_v2` on GPU hardware: those are told the language and are more accurate, but too slow on a free CPU for live calls.
