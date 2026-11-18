import soundfile as sf, numpy as np
from kokoro_onnx import Kokoro
k = Kokoro('/home/user/vending-short/audio/kokoro-v1.0.onnx', '/home/user/vending-short/audio/voices-v1.0.bin')
lines = ["Your key is a password made of metal.", "Inside, tiny pin pairs sit on springs, and the top pins block the cylinder.",
 "Wrong key?", "One pin stops just short of the line, and it jams.", "The right key lifts every pin to exactly the right height, so every gap lines up on one line.",
 "Click.", "The door swings open.", "Five pins, ten heights each: almost eighty thousand possible keys, and only yours fits.", "Which is why"]
sr = 24000; parts = []
for t in lines:
    a, sr = k.create(t, voice='am_fenrir', speed=0.98, lang='en-us')
    # trim leading/trailing silence
    idx = np.where(np.abs(a) > 0.01)[0]; a = a[max(0, idx[0] - 200): idx[-1] + 400]
    parts += [a.astype(np.float32), np.zeros(int(0.12 * sr), np.float32)]
audio = np.concatenate(parts[:-1])
sf.write('assets/audio/voice_v5_placeholder.wav', audio, sr); print(round(len(audio) / sr, 2), 's')
