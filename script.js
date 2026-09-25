/* =========================================================
   JOSEMI-OS · portfolio interactivo
   WM = motor de ventanas. Apps = contenido plug-in.
   v1.3: + Tetris, + Pac-Man (fantasma perseguidor), + Matrix como wallpaper real.

   ORDEN MENTAL DEL PROGRAMA
   1. Se recuperan los ajustes guardados.
   2. Apps describe el contenido de cada aplicación.
   3. WM crea, mueve, redimensiona y cierra ventanas.
   4. Los build... conectan el HTML con eventos del usuario.
   5. initLogin y typeLoginArt preparan la pantalla inicial.
   ========================================================= */
// Atajos: $(selector) devuelve el primer elemento y $$(selector), un array con todos.
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
// sleep permite usar "await sleep(ms)"; pad convierte 7 en "07" para el reloj.
const sleep=ms=>new Promise(r=>setTimeout(r,ms)), pad=n=>String(n).padStart(2,'0');

/* --- Estado persistente --- */
// DEF contiene valores iniciales. Object.assign mezcla encima lo guardado en localStorage.
const DEF={accent:'#6dff9b',bg:'#050806',wp:0,sound:true,motion:false};
let state=Object.assign({},DEF);
try{ state=Object.assign(state, JSON.parse(localStorage.getItem('josemi-os')||'{}')); }catch(e){}
if(['#6C63FF','#00C8FF','#4ade80','#f5b942'].includes(state.accent))state.accent='#6dff9b';
// localStorage conserva datos aunque se cierre o recargue la pestaña.
const save=()=>{ try{ localStorage.setItem('josemi-os',JSON.stringify(state)); }catch(e){} };

/* --- Wallpapers (tonos planos estilo Win95) --- */
// [FIX] Añadido 'matrix' como 5º wallpaper (índice 4).
const WALLS=[
  'radial-gradient(circle at 18% 18%, rgba(40,130,82,.18), transparent 28%), radial-gradient(circle at 78% 70%, rgba(40,110,160,.10), transparent 30%), var(--bg)',
  'radial-gradient(circle at 80% 18%, rgba(53,190,146,.14), transparent 25%), var(--bg)',
  'radial-gradient(circle at 50% 115%, rgba(64,110,210,.18), transparent 38%), var(--bg)',
  'radial-gradient(circle at 15% 85%, rgba(142,82,190,.13), transparent 30%), var(--bg)',
  'matrix'
];
// [FIX] Si el wp guardado no es válido (p.ej. un número raro), lo ponemos a 0 para evitar errores.
if(!Number.isInteger(state.wp)||state.wp<0||state.wp>=WALLS.length)state.wp=0;

/* =========================================================
   [NOU] MATRIX WALLPAPER PERSISTENT
   Es dibuixa DINS del #bg (així respecta el teu z-index i el parallax).
   ========================================================= */
let matrixCanvas=null,matrixCtx=null,matrixAnim=null,matrixDrops=[];
const matrixChars='ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎ01JOSEMI<>/*#';

// Arrenca la pluja: crea un <canvas> fill del #bg.
function startMatrix(){
  if(matrixCanvas)return;                       // si ja corre, no el dupliquem
  const bg=$('#bg'); if(!bg)return;
  matrixCanvas=document.createElement('canvas');
  matrixCanvas.id='matrix-wall';
  matrixCanvas.setAttribute('aria-hidden','true');
  Object.assign(matrixCanvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});
  bg.appendChild(matrixCanvas);
  matrixCtx=matrixCanvas.getContext('2d');
  resizeMatrix();
  addEventListener('resize',resizeMatrix);
  matrixAnim=requestAnimationFrame(loopMatrix);
}
// Recalcula mides i columnes quan canvia la pantalla.
function resizeMatrix(){
  if(!matrixCanvas)return;
  matrixCanvas.width=innerWidth; matrixCanvas.height=innerHeight;
  matrixCtx.fillStyle='#000'; matrixCtx.fillRect(0,0,innerWidth,innerHeight);
  matrixDrops=Array(Math.floor(innerWidth/18)).fill(1);
}
// Bucle d'animació. [FIX] rastre curt (.14) + cap blanc + caiguda ràpida (+=2).
function loopMatrix(){
  if(!matrixCtx)return;
  matrixCtx.fillStyle='rgba(0,0,0,.14)';
  matrixCtx.fillRect(0,0,matrixCanvas.width,matrixCanvas.height);
  matrixCtx.font='16px monospace';
  matrixDrops.forEach((y,i)=>{
    const ch=matrixChars[Math.floor(Math.random()*matrixChars.length)];
    matrixCtx.fillStyle='rgba(190,255,190,.95)';                 // cap blanc brillant
    matrixCtx.fillText(ch,i*18,y*18);
    matrixCtx.fillStyle='#00ff41';                                // cos verd (un per damunt)
    matrixCtx.fillText(matrixChars[Math.floor(Math.random()*matrixChars.length)],i*18,(y-1)*18);
    if(y*18>matrixCanvas.height&&Math.random()>.975)matrixDrops[i]=0;
    matrixDrops[i]+=1;   // Velocidad más calmada para que el fondo no distraiga
  });
  matrixAnim=requestAnimationFrame(loopMatrix);
}
// Apaga i neteja la pluja.
function stopMatrix(){
  if(matrixAnim)cancelAnimationFrame(matrixAnim);
  removeEventListener('resize',resizeMatrix);
  if(matrixCanvas)matrixCanvas.remove();
  matrixCanvas=null;matrixCtx=null;matrixAnim=null;matrixDrops=[];
}

/* --- Aplicar tema (colors + wallpaper + matrix) --- */
// [FIX] Ara entén 'matrix' i només l'arrenca quan el desktop és visible.
function applyTheme(){
  document.documentElement.style.setProperty('--accent',state.accent);
  document.documentElement.style.setProperty('--bg',state.bg);
  const bg=$('#bg');
  const desktopVisible=!$('#desktop').classList.contains('hidden');
  if(state.wp===4){                                   // wallpaper = matrix
    if(bg)bg.style.background='#000';                 // fons negre sota la pluja
    if(desktopVisible&&!state.motion)startMatrix();    // pluja actiu dins del desktop
    else stopMatrix();
  }else{
    stopMatrix();
    if(bg)bg.style.background=WALLS[state.wp];
  }
  document.body.classList.toggle('reduce-motion',state.motion);
}
applyTheme();

/* --- Sonido Win95 "ding" (Web Audio, sin archivos) --- */
let AC;
function beep(){
  if(!state.sound)return;
  try{
    // Web Audio genera dos notas cuadradas; no hace falta descargar un archivo de sonido.
    AC=AC||new (window.AudioContext||window.webkitAudioContext)();
    const t=AC.currentTime;
    [[1046,.08],[784,.14]].forEach(([f,d],i)=>{
      const o=AC.createOscillator(),g=AC.createGain();
      o.type='square';o.frequency.value=f;o.connect(g);g.connect(AC.destination);
      const s=t+i*.09;
      g.gain.setValueAtTime(.04,s);g.gain.exponentialRampToValueAtTime(.0001,s+d);
      o.start(s);o.stop(s+d);
    });
  }catch(e){}
}
// Una notificación "toast" se crea, se anima y se elimina para no acumular nodos en el DOM.
function toast(m){const t=document.createElement('div');t.className='toast';t.textContent=m;$('#toasts').appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transform='translateX(20px)';t.style.transition='.3s';},2600);setTimeout(()=>t.remove(),3000);}

/* ========================================================= APPS
   Cada propiedad es una aplicación. render() devuelve su HTML y bind(), cuando
   existe, conecta eventos después de insertar ese HTML en una ventana.
   Añadir una app nueva aquí y su id en ICONS basta para mostrarla en el sistema.
   ========================================================= */
