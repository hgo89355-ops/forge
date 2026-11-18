import json, sys
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8")
import subprocess, numpy as np
raw = subprocess.run(["ffmpeg","-v","error","-i",sys.argv[1],"-ac","1","-ar","16000","-f","f32le","-"],capture_output=True).stdout
audio = np.frombuffer(raw, np.float32)
segs, info = m.transcribe(audio, word_timestamps=True, language="en", vad_filter=False)
words = []
for s in segs:
    for w in s.words:
        words.append({"id": f"w{len(words)}", "text": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)})
json.dump(words, open(sys.argv[2], "w"), indent=1)
print(len(words), "words"); print(" ".join(f"{w['text']}@{w['start']}" for w in words))
