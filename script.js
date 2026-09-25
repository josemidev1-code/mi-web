/* =========================================================
   JOSEMI OS · v1.3 (Windows 95)
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
const DEF={accent:'#6C63FF',bg:'#050505',wp:0,sound:true,motion:false};
let state=Object.assign({},DEF);
try{ state=Object.assign(state, JSON.parse(localStorage.getItem('josemi-os')||'{}')); }catch(e){}
// localStorage conserva datos aunque se cierre o recargue la pestaña.
const save=()=>{ try{ localStorage.setItem('josemi-os',JSON.stringify(state)); }catch(e){} };

/* --- Wallpapers (tonos planos estilo Win95) --- */
// [FIX] Añadido 'matrix' como 5º wallpaper (índice 4).
const WALLS=['#008080','#006666','#004040','#0080a0','matrix'];
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
  nombre:'Josemi',
  rol:'Estudiante de Desarrollo de Aplicaciones Multiplataforma',
  estado:'Aprendiendo, construyendo y mejorando cada proyecto',
  ubicacion:'España',
  bio:'Estudiante de Desarrollo de Aplicaciones Multiplataforma interesado en programación, desarrollo web, aplicaciones y tecnología. Me gusta aprender creando proyectos y experimentar con nuevas tecnologías.',
  aspiracion:'PENDIENTE_DE_PERSONALIZAR',
  gustos:['Programación','Desarrollo web','Aplicaciones','Tecnología']
};

const pixelIcon=tipo=>`<span class="app-pixel-icon app-pixel-icon--${tipo}" aria-hidden="true"></span>`;