const PROFILE={
  nombre:'José Miguel Miralles Gandia',
  corto:'Josemi',
  rol:'Desarrollador de software en proceso',
  estudios:'DAM · Desarrollo de Aplicaciones Multiplataforma · SSIMARRO',
  estado:'Aprendiendo mientras construyo proyectos reales',
  ubicacion:'España',
  bio:'Soy estudiante de DAM y me interesa especialmente el mundo de la informática. Ahora mismo estoy profundizando en HTML, CSS y JavaScript construyendo este portfolio, y me gusta utilizar la IA como una herramienta para aprender, crear y resolver problemas con más posibilidades.',
  aspiracion:'Aspiro a desarrollar automatizaciones y aplicaciones para grandes empresas, combinando programación, inteligencia artificial y mucha creatividad para construir soluciones útiles.',
  gustos:['Informática','Inteligencia artificial','Automatización','Creatividad','Gimnasio','Boxeo','Running','E-commerce / dropshipping']
};

const pixelIcon=tipo=>`<span class="app-pixel-icon app-pixel-icon--${tipo}" aria-hidden="true"></span>`;

const Apps={
 about:{title:'Sobre mí',icon:'👤',render:()=>`
   <section class="profile-hero">
     <div class="profile-hero__terminal"><span>josemi@portfolio</span><b>DESARROLLADOR EN PROCESO</b></div>
     <h2>José Miguel Miralles Gandia</h2>
     <p>${PROFILE.bio}</p>
     <div class="chips">${PROFILE.gustos.map(x=>`<span class="chip">${x}</span>`).join('')}</div>
   </section>
   <div class="content-grid">
     <article class="content-card"><span class="card-kicker">01 / AHORA</span><h3>Qué estoy haciendo</h3><p>Estudio <strong>DAM</strong> en <strong>SSIMARRO</strong>. Este proyecto es mi forma de practicar frontend, interacción, diseño y JavaScript mientras construyo algo que realmente me representa.</p></article>
     <article class="content-card"><span class="card-kicker">02 / OBJETIVO</span><h3>Hacia dónde voy</h3><p>${PROFILE.aspiracion}</p></article>
     <article class="content-card"><span class="card-kicker">03 / FUERA DEL CÓDIGO</span><h3>No todo es programar</h3><p>Me gusta entrenar en el gimnasio, hacer deporte, practicar boxeo y salir a correr. También experimento con e-commerce y dropshipping.</p></article>
     <article class="content-card"><span class="card-kicker">04 / MENTALIDAD</span><h3>Build · learn · repeat</h3><p>Estoy al principio del camino, así que prefiero enseñar progreso real antes que fingir experiencia que todavía no tengo.</p></article>
   </div>`},

 projects:{title:'Proyectos',icon:'📁',render:()=>`
   <div class="app-title">/PROYECTOS</div>
   <p class="bio">Aquí separo lo que ya estoy construyendo de las áreas en las que quiero seguir experimentando. No relleno el portfolio con proyectos inventados.</p>
   <div class="folder-grid">
     <div class="folder" tabindex="0" data-folder="web"><span class="g">⌘</span><span class="n">JOSEMI-OS</span><small>Proyecto real</small></div>
     <div class="folder" tabindex="0" data-folder="school"><span class="g">{ }</span><span class="n">DAM</span><small>Formación</small></div>
     <div class="folder" tabindex="0" data-folder="auto"><span class="g">⚙</span><span class="n">Automatización</span><small>Roadmap</small></div>
     <div class="folder" tabindex="0" data-folder="ai"><span class="g">✦</span><span class="n">IA + software</span><small>Roadmap</small></div>
   </div>`,
   bind(b){b.querySelectorAll('.folder').forEach(f=>{
     const abrir=()=>openProject(f.dataset.folder);
     f.addEventListener('dblclick',abrir);
     f.addEventListener('keydown',e=>{if(e.key==='Enter')abrir();});
   });}},

 skills:{title:'Habilidades',icon:'⚡',render:()=>`
   <div class="app-title">STACK / ESTADO ACTUAL</div>
   <div class="skill-focus">
     <span class="card-kicker">DONDE MÁS CÓMODO ESTOY AHORA</span>
     <div class="skill-big"><span>HTML</span><span>CSS</span><span>JavaScript</span></div>
     <p>Son las tecnologías con las que más estoy trabajando actualmente porque estoy desarrollando JOSEMI-OS.</p>
   </div>
   <div class="content-grid content-grid--compact">
     <article class="content-card"><span class="card-kicker">FORMACIÓN DAM</span><h3>Base de desarrollo</h3><p>Programación, aplicaciones multiplataforma y bases de datos dentro de mi formación. Prefiero no poner porcentajes falsos: mi nivel sigue creciendo.</p></article>
     <article class="content-card"><span class="card-kicker">ENFOQUE</span><h3>IA + automatización</h3><p>Quiero aprender a utilizar la IA para acelerar desarrollo, crear automatizaciones y construir aplicaciones con más creatividad.</p></article>
     <article class="content-card"><span class="card-kicker">HERRAMIENTAS</span><h3>Git & GitHub</h3><p>Uso Git y GitHub para versionar este portfolio y seguir aprendiendo un flujo de trabajo real.</p></article>
     <article class="content-card"><span class="card-kicker">SIGUIENTE PASO</span><h3>Más proyectos</h3><p>La prioridad es construir, equivocarme, corregir y convertir cada proyecto en evidencia real de lo que sé hacer.</p></article>
   </div>`},

 terminal:{title:'Terminal',icon:'💻',render:()=>`
   <div class="term"><div class="term__out" id="term-out"></div>
   <div class="term__line"><span class="p">josemi@portfolio</span>:<span class="dir">~</span>$<input class="term__in" id="term-in" autocomplete="off" spellcheck="false"></div></div>`,
   bind(b){const out=$('#term-out',b),inp=$('#term-in',b);
     const print=(h,c='')=>{const d=document.createElement('div');d.className=c;d.innerHTML=h;out.appendChild(d);out.scrollTop=out.scrollHeight;};
     print('Terminal de JOSEMI-OS · escribe <span class="ok">ayuda</span>');
     inp.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const raw=inp.value.trim();inp.value='';
       print(`<span class="p">josemi@portfolio</span>:<span class="dir">~</span>$ ${raw}`);runCommand(raw,print,openWindow);});
     b.addEventListener('click',()=>inp.focus());}},

 readme:{title:'README.md',icon:'📄',render:()=>`
   <article class="markdown-view">
     <div class="md-path">~/JOSEMI-OS/README.md</div>
     <h1>JOSEMI-OS</h1>
     <blockquote><strong>Primer proyecto personal como desarrollador de José Miguel Miralles Gandia.</strong></blockquote>
     <p>JOSEMI-OS es mi portfolio convertido en un pequeño sistema operativo interactivo. No quería hacer una web típica de “sobre mí + proyectos + contacto”, así que decidí construir un espacio que se pueda explorar, abrir, tocar y descubrir.</p>
     <h2>¿Quién soy?</h2>
     <p>Soy <strong>José Miguel Miralles Gandia</strong>, estudiante de <strong>DAM (Desarrollo de Aplicaciones Multiplataforma) en SSIMARRO</strong> y desarrollador de software en proceso.</p>
     <p>Ahora mismo estoy trabajando especialmente con <code>HTML</code>, <code>CSS</code> y <code>JavaScript</code>. Me interesa la informática, la inteligencia artificial y el potencial de combinar software, automatización y creatividad.</p>
     <h2>¿Qué es esta web?</h2>
     <ul><li>Un portfolio interactivo presentado como un sistema operativo propio.</li><li>Un laboratorio para practicar frontend, interacción y JavaScript.</li><li>Un proyecto que irá creciendo conmigo.</li><li>Un sitio con aplicaciones, terminal, Arcade, easter eggs y acertijos.</li></ul>
     <h2>Cómo explorar</h2>
     <p>Doble clic abre aplicaciones. Las ventanas se pueden mover, minimizar, maximizar y redimensionar. El clic derecho abre acciones rápidas. En la terminal, <code>ayuda</code> es un buen comienzo.</p>
     <h2>Easter eggs</h2>
     <p>Hay secretos escondidos por el sistema. No voy a poner aquí las soluciones. Si encuentras algo raro, puede que no sea un bug.</p>
     <div class="md-sign">JOSEMI-OS // build, learn, repeat.</div>
   </article>`},

 contact:{title:'Contacto',icon:'📬',render:()=>`
   <div class="contact contact--modern">
     <span class="card-kicker">CONTACTO / NETWORK</span><h2>¿Construimos algo?</h2>
     <p>Estoy aprendiendo y buscando oportunidades para seguir creando proyectos y mejorar como desarrollador.</p>
     <div class="links">
       <a class="clink" href="https://github.com/josemidev1-code" target="_blank" rel="noopener"><span class="g">GH</span><span><b>GitHub</b><small>@josemidev1-code</small></span><i>↗</i></a>
       <a class="clink" href="https://www.linkedin.com/search/results/people/?keywords=Jose%20Miguel%20Miralles%20Gandia" target="_blank" rel="noopener"><span class="g">IN</span><span><b>LinkedIn</b><small>José Miguel Miralles Gandia</small></span><i>↗</i></a>
       <a class="clink" href="mailto:josemidev1@gmail.com"><span class="g">@</span><span><b>Email</b><small>josemidev1@gmail.com</small></span><i>↗</i></a>
     </div>
     <button class="btn btn--accent" id="copy-email">COPIAR EMAIL</button>
   </div>`,
   bind(b){$('#copy-email',b).addEventListener('click',async()=>{try{await navigator.clipboard.writeText('josemidev1@gmail.com');toast('Email copiado al portapapeles.');}catch{toast('No se ha podido acceder al portapapeles.');}});}},

 trash:{title:'Papelera',icon:'🗑',render:()=>`
   <div class="app-title">/home/josemi/.papelera</div>
   <div class="file-row" data-file="motivation.exe"><span class="g">⚙️</span> motivacion.exe</div>
   <div class="file-row" data-file="x"><span class="g">📄</span> matrix-design.old</div>
   <div class="file-row" data-file="x"><span class="g">🗜️</span> proyecto-fallido.zip</div>
   <div class="file-row" data-file="x"><span class="g">📄</span> todo-final-final-ahora-si.java</div>`,
   bind(b){b.querySelectorAll('.file-row').forEach(r=>r.addEventListener('dblclick',()=>{
     if(r.dataset.file==='motivation.exe')openWindow('motivation');else toast('Archivo corrupto. Es broma 🙂');}));}},

 settings:{title:'Configuración',icon:'⚙️',render:()=>`
   <div class="app-title">CONFIGURACIÓN</div>
   <div class="setting"><div>Reducir animaciones<small>Desactiva transiciones y efectos</small></div><button class="switch ${state.motion?'on':''}" id="sw-motion"></button></div>
   <div class="setting"><div>Sonidos<small>Beeps al abrir y cerrar</small></div><button class="switch ${state.sound?'on':''}" id="sw-sound"></button></div>
   <div class="setting"><div>Color de acento<small>Afecta a distintos elementos del sistema</small></div><div class="swatches" id="sw-accent">
     <span class="swatch ${state.accent==='#6dff9b'?'on':''}" data-c="#6dff9b" style="background:#6dff9b"></span>
     <span class="swatch ${state.accent==='#5de4ff'?'on':''}" data-c="#5de4ff" style="background:#5de4ff"></span>
     <span class="swatch ${state.accent==='#b08cff'?'on':''}" data-c="#b08cff" style="background:#b08cff"></span>
     <span class="swatch ${state.accent==='#ffd166'?'on':''}" data-c="#ffd166" style="background:#ffd166"></span></div></div>
   <div class="setting"><div>Oscuridad<small>Nivel del fondo</small></div><select id="sel-dark">
     <option value="#050505" ${state.bg==='#050505'?'selected':''}>Oscuro</option>
     <option value="#030303" ${state.bg==='#030303'?'selected':''}>Más oscuro</option>
     <option value="#000000" ${state.bg==='#000000'?'selected':''}>Negro total</option></select></div>
   <div class="setting"><div>Fondo de pantalla<small>Cambia el escritorio</small></div><div class="wp-row" id="sw-wp">
     ${WALLS.map((w,i)=>w==='matrix'
       ?`<span class="wp wp--matrix ${i===state.wp?'on':''}" data-w="${i}">M</span>`
       :`<span class="wp ${i===state.wp?'on':''}" data-w="${i}" style="background:${w}"></span>`).join('')}</div></div>`,
   bind(b){
     $('#sw-motion',b).onclick=e=>{state.motion=!state.motion;e.target.classList.toggle('on');applyTheme();save();};
     $('#sw-sound',b).onclick=e=>{state.sound=!state.sound;e.target.classList.toggle('on');save();if(state.sound)beep();};
     $$('#sw-accent .swatch',b).forEach(s=>s.onclick=()=>{state.accent=s.dataset.c;$$('#sw-accent .swatch',b).forEach(x=>x.classList.remove('on'));s.classList.add('on');applyTheme();save();});
     $('#sel-dark',b).onchange=e=>{state.bg=e.target.value;applyTheme();save();};
     $$('#sw-wp .wp',b).forEach(w=>w.onclick=()=>{state.wp=+w.dataset.w;$$('#sw-wp .wp',b).forEach(x=>x.classList.remove('on'));w.classList.add('on');applyTheme();save();});}},

 system:{title:'Monitor del sistema',icon:'🖥️',render:()=>`
   <div class="app-title">JOSEMI-OS · ESTADO: <span style="color:var(--accent)">EN LÍNEA</span></div>
   <div class="sys-grid">
     <div class="sys-card"><b id="sys-uptime">0s</b><span>Tiempo de sesión</span></div>
     <div class="sys-card"><b id="sys-time">--:--</b><span>Hora actual</span></div>
     <div class="sys-card"><b id="sys-res">—</b><span>Resolución</span></div>
     <div class="sys-card"><b id="sys-lang">—</b><span>Idioma del navegador</span></div>
     <div class="sys-card"><b id="sys-browser">—</b><span>Navegador</span></div></div>`,
   bind(b){$('#sys-res',b).textContent=`${screen.width}×${screen.height}`;$('#sys-lang',b).textContent=navigator.language;
     const ua=navigator.userAgent;$('#sys-browser',b).textContent=/Firefox/.test(ua)?'Firefox':/Edg/.test(ua)?'Edge':/Chrome/.test(ua)?'Chrome':/Safari/.test(ua)?'Safari':'Desconocido';}},

 motivation:{title:'motivacion.exe',icon:'💡',render:()=>`<div style="text-align:center;padding:2rem 1rem"><div style="font-size:2.5rem">💡</div><p style="font-family:var(--font-mono);margin-top:1rem;line-height:1.8">Sigue construyendo.<br>Cada proyecto te acerca a lo que quieres ser.</p></div>`},

 arcade:{title:'Arcade',icon:'🕹️',render:()=>`
   <div class="app-title">C:\\JOSEMI_OS\\JUEGOS</div>
   <p class="bio">Una pequeña carpeta de juegos retro. Abre uno y usa el teclado.</p>
   <div class="arcade-grid">
     <button class="game-shortcut" data-game="tetris">${pixelIcon('tetris')}<strong>Tetris</strong><small>Bloques · 10×20</small></button>
     <button class="game-shortcut" data-game="pacman">${pixelIcon('pacman')}<strong>Pac-Man</strong><small>Laberinto · fantasmas</small></button>
   </div>`,
   bind(b){b.querySelectorAll('[data-game]').forEach(x=>x.addEventListener('click',()=>openWindow(x.dataset.game)));}},

 tetris:{title:'Tetris',icon:pixelIcon('tetris'),render:()=>`
   <div class="game game--tetris">
     <div class="tetris-layout">
       <canvas class="tetris-canvas" width="200" height="400" aria-label="Tablero de Tetris"></canvas>
       <div class="game-side">
         <div class="game-panel"><span>SIGUIENTE</span><canvas class="tetris-next" width="96" height="96"></canvas></div>
         <div class="game-panel"><span>PUNTOS</span><b class="tetris-score">0</b></div>
         <div class="game-panel"><span>LÍNEAS</span><b class="tetris-lines">0</b></div>
         <div class="game-panel"><span>NIVEL</span><b class="tetris-level">1</b></div>
         <button class="btn tetris-start">NUEVA PARTIDA</button>
         <button class="btn tetris-pause" disabled>PAUSA</button>
       </div>
     </div>
     <div class="game-help">← → mover · ↓ bajar · ↑/X girar · Z giro inverso · ESPACIO caída · P pausa</div>
   </div>`,
   bind(b,win){
     win=win||b.closest('.window');
     const cv=$('.tetris-canvas',b),ctx=cv.getContext('2d'),nextCv=$('.tetris-next',b),nextCtx=nextCv.getContext('2d');
     const scoreEl=$('.tetris-score',b),linesEl=$('.tetris-lines',b),levelEl=$('.tetris-level',b);
     const startBtn=$('.tetris-start',b),pauseBtn=$('.tetris-pause',b);
     const COLS=10,ROWS=20,S=20;
     const PIECES={
       I:{c:'#00d7ff',s:[[1,1,1,1]]},O:{c:'#ffd21f',s:[[1,1],[1,1]]},T:{c:'#b84cff',s:[[0,1,0],[1,1,1]]},
       J:{c:'#3155ff',s:[[1,0,0],[1,1,1]]},L:{c:'#ff8a1f',s:[[0,0,1],[1,1,1]]},
       S:{c:'#41d85a',s:[[0,1,1],[1,1,0]]},Z:{c:'#ff4141',s:[[1,1,0],[0,1,1]]}
     };
     let board=[],piece=null,next=null,bag=[],score=0,lines=0,level=1,timer=null,running=false,paused=false;

     const cloneShape=s=>s.map(r=>r.slice());
     function refillBag(){bag=['I','O','T','J','L','S','Z'];for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}}
     function take(){if(!bag.length)refillBag();const id=bag.pop();return{id,x:3,y:0,shape:cloneShape(PIECES[id].s),color:PIECES[id].c};}
     function reset(){board=Array.from({length:ROWS},()=>Array(COLS).fill(null));bag=[];score=0;lines=0;level=1;next=take();piece=null;scoreEl.textContent=0;linesEl.textContent=0;levelEl.textContent=1;paused=false;pauseBtn.textContent='PAUSA';}
     function spawn(){piece=next;piece.x=Math.floor((COLS-piece.shape[0].length)/2);piece.y=0;next=take();drawNext();if(collide(piece)){gameOver();}}
     function collide(p,dx=0,dy=0,shape=p.shape){for(let y=0;y<shape.length;y++)for(let x=0;x<shape[y].length;x++){if(!shape[y][x])continue;const nx=p.x+x+dx,ny=p.y+y+dy;if(nx<0||nx>=COLS||ny>=ROWS)return true;if(ny>=0&&board[ny][nx])return true;}return false;}
     function rotateShape(shape,dir=1){return dir>0?shape[0].map((_,i)=>shape.map(r=>r[i]).reverse()):shape[0].map((_,i)=>shape.map(r=>r[shape[0].length-1-i]));}
     function rotate(dir=1){const r=rotateShape(piece.shape,dir);for(const kick of [0,-1,1,-2,2]){if(!collide(piece,kick,0,r)){piece.x+=kick;piece.shape=r;return;}}}
     function drawBlock(g,x,y,c,alpha=1,size=S){g.globalAlpha=alpha;g.fillStyle=c;g.fillRect(x*size+1,y*size+1,size-2,size-2);g.fillStyle='rgba(255,255,255,.28)';g.fillRect(x*size+2,y*size+2,size-4,3);g.fillStyle='rgba(0,0,0,.28)';g.fillRect(x*size+2,y*size+size-5,size-4,3);g.globalAlpha=1;}
     function ghostY(){let dy=0;while(!collide(piece,0,dy+1))dy++;return piece.y+dy;}
     function draw(){
       ctx.fillStyle='#050505';ctx.fillRect(0,0,cv.width,cv.height);
       ctx.strokeStyle='rgba(255,255,255,.045)';for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x*S,0);ctx.lineTo(x*S,cv.height);ctx.stroke();}for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*S);ctx.lineTo(cv.width,y*S);ctx.stroke();}
       board.forEach((r,y)=>r.forEach((c,x)=>{if(c)drawBlock(ctx,x,y,c);}));
       if(piece){
         const gy=ghostY();piece.shape.forEach((r,y)=>r.forEach((v,x)=>{if(v)drawBlock(ctx,piece.x+x,gy+y,piece.color,.2);}));
         piece.shape.forEach((r,y)=>r.forEach((v,x)=>{if(v)drawBlock(ctx,piece.x+x,piece.y+y,piece.color);}));
       }
       if(paused){ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(0,0,cv.width,cv.height);ctx.fillStyle='#fff';ctx.font='bold 20px monospace';ctx.textAlign='center';ctx.fillText('PAUSA',cv.width/2,cv.height/2);}
     }
     function drawNext(){nextCtx.fillStyle='#050505';nextCtx.fillRect(0,0,nextCv.width,nextCv.height);if(!next)return;const size=18,w=next.shape[0].length*size,h=next.shape.length*size,ox=(nextCv.width-w)/2/size,oy=(nextCv.height-h)/2/size;next.shape.forEach((r,y)=>r.forEach((v,x)=>{if(v)drawBlock(nextCtx,ox+x,oy+y,next.color,1,size);}));}
     function lock(){piece.shape.forEach((r,y)=>r.forEach((v,x)=>{if(v&&piece.y+y>=0)board[piece.y+y][piece.x+x]=piece.color;}));let cleared=0;
       for(let y=ROWS-1;y>=0;y--){if(board[y].every(Boolean)){board.splice(y,1);board.unshift(Array(COLS).fill(null));cleared++;y++;}}
       if(cleared){lines+=cleared;score+=[0,100,300,500,800][cleared]*level;level=Math.floor(lines/10)+1;scoreEl.textContent=score;linesEl.textContent=lines;levelEl.textContent=level;restartTimer();}
       spawn();
     }
     function restartTimer(){if(timer)clearInterval(timer);if(running&&!paused)timer=setInterval(tick,Math.max(80,700-(level-1)*55));}
     function tick(){if(!running||paused||!piece)return;if(!collide(piece,0,1))piece.y++;else lock();draw();}
     function hardDrop(){let n=0;while(!collide(piece,0,1)){piece.y++;n++;}score+=n*2;scoreEl.textContent=score;lock();}
     function gameOver(){running=false;if(timer)clearInterval(timer);timer=null;pauseBtn.disabled=true;toast('Tetris: fin de la partida.');draw();}
     function start(){if(timer)clearInterval(timer);reset();running=true;pauseBtn.disabled=false;spawn();restartTimer();draw();win.focus();}
     function togglePause(){if(!running)return;paused=!paused;pauseBtn.textContent=paused?'CONTINUAR':'PAUSA';restartTimer();draw();}
     function key(e){if(!running)return;const k=e.key.toLowerCase();if(['arrowleft','arrowright','arrowdown','arrowup',' ','x','z','p'].includes(k))e.preventDefault();if(k==='p'){togglePause();return;}if(paused)return;
       if(k==='arrowleft'&&!collide(piece,-1,0))piece.x--;if(k==='arrowright'&&!collide(piece,1,0))piece.x++;if(k==='arrowdown'&&!collide(piece,0,1)){piece.y++;score++;scoreEl.textContent=score;}if(k==='arrowup'||k==='x')rotate(1);if(k==='z')rotate(-1);if(k===' ')hardDrop();draw();}
     win.tabIndex=0;win.addEventListener('keydown',key);cv.addEventListener('click',()=>win.focus());
     startBtn.addEventListener('click',start);pauseBtn.addEventListener('click',togglePause);
     win.__cleanup=()=>{if(timer)clearInterval(timer);win.removeEventListener('keydown',key);};
     reset();draw();drawNext();
   }},

 pacman:{title:'Pac-Man',icon:pixelIcon('pacman'),render:()=>`
   <div class="game game--pacman">
     <div class="pac-hud">
       <span>PUNTOS <b class="pac-score">0</b></span>
       <span>VIDAS <b class="pac-lives">3</b></span>
       <span>NIVEL <b class="pac-level">1</b></span>
       <button class="btn pac-start">NUEVA PARTIDA</button>
       <button class="btn pac-pause" disabled>PAUSA</button>
     </div>
     <canvas class="pac-canvas" width="380" height="340" aria-label="Laberinto de Pac-Man"></canvas>
     <div class="game-help">Flechas para moverte · come los puntos · las bolas grandes vuelven vulnerables a los fantasmas · P pausa</div>
   </div>`,
   bind(b,win){
     win=win||b.closest('.window');
     const cv=$('.pac-canvas',b),ctx=cv.getContext('2d'),scoreEl=$('.pac-score',b),livesEl=$('.pac-lives',b),levelEl=$('.pac-level',b),startBtn=$('.pac-start',b),pauseBtn=$('.pac-pause',b);
     const CELL=20;
     const template=[
       '###################',
       '#o.......#.......o#',
       '#.###.##.#.##.###.#',
       '#.................#',
       '#.###.#.#####.#.###',
       '#.....#...#...#...#',
       '#####.###.#.###.###',
       '.....#.......#.....',
       '#####.#.###.#.#####',
       '#........P........#',
       '#.###.##.#.##.###.#',
       '#o..#....#....#..o#',
       '###.#.#######.#.###',
       '#.................#',
       '#.#####.###.#####.#',
       '#.................#',
       '###################'
     ];
     const ROWS=template.length,COLS=template[0].length;
     let map=[],dots=new Set(),powers=new Set(),player,ghosts=[],score=0,lives=3,level=1,timer=null,running=false,paused=false,queued={x:0,y:0},tickNo=0,frightenedUntil=0,mouth=0;

     const key=(x,y)=>`${x},${y}`;
     function walkable(x,y){if(y<0||y>=ROWS)return false;if(x<0||x>=COLS)return y===7;return map[y][x]!=='#';}
     function wrapX(x){if(x<0)return COLS-1;if(x>=COLS)return 0;return x;}
     function buildLevel(){
       map=template.map(r=>r.split(''));dots.clear();powers.clear();
       let px=9,py=9;
       for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const c=map[y][x];if(c==='P'){px=x;py=y;map[y][x]=' ';}if(c==='.')dots.add(key(x,y));if(c==='o')powers.add(key(x,y));}
       player={x:px,y:py,dir:{x:0,y:0}};
       const spawn=[[9,7,'#ff3b3b'],[8,7,'#ff8de1'],[10,7,'#39d9ff']];
       ghosts=spawn.map(([x,y,color],i)=>({x,y,sx:x,sy:y,color,dir:{x:i===1?-1:1,y:0}}));
       queued={x:0,y:0};frightenedUntil=0;tickNo=0;
     }
     function resetPositions(){player.x=9;player.y=9;player.dir={x:0,y:0};queued={x:0,y:0};ghosts.forEach(g=>{g.x=g.sx;g.y=g.sy;g.dir={x:1,y:0};});}
     function drawWall(x,y){ctx.fillStyle='#0d2cff';ctx.fillRect(x*CELL,y*CELL,CELL,CELL);ctx.fillStyle='#02040c';ctx.fillRect(x*CELL+4,y*CELL+4,CELL-8,CELL-8);}
     function drawPac(){const cx=player.x*CELL+10,cy=player.y*CELL+10;mouth=(mouth+.18)%(Math.PI/2);const open=.18+Math.abs(Math.sin(mouth))*.36;let ang=0;if(player.dir.x<0)ang=Math.PI;if(player.dir.y<0)ang=-Math.PI/2;if(player.dir.y>0)ang=Math.PI/2;ctx.fillStyle='#ffd51f';ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,8,ang+open,ang+Math.PI*2-open);ctx.closePath();ctx.fill();}
     function drawGhost(g,fright){const x=g.x*CELL+10,y=g.y*CELL+10;ctx.fillStyle=fright?'#194cff':g.color;ctx.beginPath();ctx.arc(x,y-1,8,Math.PI,0);ctx.lineTo(x+8,y+7);ctx.lineTo(x+4,y+4);ctx.lineTo(x,y+7);ctx.lineTo(x-4,y+4);ctx.lineTo(x-8,y+7);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(x-5,y-2,4,5);ctx.fillRect(x+2,y-2,4,5);ctx.fillStyle=fright?'#fff':'#182050';ctx.fillRect(x-4,y,2,3);ctx.fillRect(x+3,y,2,3);}
     function draw(){ctx.fillStyle='#000';ctx.fillRect(0,0,cv.width,cv.height);for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(map[y][x]==='#')drawWall(x,y);
       ctx.fillStyle='#f6d7a7';dots.forEach(k=>{const [x,y]=k.split(',').map(Number);ctx.beginPath();ctx.arc(x*CELL+10,y*CELL+10,2,0,Math.PI*2);ctx.fill();});
       powers.forEach(k=>{const [x,y]=k.split(',').map(Number);ctx.beginPath();ctx.arc(x*CELL+10,y*CELL+10,5,0,Math.PI*2);ctx.fill();});
       drawPac();const fright=performance.now()<frightenedUntil;ghosts.forEach(g=>drawGhost(g,fright));
       if(paused){ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(0,0,cv.width,cv.height);ctx.fillStyle='#fff';ctx.font='bold 20px monospace';ctx.textAlign='center';ctx.fillText('PAUSA',cv.width/2,cv.height/2);}
     }
     function eat(){const k=key(player.x,player.y);if(dots.delete(k)){score+=10;scoreEl.textContent=score;}if(powers.delete(k)){score+=50;scoreEl.textContent=score;frightenedUntil=performance.now()+6500;beep();}if(!dots.size&&!powers.size){level++;levelEl.textContent=level;toast('Pac-Man: nivel completado.');buildLevel();restartTimer();}}
     function canDir(pos,dir){let nx=pos.x+dir.x,ny=pos.y+dir.y;if(ny===7)nx=wrapX(nx);return walkable(nx,ny);}
     function moveEntity(ent,dir){let nx=ent.x+dir.x,ny=ent.y+dir.y;if(ny===7)nx=wrapX(nx);if(walkable(nx,ny)){ent.x=nx;ent.y=ny;ent.dir={...dir};return true;}return false;}
     function chooseGhost(g){
       const dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}].filter(d=>canDir(g,d));
       const noBack=dirs.filter(d=>!(d.x===-g.dir.x&&d.y===-g.dir.y));const pool=noBack.length?noBack:dirs;if(!pool.length)return g.dir;
       const fright=performance.now()<frightenedUntil;if(fright||Math.random()<.15)return pool[Math.floor(Math.random()*pool.length)];
       return pool.reduce((best,d)=>{const nx=wrapX(g.x+d.x),ny=g.y+d.y,dist=Math.abs(nx-player.x)+Math.abs(ny-player.y);return dist<best.dist?{d,dist}:best;},{d:pool[0],dist:Infinity}).d;
     }
     function collision(){for(const g of ghosts){if(g.x===player.x&&g.y===player.y){if(performance.now()<frightenedUntil){score+=200;scoreEl.textContent=score;g.x=g.sx;g.y=g.sy;toast('+200 · fantasma capturado');}else{lives--;livesEl.textContent=lives;if(lives<=0){gameOver();}else{toast(`Te quedan ${lives} vidas.`);resetPositions();}return;}}}}
     function step(){if(!running||paused)return;if(canDir(player,queued))player.dir={...queued};if(player.dir.x||player.dir.y)moveEntity(player,player.dir);eat();collision();tickNo++;if(tickNo%2===0){ghosts.forEach(g=>moveEntity(g,chooseGhost(g)));collision();}draw();}
     function restartTimer(){if(timer)clearInterval(timer);if(running&&!paused)timer=setInterval(step,Math.max(80,125-(level-1)*5));}
     function start(){if(timer)clearInterval(timer);score=0;lives=3;level=1;scoreEl.textContent=0;livesEl.textContent=3;levelEl.textContent=1;running=true;paused=false;pauseBtn.disabled=false;pauseBtn.textContent='PAUSA';buildLevel();restartTimer();draw();win.focus();}
     function gameOver(){running=false;if(timer)clearInterval(timer);timer=null;pauseBtn.disabled=true;toast('Pac-Man: fin de la partida.');draw();}
     function togglePause(){if(!running)return;paused=!paused;pauseBtn.textContent=paused?'CONTINUAR':'PAUSA';restartTimer();draw();}
     function keydown(e){const k=e.key.toLowerCase();const dirs={arrowleft:{x:-1,y:0},arrowright:{x:1,y:0},arrowup:{x:0,y:-1},arrowdown:{x:0,y:1}};if(dirs[k]){e.preventDefault();queued=dirs[k];}else if(k==='p'){e.preventDefault();togglePause();}}
     win.tabIndex=0;win.addEventListener('keydown',keydown);cv.addEventListener('click',()=>win.focus());startBtn.addEventListener('click',start);pauseBtn.addEventListener('click',togglePause);
     win.__cleanup=()=>{if(timer)clearInterval(timer);win.removeEventListener('keydown',keydown);};
     buildLevel();draw();
   }},

 easter:{title:'SECRETO.sys',icon:'🥚',render:()=>`
   <div class="secret-screen">
     <div class="secret-skull">☠</div>
     <h2>HAS ENCONTRADO UNA PARTE OCULTA DE JOSEMI_OS</h2>
     <p>Un portfolio cuenta lo que ya sabes hacer. Este sistema también quiere contar lo que todavía estás intentando conseguir.</p>
     <p class="secret-code">PISTA: prueba <b>matrix</b>, <b>cafe</b>, <b>42</b> y el código Konami en la terminal o con el teclado.</p>
   </div>`}
};
// Genera el HTML repetido de una barra de habilidad; data-w guarda el porcentaje.
function bar(n,v){return `<div class="res"><div class="res__top"><span>${n}</span><span>${v}%</span></div><div class="bar"><i data-w="${v}"></i></div></div>`;}

