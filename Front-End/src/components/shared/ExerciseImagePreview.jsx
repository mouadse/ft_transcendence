import { useEffect, useMemo, useState } from 'react';
import { exerciseImageFramesFromEntity } from '../../utils/exerciseImages';

export default function ExerciseImagePreview({
  exercise,
  alt = '',
  className = '',
  imgClassName = '',
  style,
  imgStyle,
  fallback = null,
  intervalMs = 1200,
  animate = false,
}) {
  const sourceFrames = useMemo(() => exerciseImageFramesFromEntity(exercise), [exercise]);
  const [failedFrames, setFailedFrames] = useState([]);
  const [activeFrame, setActiveFrame] = useState(0);

  const frames = useMemo(
    () => sourceFrames.filter((frame) => !failedFrames.includes(frame)),
    [sourceFrames, failedFrames]
  );
  const safeActiveFrame = frames.length > 0 ? activeFrame % frames.length : 0;

  useEffect(() => {
    if (!animate || frames.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setActiveFrame((prev) => (prev + 1) % frames.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [frames, intervalMs, animate]);

  if (frames.length === 0) {
    return fallback;
  }

  return (
    <div className={className} style={style}>
      {frames.map((frame, index) => (
        <img
          key={frame}
          src={frame}
          alt={alt}
          className={imgClassName}
          style={{
            ...imgStyle,
            opacity: index === safeActiveFrame ? 1 : 0,
            transition: frames.length > 1 ? 'opacity 380ms ease' : 'none',
          }}
          onError={() => {
            setFailedFrames((prev) => (prev.includes(frame) ? prev : [...prev, frame]));
          }}
        />
      ))}
    </div>
  );
}