const Apps={
 about:{title:'Sobre mí',icon:'👤',render:()=>`
   <div class="app-title">PERFIL DE USUARIO</div>
   <dl class="kv"><dt>Nombre</dt><dd>${PROFILE.nombre}</dd><dt>Rol</dt><dd>${PROFILE.rol}</dd><dt>Estado</dt><dd>${PROFILE.estado}</dd><dt>Ubicación</dt><dd>${PROFILE.ubicacion}</dd></dl>
   <div class="divider"></div><p class="bio">${PROFILE.bio}</p>
   <div class="divider"></div><div class="app-title">LO QUE ME MUEVE</div>
   <div class="chips">${PROFILE.gustos.map(x=>`<span class="chip g-comf">${x}</span>`).join('')}</div>
   <div class="divider"></div><div class="app-title">HACIA DÓNDE VOY</div>
   <p class="bio profile-pending">${PROFILE.aspiracion==='PENDIENTE_DE_PERSONALIZAR'
     ?'⚠ Pendiente de personalizar contigo: objetivo profesional, tipo de proyectos que quieres crear y qué vida aspiras a construir.'
     :PROFILE.aspiracion}</p>
   <div class="divider"></div><div class="app-title">DATOS DEL SISTEMA</div>
   <dl class="kv"><dt>Curiosidad</dt><dd>100%</dd><dt>Modo actual</dt><dd>Aprendizaje continuo</dd><dt>Bugs</dt><dd>Se arreglan uno a uno</dd><dt>Versión</dt><dd>JOSEMI_OS 2.0</dd></dl>`},

 projects:{title:'Proyectos',icon:'📁',render:()=>`
   <div class="app-title">PROYECTOS/</div>
   <p class="bio">Doble clic para abrir una carpeta. Los datos actuales son los que ya había en tu portfolio y conviene sustituirlos por tus proyectos reales.</p>
   <div class="folder-grid">
     <div class="folder" tabindex="0" data-folder="java"><span class="g">📁</span><span class="n">Java</span></div>
     <div class="folder" tabindex="0" data-folder="web"><span class="g">📁</span><span class="n">Web</span></div>
     <div class="folder" tabindex="0" data-folder="exp"><span class="g">📁</span><span class="n">Experimentos</span></div>
     <div class="folder" tabindex="0" data-folder="school"><span class="g">📁</span><span class="n">Proyectos de clase</span></div>
   </div>`,
   bind(b){b.querySelectorAll('.folder').forEach(f=>{
     const abrir=()=>openProject(f.dataset.folder);
     f.addEventListener('dblclick',abrir);
     f.addEventListener('keydown',e=>{if(e.key==='Enter')abrir();});
   });}},

 skills:{title:'Habilidades',icon:'⚡',render:()=>`
   <div class="app-title">RECURSOS DEL SISTEMA</div>${bar('Java',80)}${bar('SQL',70)}${bar('HTML',80)}${bar('CSS',70)}${bar('JavaScript',60)}${bar('Git',60)}
   <div class="cat-label">ME DEFIENDO</div><div class="chips"><span class="chip g-comf">Java</span><span class="chip g-comf">HTML</span><span class="chip g-comf">CSS</span><span class="chip g-comf">SQL</span></div>
   <div class="cat-label">APRENDIENDO</div><div class="chips"><span class="chip g-learn">JavaScript</span><span class="chip g-learn">Git</span><span class="chip g-learn">Docker</span></div>
   <div class="cat-label">SIGUIENTE NIVEL</div><div class="chips"><span class="chip g-next">Spring</span><span class="chip g-next">React</span><span class="chip g-next">Backend</span></div>
   <p class="profile-note">Estos porcentajes ya estaban en el código. Dime cuáles representan de verdad tu nivel y los ajusto.</p>`,
   bind(b){b.querySelectorAll('.bar>i').forEach(el=>requestAnimationFrame(()=>el.style.width=el.dataset.w+'%'));}},

 terminal:{title:'Terminal',icon:'💻',render:()=>`
   <div class="term"><div class="term__out" id="term-out"></div>
   <div class="term__line"><span class="p">josemi@portfolio</span>:<span class="dir">~</span>$<input class="term__in" id="term-in" autocomplete="off" spellcheck="false"></div></div>`,
   bind(b){const out=$('#term-out',b),inp=$('#term-in',b);
     const print=(h,c='')=>{const d=document.createElement('div');d.className=c;d.innerHTML=h;out.appendChild(d);out.scrollTop=out.scrollHeight;};
     print('Terminal de JOSEMI OS · escribe <span class="ok">ayuda</span>');
     inp.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const raw=inp.value.trim();inp.value='';
       print(`<span class="p">josemi@portfolio</span>:<span class="dir">~</span>$ ${raw}`);runCommand(raw,print,openWindow);});
     b.addEventListener('click',()=>inp.focus());}},

 readme:{title:'LEEME.txt',icon:'📄',render:()=>`<div class="editor"><span class="h"># JOSEMI OS</span>\n\nBienvenido a mi portfolio convertido en sistema operativo.\nAquí puedes conocerme, explorar mis proyectos, ver lo que estoy aprendiendo,\nabrir una terminal e incluso perder unos minutos en el Arcade.\n\nTodo está hecho para tocarlo, abrirlo y descubrirlo.\n\nComandos útiles:\n  Terminal → ayuda\n  Terminal → secreto\n\n<span class="w">Aviso:</span>\nHay easter eggs escondidos por el sistema.</div>`},

 contact:{title:'Contacto',icon:'📬',render:()=>`
   <div class="contact"><h2>CONSTRUYAMOS ALGO.</h2><div class="links">
     <a class="clink" href="https://github.com/josemidev1-code" target="_blank" rel="noopener"><span class="g">🐙</span> GitHub</a>
     <button class="clink clink--button" id="linkedin-pending"><span class="g">💼</span> LinkedIn · pendiente de personalizar</button>
     <a class="clink" href="mailto:josemidev1@gmail.com"><span class="g">✉️</span> josemidev1@gmail.com</a>
   </div><button class="btn btn--accent" id="copy-email">COPIAR CORREO</button></div>`,
   bind(b){
     $('#linkedin-pending',b).addEventListener('click',()=>toast('Falta tu URL real de LinkedIn.'));
     $('#copy-email',b).addEventListener('click',async()=>{try{await navigator.clipboard.writeText('josemidev1@gmail.com');toast('Correo copiado al portapapeles.');}catch{toast('No se ha podido acceder al portapapeles.');}});
   }},

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
     <span class="swatch ${state.accent==='#6C63FF'?'on':''}" data-c="#6C63FF" style="background:#6C63FF"></span>
     <span class="swatch ${state.accent==='#00C8FF'?'on':''}" data-c="#00C8FF" style="background:#00C8FF"></span>
     <span class="swatch ${state.accent==='#4ade80'?'on':''}" data-c="#4ade80" style="background:#4ade80"></span>
     <span class="swatch ${state.accent==='#f5b942'?'on':''}" data-c="#f5b942" style="background:#f5b942"></span></div></div>
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
   <div class="app-title">JOSEMI OS · ESTADO: <span style="color:#168b16">EN LÍNEA</span></div>
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
      print('Comandos: <span class="ok">ayuda quien-soy sobre-mi proyectos habilidades contacto limpiar fecha eco ls cat sudo secreto matrix fondo tetris pacman arcade cafe hola 42</span>');break;
    case'whoami':case'quien-soy':print('Josemi<br>Estudiante de DAM<br>Desarrollador en construcción.');break;
    case'about':case'sobre-mi':print('Abriendo Sobre mí...');openWin('about');break;
    case'projects':case'proyectos':print('Abriendo Proyectos...');openWin('projects');break;
    case'skills':case'habilidades':print('Abriendo Habilidades...');openWin('skills');break;
    case'contact':case'contacto':print('Abriendo Contacto...');openWin('contact');break;
    case'clear':case'limpiar':$('#term-out').innerHTML='';break;
    case'date':case'fecha':print(new Date().toLocaleString('es-ES'));break;
    case'echo':case'eco':print(a||'');break;
    case'ls':print('sobre-mi.txt  proyectos/  habilidades.json  contacto.txt  juegos/  secreto/');break;
    case'cat':
      if(a==='sobre-mi.txt'||a==='about.txt')print('Estudiante de DAM. Aprendo creando. Este archivo todavía tiene partes que debemos personalizar juntos.');
      else if(a==='sueños.txt'||a==='suenos.txt')print('<span class="ok">[ARCHIVO BLOQUEADO]</span> Falta que Josemi escriba aquí exactamente qué quiere conseguir.');
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
 java:{name:'Prácticas de Java',desc:'Prácticas de POO en Java: clases, herencia y colecciones.',lang:'Java',db:'—',fw:'—',date:'POR CONFIRMAR',status:'done',tags:['Java','POO']},
 web:{name:'JOSEMI OS',desc:'Este portfolio convertido en sistema operativo, construido con HTML, CSS y JavaScript.',lang:'HTML/CSS/JS',db:'—',fw:'Vanilla',date:'2026',status:'dev',tags:['Web','JavaScript']},
 exp:{name:'Experimentos',desc:'Prototipos rápidos para aprender tecnologías nuevas.',lang:'Varios',db:'—',fw:'Varios',date:'POR CONFIRMAR',status:'exp',tags:['I+D']},
 school:{name:'Proyectos de clase',desc:'Trabajos de DAM: bases de datos, Java, aplicaciones y ejercicios.',lang:'Java/SQL',db:'PostgreSQL',fw:'—',date:'POR CONFIRMAR',status:'dev',tags:['DAM']}
};
function openProject(k){const p=PROJECTS[k];if(!p)return;const id='proj-'+k;
  Apps[id]={title:p.name,icon:'📂',render:()=>`<div class="app-title">${p.name.toUpperCase()}</div><p class="bio">${p.desc}</p>
    <div class="proj">${p.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
    <dl class="kv"><dt>Lenguaje</dt><dd>${p.lang}</dd><dt>Base de datos</dt><dd>${p.db}</dd><dt>Framework</dt><dd>${p.fw}</dd><dt>Fecha</dt><dd>${p.date}</dd></dl>
    <span class="status ${p.status}">${p.status==='done'?'COMPLETADO':p.status==='dev'?'EN DESARROLLO':'EXPERIMENTAL'}</span>
    <div class="btn-row"><button class="btn btn--accent" data-project-action="demo">VER PROYECTO</button><button class="btn" data-project-action="source">VER CÓDIGO</button></div>
    <p class="profile-note">Los enlaces reales de cada proyecto todavía no están configurados.</p>`,
    bind(b){b.querySelectorAll('[data-project-action]').forEach(btn=>btn.onclick=()=>toast('Falta añadir el enlace real de este proyecto.'));}};
  openWindow(id);
}

