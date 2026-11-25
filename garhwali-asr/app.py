"""Garhwali speech-to-text for the CM Helpline 1905 phone agent.

Meta's Omnilingual ASR covers Garhwali (gbm_Deva), which mainstream Indian speech APIs do not.
The API server sends one caller utterance as a WAV file and gets text back:

    POST /transcribe   Authorization: Bearer <TOKEN>   Content-Type: audio/wav   ->   {"text": "..."}

Runs on CPU (a free Hugging Face Space works); expect roughly 1-3 s per utterance with the 300M model.
"""

import os
import tempfile
import time

from fastapi import FastAPI, HTTPException, Request
from omnilingual_asr.models.inference.pipeline import ASRInferencePipeline

TOKEN = os.environ.get("TOKEN", "")
MODEL_CARD = os.environ.get("MODEL_CARD", "omniASR_LLM_300M_v2")
LANG = os.environ.get("LANG_CODE", "gbm_Deva")
MAX_BYTES = 2 * 1024 * 1024  # ~60 s of 16 kHz audio

app = FastAPI(title="Garhwali ASR")
pipeline = ASRInferencePipeline(model_card=MODEL_CARD, device="cpu")


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
    lang = request.query_params.get("lang", LANG)
    started = time.perf_counter()
    with tempfile.NamedTemporaryFile(suffix=".wav") as f:
        f.write(body)
        f.flush()
        text = pipeline.transcribe([f.name], lang=[lang], batch_size=1)[0]
    return {"text": (text or "").strip(), "lang": lang, "ms": round((time.perf_counter() - started) * 1000)}