/* ========================================================= WINDOW MANAGER
   Es una IIFE: la función se ejecuta inmediatamente y solo expone openWindow y
   closeWindow. Así, variables internas como z y open no contaminan el ámbito global.
   ========================================================= */
const WM=(()=>{let z=10,open=new Map(),x=40,y=30;
  // Desplaza cada ventana nueva para que no aparezcan todas exactamente superpuestas.
  const nextPos=()=>{x+=28;y+=28;if(x>200)x=40;if(y>160)y=30;return{x,y};};
  // Un z-index mayor coloca la ventana enfocada delante de las demás.
  function focus(win){win.style.zIndex=++z;$$('.tb-app').forEach(t=>t.classList.remove('active'));
    const c=$(`.tb-app[data-id="${win.dataset.id}"]`);if(c){c.classList.add('active');c.classList.remove('dim');}}
  function openWindow(id){const app=Apps[id];if(!app)return;
    // Map permite saber si la app ya está abierta y evita crear duplicados.
    if(open.has(id)){const o=open.get(id);if(o.minimized){o.el.classList.remove('minimized');o.minimized=false;}focus(o.el);beep();return o.el;}
    const p=nextPos(),win=document.createElement('section');win.className='window';win.dataset.id=id;
    win.style.left=p.x+'px';win.style.top=p.y+'px';win.style.zIndex=++z;
    win.innerHTML=`<div class="win__bar"><div class="win__title"><span class="t-ico">${app.icon}</span> ${app.title}</div>
      <div class="win__btns"><button class="win-btn min"></button><button class="win-btn max"></button><button class="win-btn close"></button></div></div>
      <div class="win__body"></div><div class="win__resize"></div>`;
    // Primero insertamos el HTML; después bind() puede buscar sus elementos y añadir eventos.
    $('#desktop').appendChild(win);$('.win__body',win).innerHTML=app.render();if(app.bind)app.bind($('.win__body',win),win);
    requestAnimationFrame(()=>win.classList.add('open'));
    $('.close',win).onclick=()=>closeWindow(id);
    $('.min',win).onclick=()=>{win.classList.add('minimized');open.get(id).minimized=true;const c=$(`.tb-app[data-id="${id}"]`);if(c)c.classList.add('dim');beep();};
    $('.max',win).onclick=()=>win.classList.toggle('maximized');
    win.addEventListener('pointerdown',()=>focus(win));
    drag(win,$('.win__bar',win));resize(win,$('.win__resize',win));addChip(id,app);
    open.set(id,{el:win,minimized:false});beep();return win;}
  // [FIX] closeWindow ara crida win.__cleanup() perquè els jocs no deixen intervals corrent.
  function closeWindow(id){const o=open.get(id);if(!o)return;if(o.el.__cleanup)o.el.__cleanup();o.el.classList.remove('open');setTimeout(()=>o.el.remove(),220);open.delete(id);
    const c=$(`.tb-app[data-id="${id}"]`);if(c)c.remove();beep();}
  function addChip(id,app){const b=document.createElement('button');b.className='tb-app active';b.dataset.id=id;
    b.innerHTML=`<span>${app.icon}</span> <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${app.title}</span>`;
    b.onclick=()=>{const o=open.get(id);if(!o)return;if(o.minimized){o.el.classList.remove('minimized');o.minimized=false;focus(o.el);}
      else if(o.el.style.zIndex==z){o.el.classList.add('minimized');o.minimized=true;b.classList.add('dim');}else focus(o.el);};
    $('#taskbar__apps').appendChild(b);}
  // pointerdown guarda la posición inicial; pointermove calcula el desplazamiento del ratón.
  function drag(win,h){h.addEventListener('pointerdown',e=>{if(e.target.closest('.win-btn'))return;if(win.classList.contains('maximized'))return;
    focus(win);const sx=e.clientX,sy=e.clientY,ox=win.offsetLeft,oy=win.offsetTop;
    const mv=ev=>{let nx=Math.max(0,Math.min(ox+ev.clientX-sx,innerWidth-120)),ny=Math.max(0,Math.min(oy+ev.clientY-sy,innerHeight-120));win.style.left=nx+'px';win.style.top=ny+'px';};
    const up=()=>{document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);};
    document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);});}
  // El tirador inferior derecho modifica ancho y alto respetando tamaños mínimos.
  function resize(win,h){h.addEventListener('pointerdown',e=>{if(win.classList.contains('maximized'))return;e.stopPropagation();focus(win);
    const sx=e.clientX,sy=e.clientY,ow=win.offsetWidth,oh=win.offsetHeight;
    const mv=ev=>{win.style.width=Math.max(280,Math.min(ow+ev.clientX-sx,innerWidth-win.offsetLeft-10))+'px';
      win.style.height=Math.max(180,Math.min(oh+ev.clientY-sy,innerHeight-win.offsetTop-46))+'px';};
    const up=()=>{document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);};
    document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);});}
  return{openWindow,closeWindow};})();
