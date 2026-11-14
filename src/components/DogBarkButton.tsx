"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./DogBarkButton.module.css";

export default function DogBarkButton() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  async function bark() {
    if (!audioRef.current) {
      const audio = new Audio("/jauria.mp3");
      audio.preload = "auto";
      audio.volume = 0.8;
      audio.onended = () => setPlaying(false);
      audio.onerror = () => setPlaying(false);
      audioRef.current = audio;
    }
    const audio = audioRef.current;
    audio.currentTime = 0;
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }

  return (
    <button type="button" onClick={bark} aria-label="Reproducir ladridos de una jauría"
      title="¡Suelta a la jauría!" className={`${styles.button} ${playing ? styles.playing : ""}`}>
      <span className={styles.dog} aria-hidden="true">🐶</span>
      <span className={styles.sound} aria-hidden="true">♫</span>
    </button>
  );
}
