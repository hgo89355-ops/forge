import soundfile as sf, numpy as np
from kokoro_onnx import Kokoro
k = Kokoro('/home/user/vending-short/audio/kokoro-v1.0.onnx', '/home/user/vending-short/audio/voices-v1.0.bin')
lines = [
 "Your key is a password, made of metal.",
 "Inside your lock are tiny pins, stacked in pairs, and pushed down by springs.",
 "The top pins cross the gap, so the cylinder can't turn. Locked.",
 "Now slide in the right key. Each cut lifts its pins to a different height, until every gap lines up on one line.",
 "Click. It turns.",
 "Wrong key? One pin, less than a millimetre off, and it jams.",
 "Five or six pins, several heights each: tens of thousands of possible keys.",
 "And the idea is thousands of years old. Ancient wooden pin locks worked the same way.",
 "Follow for more hidden engineering.",
]
gaps = [0.45, 0.35, 0.5, 0.3, 0.55, 0.45, 0.45, 0.4, 0.0]
sr = 24000; out = [np.zeros(int(0.25*sr), dtype=np.float32)]
for t, g in zip(lines, gaps):
    a, sr = k.create(t, voice='am_fenrir', speed=1.0, lang='en-us')
    out += [a.astype(np.float32), np.zeros(int(g*sr), dtype=np.float32)]
audio = np.concatenate(out + [np.zeros(int(0.6*sr), dtype=np.float32)])
sf.write('assets/audio/voice.wav', audio, sr); print(len(audio)/sr)
