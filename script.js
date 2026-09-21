/* =========================================================
   JOSEMI · script.js  (sin frameworks, vanilla puro)
   Módulos: lluvia+pincel, parallax logo, máquina escribir,
   glitch scramble, botón dioses.
   ========================================================= */

/* ---------- 1. LLUVIA MATRIX con rejilla grid[col][fila] ---------- */
const cv = document.getElementById('matrix');
const ctx = cv.getContext('2d');
const CELL = 16;                       // palanca: tamaño de celda
let cols, rows, grid, heads, mouse = {x:-999, y:-999};
const CHARS = 'アイウエオカキクケコサシスセソ01JOSEMI$#@%&';

function resize(){
  cv.width  = innerWidth;
  cv.height = innerHeight;
  cols = Math.ceil(cv.width / CELL);
  rows = Math.ceil(cv.height / CELL);
  grid  = Array.from({length:cols}, ()=>Array.from({length:rows}, ()=>({ch:' ', b:0})));
  heads = Array.from({length:cols}, ()=>Math.floor(Math.random()*rows));
}
addEventListener('resize', resize);
resize();

addEventListener('mousemove', e=>{ mouse.x=e.clientX; mouse.y=e.clientY; });
addEventListener('mouseleave', ()=>{ mouse.x=mouse.y=-999; });

function rain(){
  ctx.fillStyle = 'rgba(12,14,8,.35)';          // rastro (palanca: alfa)
  ctx.fillRect(0,0,cv.width,cv.height);
  ctx.font = CELL + 'px monospace';

  for(let c=0;c<cols;c++){
    // frente que baja por la columna
    heads[c] = (heads[c] + 0.5) % rows;
    const h = Math.floor(heads[c]);
    grid[c][h].ch = CHARS[(Math.random()*CHARS.length)|0];
    grid[c][h].b  = 1;

    for(let r=0;r<rows;r++){
      const cell = grid[c][r];
      const cx = c*CELL + CELL/2, cy = r*CELL + CELL/2;

      // pincel del ratón: enciende cerca del cursor (lerp hacia 1)
      const d = Math.hypot(cx-mouse.x, cy-mouse.y);
      if(d < 90) cell.b += (1 - cell.b) * 0.3;   // palanca: 90=radio, .3=fuerza

      cell.b *= 0.94;                             // decaimiento (palanca)

      if(cell.b > 0.03){
        const near = d < 90;                      // halo verde en el pincel
        ctx.fillStyle = near
          ? `rgba(168,184,104,${cell.b})`         // --b3 cuando el ratón pasa
          : `rgba(138,154,91,${cell.b})`;         // --oliva normal
        ctx.fillText(cell.ch, cx, cy);
      }
    }
  }
  requestAnimationFrame(rain);
}
rain();

/* ---------- 2. PARALLAX SOLO del logo ---------- */
const logo = document.getElementById('logo');
addEventListener('mousemove', e=>{
  const dx = (e.clientX/innerWidth  - .5) * 12;   // palanca: 12 = intensidad
  const dy = (e.clientY/innerHeight - .5) * 12;
  logo.style.setProperty('--tx', dx + 'px');
  logo.style.setProperty('--ty', dy + 'px');
});

/* ---------- 3. MÁQUINA DE ESCRIBIR en #frase ---------- */
const frase = document.getElementById('frase');
const texto = frase.textContent;
frase.textContent = '';
let i = 0;
(function escribir(){
  frase.textContent = texto.slice(0, i++);
  if(i <= texto.length) setTimeout(escribir, 45);  // palanca: 45 = velocidad
})();

/* ---------- 4. GLITCH SCRAMBLE en #logo (escribe textContent) ---------- */
const GLYPH = '!<>-_\\/[]{}—=+*^?#';
let scrambling = false;
logo.addEventListener('mouseenter', ()=>{
  if(scrambling) return;
  scrambling = true;
  const target = logo.dataset.text;                // "JOSEMI"
  let frame = 0;
  const total = 22;
  (function step(){
    let out = '';
    for(let k=0;k<target.length;k++){
      const reveal = k * (total/target.length);
      out += frame > reveal ? target[k] : GLYPH[(Math.random()*GLYPH.length)|0];
    }
    logo.textContent = out;                        // NO toca background
    frame++;
    if(frame <= total) requestAnimationFrame(step);
    else { logo.textContent = target; scrambling = false; }
  })();
});

/* ---------- 5. BOTÓN DIOSES ---------- */
const dioses = [
  'Zeus: el trueno es solo automatización con estilo.',
  'Atenea: estrategia antes que fuerza bruta.',
  'Hermes: el dios de los mensajes... como WhatsApp.',
  'Hefesto: el dios artesano que construye las herramientas.',
  'Apolo: luz, orden y código limpio.',
  'Poseidón: flujos de datos como olas.'
];
document.getElementById('boton-dios').addEventListener('click', ()=>{
  document.getElementById('mensaje-dios').textContent =
    dioses[(Math.random()*dioses.length)|0];
});