/* ========================================================= BOOT */
const BOOTL=['Inicializando núcleo...','Cargando perfil de Josemi...','Montando proyectos...','Cargando habilidades...','Iniciando interfaz...'];
async function boot(){$('#desktop').classList.add('hidden');stopMatrix();const log=$('#boot__log');log.innerHTML='';$('#boot').classList.remove('out','hidden','glitch');
  for(const l of BOOTL){await sleep(220);log.innerHTML+=`<div><span class="ok">[ OK ]</span> ${l}</div>`;}
  await sleep(300);log.innerHTML+=`<div class="granted">ACCESO CONCEDIDO</div>`;await sleep(420);
  $('#boot').classList.add('out');await sleep(320);$('#boot').classList.add('hidden');
  const sp=$('#splash'); sp.classList.remove('hidden');await sleep(900);
  sp.classList.add('out');await sleep(320);sp.classList.add('hidden');
  $('#desktop').classList.remove('hidden');
  // [FIX] Ara sí: apliquem el tema DESPRÉS de mostrar el desktop => Matrix s'activa si wp=4.
  applyTheme();
  (currentUser.auto||[]).forEach(a=>openWindow(a));
  toast('Bienvenido a JOSEMI_OS, '+currentUser.nom+'.');
}

/* ========================================================= ESCRITORIO */
// [FIX] Añadidos 'tetris' y 'pacman' perquè tinguen acces directe.
const ICONS=['about','projects','skills','terminal','readme','contact','arcade','trash','settings','system'];
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
    if(a==='wallpaper'){state.wp=(state.wp+1)%WALLS.length;applyTheme();save();toast('Fondo: '+['Turquesa','Verde oscuro','Océano','Acero','Matrix'][state.wp]);}
    if(a==='terminal')openWindow('terminal');if(a==='system')openWindow('system');if(a==='arcade')openWindow('arcade');});}