const openWindow=WM.openWindow;

/* ========================================================= TERMINAL */
function runCommand(raw,print,openWin){
  const p=raw.trim().split(/\s+/),c=(p[0]||'').toLowerCase(),a=p.slice(1).join(' ');
  switch(c){
    case'':break;
    case'help':case'ayuda':
      print('Comandos: <span class="ok">ayuda readme quien-soy sobre-mi proyectos habilidades contacto limpiar fecha eco ls cat sudo secreto matrix fondo tetris pacman arcade cafe hola 42</span>');break;
    case'whoami':case'quien-soy':print('José Miguel Miralles Gandia<br>Estudiante de DAM en SSIMARRO<br>Desarrollador de software en proceso.');break;
    case'readme':print('Abriendo README.md...');openWin('readme');break;
    case'about':case'sobre-mi':print('Abriendo Sobre mí...');openWin('about');break;
    case'projects':case'proyectos':print('Abriendo Proyectos...');openWin('projects');break;
    case'skills':case'habilidades':print('Abriendo Habilidades...');openWin('skills');break;
    case'contact':case'contacto':print('Abriendo Contacto...');openWin('contact');break;
    case'clear':case'limpiar':$('#term-out').innerHTML='';break;
    case'date':case'fecha':print(new Date().toLocaleString('es-ES'));break;
    case'echo':case'eco':print(a||'');break;
    case'ls':print('README.md  sobre-mi.txt  suenos.txt  proyectos/  habilidades.json  contacto.txt  juegos/  secreto/');break;
    case'cat':
      if(a.toLowerCase()==='readme.md')print('JOSEMI-OS: mi primer proyecto personal como desarrollador. Portfolio interactivo con aplicaciones, terminal, Arcade, easter eggs y acertijos.');
      else if(a==='sobre-mi.txt'||a==='about.txt')print('José Miguel Miralles Gandia · estudiante de DAM en SSIMARRO · desarrollador de software en proceso.');
      else if(a==='sueños.txt'||a==='suenos.txt')print('Crear automatizaciones y aplicaciones para grandes empresas combinando IA, programación y creatividad.');
      else print(`cat: ${a||'(sin archivo)'}: no existe`);break;
    case'sudo':
      if(a.startsWith('rm -rf')){print('<span class="err">Buen intento. JOSEMI_OS se niega a autodestruirse.</span>');break;}
      print('Permiso concedido.\nLanzando protocolo de contacto...');openWin('contact');break;
    case'secret':case'secreto':print('<span class="ok">🔓 Easter egg desbloqueado.</span>');openWin('easter');toast('Has encontrado SECRETO.sys');break;
    case'matrix':state.wp=4;applyTheme();save();print('<span class="ok">Fondo Matrix activado.</span> Usa "fondo 0" para salir.');break;
    case'wallpaper':case'fondo':
      if(a==='matrix'){state.wp=4;applyTheme();save();print('Matrix activado.');}
      else if(['0','1','2','3'].includes(a)){state.wp=+a;applyTheme();save();print('Fondo cambiado.');}
      else print('Uso: fondo matrix|0|1|2|3');break;
    case'tetris':print('Abriendo Tetris...');openWin('tetris');break;
    case'pacman':print('Abriendo Pac-Man...');openWin('pacman');break;
    case'arcade':print('Abriendo Arcade...');openWin('arcade');break;
    case'coffee':case'cafe':print('Compilando...\n☕ Café cargado correctamente. Productividad +10.');toast('Café virtual servido ☕');break;
    case'hello':case'hola':print('Hola, humano. JOSEMI_OS te está observando 👀');break;
    case'42':print('<span class="ok">42.</span> La respuesta estaba aquí. La pregunta sigue pendiente.');openWin('easter');break;
    default:print(`<span class="err">comando no encontrado: ${c}</span>`);
  }
}
// (Opcional) Efecte temporal de Matrix 5s, usat pel mode "matrix" del boot.
function matrixMode(){const c=document.createElement('canvas');Object.assign(c.style,{position:'fixed',inset:'0',zIndex:'9998',background:'#000',opacity:'.9'});
  document.body.appendChild(c);const x=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;
  const cols=Math.floor(c.width/16),drops=Array(cols).fill(0),ch='アイウエオ01JOSEMI<>/*';
  const iv=setInterval(()=>{x.fillStyle='rgba(0,0,0,.14)';x.fillRect(0,0,c.width,c.height);x.fillStyle='#4ade80';x.font='16px monospace';
    drops.forEach((y,i)=>{x.fillText(ch[Math.floor(Math.random()*ch.length)],i*16,y*16);if(y*16>c.height&&Math.random()>.975)drops[i]=0;drops[i]+=2;});},45);
  setTimeout(()=>{clearInterval(iv);c.remove();},5000);}

