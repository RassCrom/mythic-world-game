Card art goes here.

Drop a JPG per card named after the card's def id, e.g.:

  baby_dragon.jpg
  basic_crimson.jpg
  m_battering.jpg
  u_sigil.jpg
  d_cage.jpg
  s_venom.jpg
  i_roar.jpg

The full list of ids is in shared/cards.js. Recommended size: 500x420 (5:7
card, art fills the middle band; it is object-fit: cover so any landscape
crop works). Until an image exists the client renders a procedural
placeholder tinted with the card's color, so missing art never breaks the UI.
