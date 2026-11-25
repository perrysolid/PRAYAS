"""Garhwali speech-to-text for the CM Helpline 1905 phone agent and WhatsApp bot.

Meta's Omnilingual ASR covers Garhwali (gbm_Deva), which mainstream Indian speech APIs do not. Kumaoni is
not in Omnilingual, so the helpline sends Kumaoni speech here too: Garhwali is the closest language it has.

    POST /transcribe?lang=gbm_Deva   Authorization: Bearer <TOKEN>   Content-Type: audio/wav (or audio/ogg, ...)
    ->   {"text": "...", "ms": 840}

The API server sends one caller utterance (WAV) or one WhatsApp voice note (Ogg/Opus, converted here with ffmpeg).

Model choice (MODEL_CARD):
- omniASR_CTC_1B_v2 (default): fast enough on a free CPU Space for a live call; it cannot be told the language,
  but Garhwali is in its training data.
- omniASR_LLM_300M_v2 / omniASR_LLM_1B_v2: told the language, so more accurate, but several seconds per
  utterance on CPU. Use them on GPU hardware.
"""

import os
import subprocess
import tempfile
import time

from fastapi import FastAPI, HTTPException, Request
from omnilingual_asr.models.inference.pipeline import ASRInferencePipeline

TOKEN = os.environ.get("TOKEN", "")
MODEL_CARD = os.environ.get("MODEL_CARD", "omniASR_CTC_1B_v2")
LANG = os.environ.get("LANG_CODE", "gbm_Deva")
MAX_BYTES = 4 * 1024 * 1024  # a long voice note
CONDITIONED = "_LLM_" in MODEL_CARD  # only the LLM models take a language code

app = FastAPI(title="Garhwali ASR")
pipeline = ASRInferencePipeline(model_card=MODEL_CARD, device=os.environ.get("DEVICE", "cpu"))


@app.get("/")
def health():
    return {"ok": True, "model": MODEL_CARD, "lang": LANG}


@app.post("/transcribe")
async def transcribe(request: Request):
    if TOKEN and request.headers.get("authorization", "") != f"Bearer {TOKEN}":
        raise HTTPException(status_code=401, detail="unauthorized")
    body = await request.body()
    if not body or len(body) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="audio missing or too long")
    ctype = request.headers.get("content-type", "audio/wav").split(";")[0].strip().lower()
    lang = request.query_params.get("lang", LANG)
    started = time.perf_counter()
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "in.wav" if "wav" in ctype else "in.audio")
        with open(src, "wb") as f:
            f.write(body)
        path = src
        if "wav" not in ctype:
            # WhatsApp voice notes are Ogg/Opus: convert to 16 kHz mono WAV.
            path = os.path.join(tmp, "out.wav")
            done = subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-ar", "16000", "-ac", "1", path], capture_output=True, timeout=30)
            if done.returncode != 0:
                raise HTTPException(status_code=415, detail="could not read that audio")
        kwargs = {"lang": [lang]} if CONDITIONED else {}
        text = pipeline.transcribe([path], batch_size=1, **kwargs)[0]
    return {"text": (text or "").strip(), "lang": lang, "ms": round((time.perf_counter() - started) * 1000)}