/* ========================================================= PROYECTOS */
const PROJECTS={
 web:{name:'JOSEMI-OS',desc:'Mi primer proyecto personal como desarrollador: un portfolio interactivo con estética de sistema operativo, aplicaciones, terminal, juegos y easter eggs.',lang:'HTML / CSS / JavaScript',db:'—',fw:'Vanilla',date:'2026',status:'dev',tags:['Portfolio','Frontend','JavaScript'],github:'https://github.com/josemidev1-code'},
 school:{name:'Formación DAM',desc:'Espacio para reunir proyectos y prácticas reales de Desarrollo de Aplicaciones Multiplataforma. No añado detalles concretos hasta tener cada proyecto listo para enseñar.',lang:'En formación',db:'En formación',fw:'—',date:'Actual',status:'dev',tags:['DAM','Aprendizaje']},
 auto:{name:'Automatización',desc:'Área de roadmap: quiero aprender a crear automatizaciones útiles y convertir procesos repetitivos en software.',lang:'Por definir',db:'—',fw:'—',date:'Roadmap',status:'exp',tags:['Automatización','Roadmap']},
 ai:{name:'IA + software',desc:'Área de roadmap: explorar cómo integrar inteligencia artificial en aplicaciones y flujos de trabajo de forma creativa.',lang:'Por definir',db:'—',fw:'—',date:'Roadmap',status:'exp',tags:['IA','Creatividad','Roadmap']}
};
function openProject(k){const p=PROJECTS[k];if(!p)return;const id='proj-'+k;
  Apps[id]={title:p.name,icon:'📂',render:()=>`<div class="app-title">${p.name.toUpperCase()}</div><p class="bio">${p.desc}</p>
    <div class="proj">${p.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
    <dl class="kv"><dt>Lenguaje</dt><dd>${p.lang}</dd><dt>Base de datos</dt><dd>${p.db}</dd><dt>Framework</dt><dd>${p.fw}</dd><dt>Fecha</dt><dd>${p.date}</dd></dl>
    <span class="status ${p.status}">${p.status==='done'?'COMPLETADO':p.status==='dev'?'EN DESARROLLO':'EXPERIMENTAL'}</span>
    <div class="btn-row">${p.github?`<a class="btn btn--accent" href="${p.github}" target="_blank" rel="noopener">ABRIR GITHUB ↗</a>`:'<span class="roadmap-badge">SIN ENLACE · ROADMAP / FORMACIÓN</span>'}</div>`};
  openWindow(id);
}

