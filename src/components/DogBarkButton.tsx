"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./DogBarkButton.module.css";
import { PawIcon } from "./icons";

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
    <button
      type="button"
      onClick={bark}
      aria-label="Reproducir ladridos de una jauría"
      title="¡Suelta a la jauría!"
      className={`relative order-2 sm:order-3 ml-auto sm:ml-0 shrink-0 rounded border border-transparent p-2 sm:p-2.5 text-[#f2e4bd]/85 transition-all hover:border-gold-bright/50 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fff4c5] ${
        playing ? `${styles.playing} bg-gold-bright/15 border-gold-bright/60 text-gold-bright` : ""
      }`}
    >
      <PawIcon className={`${styles.paw} h-4 w-4 sm:h-5 sm:w-5`} />
      <span className={styles.sound} aria-hidden="true">♫</span>
    </button>
  );
}