function shutdown(){const s=$('#shutdown');s.classList.remove('hidden');$('#shutdown__msg').textContent='Apagando JOSEMI OS...';
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
  nom:'Josemi',
  rol:'Estudiante de DAM',
  color:'#6C63FF',
  apps:['about','projects','skills','terminal','readme','contact','arcade','trash','settings','system'],
  auto:[]
};

const ASCII_FX_DURATION=3200;
const clamp01=n=>Math.max(0,Math.min(1,n));
const easeOutCubic=n=>1-Math.pow(1-n,3);
let enteringOS=false;

function asciiSeed(x,y,salt=0){return ((x*73+y*151+salt*199+x*y*17)%997)/997;}

function renderLoginFrame(text,kind,elapsed){
  if((kind==='computer'&&elapsed>=2000)||(kind==='logo'&&elapsed>=2900))return text;
  const rows=text.split('\n'),width=Math.max(...rows.map(row=>row.length)),height=rows.length;
  const canvas=Array.from({length:height},()=>Array(width).fill(' ')),noise='01#$%?+*:/\\';
  rows.forEach((row,y)=>[...row].forEach((char,x)=>{
    if(char===' ')return;const seed=asciiSeed(x,y,kind==='computer'?1:2);
    if(kind==='computer'){
      if(char==='0'||char==='1'){const age=elapsed-(620+seed*360);if(age<0)return;if(age<820)canvas[y][x]=noise[(Math.floor(age/48)+x*5+y*3)%noise.length];else canvas[y][x]=char;return;}
      const local=clamp01((elapsed-seed*300)/760);if(local<=0)return;const side=Math.floor(seed*4),sx=side===0?0:side===1?width-1:Math.floor(seed*width),sy=side===2?0:side===3?height-1:Math.floor(asciiSeed(x,y,8)*height),ease=easeOutCubic(local),px=Math.round(sx+(x-sx)*ease),py=Math.round(sy+(y-sy)*ease);
      canvas[py][px]=local<.72?noise[(x+y+Math.floor(elapsed/55))%noise.length]:char;return;
    }
    const local=clamp01((elapsed-(1950+seed*230))/720);if(local<=0)return;if(local>=1){canvas[y][x]=char;return;}
    const sx=Math.floor(asciiSeed(x,y,4)*width),sy=Math.floor(asciiSeed(x,y,9)*height),ease=easeOutCubic(local),px=Math.round(sx+(x-sx)*ease),py=Math.round(sy+(y-sy)*ease);
    canvas[py][px]=local>.78?char:noise[(x*3+y+Math.floor(elapsed/50))%noise.length];
  }));
  return canvas.map(row=>row.join('')).join('\n');
}