/* ========================================================= REINICIO */
function boot(){location.reload();}

/* ========================================================= ESCRITORIO */
// [FIX] Añadidos 'tetris' y 'pacman' perquè tinguen acces directe.
const ICONS=['readme','about','projects','skills','terminal','contact','arcade','settings','system','trash'];
let startTime=Date.now();
function buildIcons(){const c=$('#icons');c.innerHTML='';
  const llista=(currentUser&&currentUser.apps)?currentUser.apps:ICONS;
  llista.forEach(id=>{const a=Apps[id];if(!a)return;
    const el=document.createElement('div');el.className='icon';el.dataset.id=id;el.tabIndex=0;
    el.innerHTML=`<span class="glyph">${a.icon}</span><span class="lbl">${a.title}</span>`;
    el.addEventListener('click',()=>{$$('.icon').forEach(i=>i.classList.remove('sel'));el.classList.add('sel');});
    el.addEventListener('dblclick',()=>openWindow(id));
    el.addEventListener('keydown',e=>{if(e.key==='Enter')openWindow(id);});
    c.appendChild(el);});}
function buildMenu(){const m=$('#menu__apps');m.innerHTML='';
  const llista=(currentUser&&currentUser.apps)?currentUser.apps:ICONS;
  llista.forEach(id=>{const a=Apps[id];if(!a)return;
    const b=document.createElement('button');b.innerHTML=`<span>${a.icon}</span> ${a.title}`;
    b.onclick=()=>{openWindow(id);$('#menu').classList.add('hidden');};m.appendChild(b);});}
