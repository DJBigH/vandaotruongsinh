"""Small original, deterministic combat cues. No sampled third-party audio."""
from pathlib import Path
import wave
import numpy as np

RATE = 22050


def export_sounds(out: Path):
    out.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(4127)
    sounds = {}
    t = np.arange(round(RATE*.15))/RATE
    noise = np.convolve(rng.normal(0, 1, len(t)), np.ones(7)/7, mode='same')
    sounds['sfx_sword'] = (np.sin(2*np.pi*(1050*t-1700*t*t))*.45 + noise*.30)*np.sin(np.pi*np.minimum(t/.15,1))**2*np.exp(-t*16)
    t = np.arange(round(RATE*.16))/RATE
    sounds['sfx_hit'] = (np.sin(2*np.pi*(190*t-260*t*t))*.55 + rng.normal(0,.11,len(t)))*np.exp(-t*28)*np.minimum(1,t/.004)
    t = np.arange(round(RATE*.36))/RATE
    sounds['sfx_cast'] = (np.sin(2*np.pi*587.33*t)*.30+np.sin(2*np.pi*880*t)*.13+np.sin(2*np.pi*1174.66*t)*.06)*np.minimum(1,t/.018)*np.exp(-t*8)
    t = np.arange(round(RATE*.22))/RATE
    noise = np.convolve(rng.normal(0,1,len(t)),np.ones(13)/13,mode='same')
    sounds['sfx_dodge'] = noise*.65*np.sin(np.pi*np.minimum(t/.22,1))**1.7
    assets=[]
    for name, samples in sounds.items():
        samples = np.clip(samples*.7,-.8,.8)
        path = out/f'{name}.wav'
        with wave.open(str(path),'wb') as file:
            file.setnchannels(1);file.setsampwidth(2);file.setframerate(RATE)
            file.writeframes((samples*32767).astype('<i2').tobytes())
        assets.append({'key':name,'file':f'assets/vnext/audio/{name}.wav','type':'audio',
                       'source':'art/vnext/synthesize_sfx.py','sampleRate':RATE,
                       'durationMs':round(len(samples)/RATE*1000),'provenance':'original deterministic synthesis; no external samples'})
    return assets


if __name__ == '__main__':
    print(export_sounds(Path(__file__).resolve().parents[2]/'client/public/assets/vnext/audio'))