function enterOS(){
  if(enteringOS)return;enteringOS=true;
  const login=$('#login');
  document.documentElement.style.setProperty('--accent',currentUser.color);
  $('.menu__head strong').textContent=currentUser.nom;
  $('.menu__head small').textContent=currentUser.rol;
  buildIcons();buildMenu();beep();
  login.classList.add('out');
  setTimeout(()=>{login.classList.add('hidden');boot();},500);
}

function typeLoginArt(){
  const login=$('#login'),status=$('#loginSequenceText'),bar=$('#loginSequenceBar');
  login.classList.remove('ascii-ready');login.classList.add('ascii-intro');
  const parts=$$('.login__computer,.login__ascii').map(el=>{const text=el.textContent,spacer=document.createElement('span'),ink=document.createElement('span');spacer.textContent=text;spacer.className='ascii-spacer';spacer.setAttribute('aria-hidden','true');ink.className='ascii-ink';ink.setAttribute('aria-hidden','true');el.classList.add('ascii-typing');el.replaceChildren(spacer,ink);return{el,text,ink,kind:el.classList.contains('login__computer')?'computer':'logo'};});
  const started=performance.now();
  function finish(){for(const part of parts){part.el.textContent=part.text;part.el.classList.remove('ascii-typing');}login.classList.remove('ascii-intro','ascii-pulse','ascii-glitch');login.classList.add('ascii-ready');status.textContent='[ PERFIL VERIFICADO · ACCESO DIRECTO ]';bar.textContent='[########################] 100%';setTimeout(enterOS,260);}
  function frame(now){const elapsed=now-started,progress=clamp01(elapsed/ASCII_FX_DURATION);if(elapsed>=ASCII_FX_DURATION||login.classList.contains('out')||login.classList.contains('hidden')){finish();return;}for(const part of parts)part.ink.textContent=renderLoginFrame(part.text,part.kind,elapsed);
    login.classList.toggle('ascii-pulse',(elapsed>1200&&elapsed<1550)||(elapsed>2700&&elapsed<2950));
    status.textContent=elapsed<550?'> SEÑAL RECIBIDA_':elapsed<1200?'> CONSTRUYENDO PANTALLA ASCII...':elapsed<1950?'> DESCIFRANDO NÚCLEO BINARIO...':elapsed<2700?'> CARGANDO JOSEMI_OS...':'> CARGANDO PERFIL DE JOSEMI...';
    const filled=Math.round(progress*24);bar.textContent=`[${'#'.repeat(filled)}${'.'.repeat(24-filled)}] ${String(Math.round(progress*100)).padStart(3,' ')}%`;requestAnimationFrame(frame);}
  for(const part of parts)part.ink.textContent=renderLoginFrame(part.text,part.kind,0);requestAnimationFrame(frame);
}

function showLogin(){
  enteringOS=false;
  $('#desktop').classList.add('hidden');stopMatrix();
  const l=$('#login');l.classList.remove('hidden','out');typeLoginArt();
}

function initDirectAccess(){
  $('#login').addEventListener('click',e=>{if(e.target.closest('a,button'))return;enterOS();});
  addEventListener('keydown',e=>{if(!$('#login').classList.contains('hidden')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();enterOS();}});
}

/* ========================================================= INICIO */
buildIcons();buildMenu();buildClock();buildParallax();buildCursor();buildStart();buildContext();buildKonami();initDirectAccess();typeLoginArt();