function buildClock(){const t=$('#clock__time'),d=$('#clock__date');const tick=()=>{const n=new Date();
  t.textContent=`${pad(n.getHours())}:${pad(n.getMinutes())}`;d.textContent=n.toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'});
  const st=$('#sys-uptime');if(st)st.textContent=Math.floor((n-startTime)/1000)+'s';const sc=$('#sys-time');if(sc)sc.textContent=t.textContent;};tick();setInterval(tick,1000);}
// [FIX] Amb Matrix desactivem el parallax (evita vores negres en moure's el #bg).
function buildParallax(){const bg=$('#bg');addEventListener('mousemove',e=>{if(state.wp===4){bg.style.transform='none';return;}bg.style.transform=`translate(${(e.clientX/innerWidth-.5)*30}px,${(e.clientY/innerHeight-.5)*30}px)`;});}
function buildCursor(){const c=$('#cursor');let x=0,y=0,tx=0,ty=0;
  addEventListener('mousemove',e=>{tx=e.clientX;ty=e.clientY;});
  addEventListener('mousedown',()=>{c.classList.add('click');setTimeout(()=>c.classList.remove('click'),300);});
  addEventListener('mouseover',e=>c.classList.toggle('hover',!!e.target.closest('button,a,.icon,.folder,.win-btn,input,select')));
  (function loop(){x+=(tx-x)*.18;y+=(ty-y)*.18;c.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;requestAnimationFrame(loop);})();}
