import React from 'react';

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const random = seededRandom(0xD12A60);
const range = (min, max) => min + random() * (max - min);
const signed = (amount) => range(-amount, amount);

const PARTICLES = Array.from({ length: 64 }, (_, index) => {
  const depth = range(.12, 1);
  const bubble = random() < .2;
  const rainDuration = range(.72, 1.42) + (1 - depth) * .42;
  const snowDuration = range(10, 20) + (1 - depth) * 5;
  const ashDuration = range(9, 18) + (1 - depth) * 4;
  const fireflyDuration = range(12, 26);
  const bubbleDuration = range(10, 21) + (1 - depth) * 5;
  const alpha = range(.26, .82);

  return {
    id: index,
    className: `ambience-particle${bubble ? ' is-bubble' : ' is-mote'}${depth > .74 ? ' is-near' : depth < .36 ? ' is-far' : ''}`,
    style: {
      '--x': `${range(-3, 103).toFixed(2)}%`,
      '--y': `${range(12, 88).toFixed(2)}%`,
      '--alpha': alpha.toFixed(2),
      '--alpha-soft': (alpha * .65).toFixed(2),
      '--alpha-dim': (alpha * .48).toFixed(2),
      '--alpha-star': (alpha * .72).toFixed(2),
      '--blur': `${depth < .3 ? range(.7, 1.6).toFixed(2) : 0}px`,
      '--drift-a': `${signed(5).toFixed(2)}vw`,
      '--drift-b': `${signed(8).toFixed(2)}vw`,
      '--drift-c': `${signed(11).toFixed(2)}vw`,
      '--spin': `${range(180, 760).toFixed(0)}deg`,
      '--rain-width': `${range(.55, 1.2).toFixed(2)}px`,
      '--rain-length': `${range(25, 72) * (.55 + depth * .55)}px`,
      '--rain-duration': `${rainDuration.toFixed(2)}s`,
      '--rain-delay': `${(-random() * rainDuration).toFixed(2)}s`,
      '--snow-size': `${range(1.4, 5.6) * (.55 + depth * .6)}px`,
      '--snow-duration': `${snowDuration.toFixed(2)}s`,
      '--snow-delay': `${(-random() * snowDuration).toFixed(2)}s`,
      '--ash-width': `${range(1.2, 3.7) * (.6 + depth * .55)}px`,
      '--ash-height': `${range(2.4, 6.8) * (.6 + depth * .55)}px`,
      '--ash-duration': `${ashDuration.toFixed(2)}s`,
      '--ash-delay': `${(-random() * ashDuration).toFixed(2)}s`,
      '--firefly-size': `${range(1.5, 3.3) * (.65 + depth * .45)}px`,
      '--firefly-duration': `${fireflyDuration.toFixed(2)}s`,
      '--firefly-delay': `${(-random() * fireflyDuration).toFixed(2)}s`,
      '--pulse-duration': `${range(2.6, 6.4).toFixed(2)}s`,
      '--pulse-delay': `${range(-6, 0).toFixed(2)}s`,
      '--bubble-size': `${bubble ? range(4, 11) : range(1, 3.2)}px`,
      '--bubble-duration': `${bubbleDuration.toFixed(2)}s`,
      '--bubble-delay': `${(-random() * bubbleDuration).toFixed(2)}s`,
      '--mote-duration': `${range(16, 34).toFixed(2)}s`,
      '--mote-delay': `${range(-28, 0).toFixed(2)}s`,
      '--star-size': `${range(.7, 2.2).toFixed(2)}px`,
      '--star-duration': `${range(3.5, 9).toFixed(2)}s`,
      '--star-delay': `${range(-8, 0).toFixed(2)}s`,
    },
  };
});

export default function BattlefieldAmbience() {
  return (
    <div className="battlefield-ambience" aria-hidden="true">
      <span className="ambience-haze ambience-haze-a" />
      <span className="ambience-haze ambience-haze-b" />
      <span className="ambience-aurora ambience-aurora-a" />
      <span className="ambience-aurora ambience-aurora-b" />
      <span className="ambience-aurora ambience-aurora-c" />
      <span className="ambience-particles">
        {PARTICLES.map((particle) => (
          <i className={particle.className} key={particle.id} style={particle.style} />
        ))}
      </span>
    </div>
  );
}
