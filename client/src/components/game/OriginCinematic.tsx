import { useEffect, useRef, useState } from 'react';
import { alignmentSlug } from '../../game/assets/lineage';
import { ORIGIN_STORY, originAsset } from '../../game/originCinematic';
import '../../styles/origin-v160.css';

export default function OriginCinematic({ alignment, onComplete }: { alignment: string; onComplete: () => void }) {
  const branch = alignmentSlug(alignment);
  const scenes = ORIGIN_STORY[branch];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (paused || index === scenes.length - 1) return;
    const timer = window.setTimeout(() => setIndex(current => Math.min(scenes.length - 1, current + 1)), 4800);
    return () => window.clearTimeout(timer);
  }, [index, paused, scenes.length]);

  useEffect(() => {
    skip.current?.focus();
  }, []);

  useEffect(() => {
    const track = audio.current;
    if (paused) track?.pause();
    else if (sound && track) void track.play().catch(() => setSound(false));
  }, [paused]);

  useEffect(() => {
    const track = audio.current;
    if (!track) return;
    track.volume = .42;
    void track.play().then(() => setSound(true)).catch(() => setSound(false));
    return () => { track.pause(); track.currentTime = 0; };
  }, [branch]);

  const toggleSound = async () => {
    const track = audio.current;
    if (!track) return;
    if (sound) { track.pause(); setSound(false); }
    else { try { await track.play(); setPaused(false); setSound(true); } catch { setSound(false); } }
  };
  const scene = scenes[index];
  return <section className={`origin-cinematic ${branch}`} role="dialog" aria-modal="true"
    aria-label="Chuyện mở đầu" data-reduced-motion={reducedMotion}>
    <audio ref={audio} src={`/assets/v160/intro_${branch}_score.wav`} loop preload="auto" />
    <div className="origin-cinematic-picture" key={`${branch}-${index}`}
      style={{ backgroundImage: `linear-gradient(0deg, #070c13 2%, transparent 64%), url(${originAsset(branch, scene.image)})` }} />
    <header className="origin-cinematic-top">
      <span>VẠN ĐẠO TRƯỜNG SINH · KHỞI NGUYÊN</span>
      <div>
        <button type="button" onClick={toggleSound} aria-label={sound ? 'Tắt âm thanh' : 'Bật âm thanh'}>
          {sound ? 'Âm thanh: bật' : 'Bật âm thanh'}</button>
        <button ref={skip} type="button" onClick={onComplete}>Bỏ qua</button>
      </div>
    </header>
    <div className="origin-cinematic-caption" aria-live="polite">
      <small>{branch === 'immortal' ? 'TIÊN ĐẠO' : 'MA ĐẠO'} · {index + 1} / {scenes.length}</small>
      <h1>{scene.heading}</h1><p>{scene.text}</p>
      <div className="origin-cinematic-controls">
        <button type="button" onClick={() => setIndex(current => Math.max(0,current-1))} disabled={index === 0}>Trước</button>
        <button type="button" onClick={() => setPaused(value => !value)}>{paused ? 'Tiếp tục' : 'Tạm dừng'}</button>
        {index === scenes.length - 1
          ? <button type="button" className="primary" onClick={onComplete}>Bắt đầu hành trình</button>
          : <button type="button" className="primary" onClick={() => setIndex(current => current+1)}>Tiếp theo</button>}
      </div>
    </div>
  </section>;
}