function buildStart(){const m=$('#menu');$('#start').onclick=e=>{e.stopPropagation();m.classList.toggle('hidden');};
  document.addEventListener('click',e=>{if(!e.target.closest('#menu')&&!e.target.closest('#start'))m.classList.add('hidden');});
  $$('.menu__power button').forEach(b=>b.onclick=()=>{m.classList.add('hidden');b.dataset.power==='shutdown'?shutdown():boot();});}
function buildContext(){const ctx=$('#ctxmenu');
  document.addEventListener('contextmenu',e=>{if(e.target.closest('.window,.menu,.taskbar'))return;e.preventDefault();
    ctx.classList.remove('hidden');const w=ctx.offsetWidth,h=ctx.offsetHeight;
    ctx.style.left=Math.min(e.clientX,innerWidth-w-8)+'px';ctx.style.top=Math.min(e.clientY,innerHeight-h-8)+'px';});
  document.addEventListener('click',()=>ctx.classList.add('hidden'));
  addEventListener('keydown',e=>{if(e.key==='Escape')ctx.classList.add('hidden');});
  ctx.querySelectorAll('button').forEach(b=>b.onclick=()=>{const a=b.dataset.act;ctx.classList.add('hidden');
    if(a==='refresh'){buildIcons();toast('Escritorio actualizado.');}
    // [FIX] array de noms ara inclou 'Matrix' (5 wallpapers).
    if(a==='wallpaper'){state.wp=(state.wp+1)%WALLS.length;applyTheme();save();toast('Fondo: '+['Verde nocturno','Bosque','Azul profundo','Violeta','Matrix'][state.wp]);}
    if(a==='terminal')openWindow('terminal');if(a==='system')openWindow('system');if(a==='arcade')openWindow('arcade');});}
function shutdown(){const s=$('#shutdown');s.classList.remove('hidden');$('#shutdown__msg').textContent='Apagando JOSEMI-OS...';
  setTimeout(()=>{$('#shutdown__msg').textContent='Ahora puedes cerrar esta pestaña con seguridad.';$('#reboot').classList.remove('hidden');},1600);
  $('#reboot').onclick=()=>location.reload();}
function buildKonami(){
  const s=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];let i=0;
  addEventListener('keydown',e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;if(key===s[i])i++;else if(key===s[0])i=1;else i=0;
    if(i===s.length){state.wp=4;applyTheme();save();toast('Código Konami: MODO DESARROLLADOR ACTIVADO');openWindow('easter');i=0;}});
  let clockClicks=0,clockTimer=null;
  $('#clock__time').addEventListener('click',()=>{clockClicks++;clearTimeout(clockTimer);clockTimer=setTimeout(()=>clockClicks=0,1500);if(clockClicks>=7){clockClicks=0;openWindow('easter');toast('Has forzado una anomalía temporal.');}});
  let typed='';
  addEventListener('keydown',e=>{if(e.target.matches('input,textarea'))return;if(e.key.length!==1)return;typed=(typed+e.key.toLowerCase()).slice(-12);if(typed.endsWith('josemi')){toast('Usuario raíz detectado.');openWindow('about');typed='';}});
}

/* ========================================================= ACCESO DIRECTO
   Ya no hay contraseña: el perfil de Josemi se carga automáticamente.
   ========================================================= */
const currentUser={
  nom:'José Miguel',
  rol:'Desarrollador en proceso · DAM',
  color:'#6dff9b',
  apps:['readme','about','projects','skills','terminal','contact','arcade','settings','system','trash'],
  auto:[]
};

const JOSEMI_ASCII=String.raw`
  JJJ   OOO   SSS  EEEE M   M III       OOO   SSS
    J  O   O S     E    MM MM  I       O   O S
    J  O   O  SSS  EEE  M M M  I  ---  O   O  SSS
 J  J  O   O     S E    M   M  I       O   O     S
  JJ    OOO   SSS  EEEE M   M III       OOO   SSS`;

let enteringOS=false,bootRun=0;
const bootDelay=ms=>new Promise(r=>setTimeout(r,ms));

function appendBoot(text='',cls=''){
  const out=$('#bootTerminalOutput');
  const line=document.createElement('span');line.className=cls;line.textContent=text+'\n';out.appendChild(line);out.scrollTop=out.scrollHeight;return line;
}
async function typeBootText(el,text,speed,run){
  el.textContent='';
  for(const ch of text){if(run!==bootRun||enteringOS)return false;el.textContent+=ch;await bootDelay(speed);}
  return true;
}
async function typeBootLine(text,cls,speed,run){
  const out=$('#bootTerminalOutput'),line=document.createElement('span');line.className=cls;out.appendChild(line);
  const ok=await typeBootText(line,text,speed,run);line.textContent+='\n';out.scrollTop=out.scrollHeight;return ok;
}

function showReadmeNotice(){
  const notice=$('#readmeNotice');
  if(notice)notice.classList.remove('hidden');
}

function enterOS(){
  if(enteringOS)return;enteringOS=true;bootRun++;
  document.documentElement.style.setProperty('--accent',currentUser.color);
  $('.menu__head strong').textContent=currentUser.nom;
  $('.menu__head small').textContent=currentUser.rol;
  buildIcons();buildMenu();
  const login=$('#login');login.classList.add('out');
  setTimeout(()=>{
    login.classList.add('hidden');
    $('#desktop').classList.remove('hidden');
    startTime=Date.now();applyTheme();
    toast('JOSEMI-OS iniciado. README.md pendiente de lectura.');
    showReadmeNotice();
  },420);
}

async function typeLoginArt(){
  const run=++bootRun;enteringOS=false;
  const login=$('#login'),out=$('#bootTerminalOutput'),cmd=$('#bootCommand');
  login.classList.remove('hidden','out');out.innerHTML='';cmd.textContent='';

  await typeBootText(cmd,'./boot-josemi-os --portfolio',28,run);if(run!==bootRun)return;
  await bootDelay(160);appendBoot('josemi@portfolio:~$ ./boot-josemi-os --portfolio','boot-command-history');cmd.textContent='';
  const steps=[
    ['[  OK  ] terminal.init()','boot-ok'],
    ['[  OK  ] detectando visitante...','boot-dim'],
    ['[  OK  ] montando /portfolio','boot-dim'],
    ['[  OK  ] cargando identidad: José Miguel Miralles Gandia','boot-ok'],
    ['[  OK  ] perfil: desarrollador de software en proceso','boot-dim'],
    ['[  OK  ] cargando proyectos, terminal y arcade','boot-dim'],
    ['[  OK  ] buscando bugs... se encontraron algunos. Perfecto.','boot-warn']
  ];
  for(const [text,cls] of steps){if(!await typeBootLine(text,cls,8,run))return;await bootDelay(80);}
  appendBoot('');
  for(const line of JOSEMI_ASCII.split('\n')){if(run!==bootRun)return;await typeBootLine(line,'boot-logo',2,run);}
  appendBoot('');
  await typeBootLine('PORTFOLIO INTERACTIVO // BUILD · LEARN · REPEAT','boot-accent',10,run);
  await typeBootLine('AVISO: README.md es obligatorio en el primer arranque.','boot-warn',10,run);
  await typeBootLine('[ READY ] iniciando interfaz...','boot-ok',10,run);
  await bootDelay(420);if(run===bootRun)enterOS();
}

function showLogin(){
  $('#desktop').classList.add('hidden');stopMatrix();
  const notice=$('#readmeNotice');if(notice)notice.classList.add('hidden');
  typeLoginArt();
}

function initDirectAccess(){
  $('#skipBoot').addEventListener('click',enterOS);
  $('#openReadmeNotice').addEventListener('click',()=>{
    $('#readmeNotice').classList.add('hidden');openWindow('readme');
  });
  addEventListener('keydown',e=>{
    if(!$('#login').classList.contains('hidden')&&e.key==='Enter'){e.preventDefault();enterOS();}
  });
}

/* ========================================================= INICIO */
buildIcons();buildMenu();buildClock();buildParallax();buildCursor();buildStart();buildContext();buildKonami();initDirectAccess();typeLoginArt();
