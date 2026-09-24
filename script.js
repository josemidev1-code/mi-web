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
    matrixDrops[i]+=2;   // VELOCITAT: puja a 3 o 4 si el vols encara més ràpid
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
const Apps={
 about:{title:'About Me',icon:'👤',render:()=>`
   <div class="app-title">USER PROFILE</div>
   <dl class="kv"><dt>Name</dt><dd>Josemi</dd><dt>Role</dt><dd>DAM Student</dd><dt>Status</dt><dd>Learning &amp; Building</dd><dt>Location</dt><dd>Spain</dd></dl>
   <div class="divider"></div><p class="bio">Estudiante de Desarrollo de Aplicaciones Multiplataforma interesado en programación, desarrollo web, aplicaciones y tecnología. Me gusta aprender creando proyectos y experimentar con nuevas tecnologías.</p>
   <div class="divider"></div><div class="app-title">SYSTEM INFO</div>
   <dl class="kv"><dt>Curiosity</dt><dd>100%</dd><dt>Coffee dependency</dt><dd>75%</dd><dt>Bugs created</dt><dd>classified</dd><dt>Bugs fixed</dt><dd>hopefully more</dd></dl>`},

 projects:{title:'Projects',icon:'📁',render:()=>`
   <div class="app-title">Projects/</div>
   <div class="folder-grid">
     <div class="folder" data-folder="java"><span class="g">📁</span><span class="n">Java</span></div>
     <div class="folder" data-folder="web"><span class="g">📁</span><span class="n">Web</span></div>
     <div class="folder" data-folder="exp"><span class="g">📁</span><span class="n">Experiments</span></div>
     <div class="folder" data-folder="school"><span class="g">📁</span><span class="n">School Projects</span></div>
   </div>`,
   bind(b){b.querySelectorAll('.folder').forEach(f=>f.addEventListener('dblclick',()=>openProject(f.dataset.folder)));}},

 skills:{title:'Skills',icon:'⚡',render:()=>`
   <div class="app-title">SYSTEM RESOURCES</div>${bar('Java',80)}${bar('SQL',70)}${bar('HTML',80)}${bar('CSS',70)}${bar('JavaScript',60)}${bar('Git',60)}
   <div class="cat-label">COMFORTABLE</div><div class="chips"><span class="chip g-comf">Java</span><span class="chip g-comf">HTML</span><span class="chip g-comf">CSS</span><span class="chip g-comf">SQL</span></div>
   <div class="cat-label">LEARNING</div><div class="chips"><span class="chip g-learn">JavaScript</span><span class="chip g-learn">Git</span><span class="chip g-learn">Docker</span></div>
   <div class="cat-label">NEXT</div><div class="chips"><span class="chip g-next">Spring</span><span class="chip g-next">React</span><span class="chip g-next">Backend development</span></div>`,
   bind(b){b.querySelectorAll('.bar>i').forEach(el=>requestAnimationFrame(()=>el.style.width=el.dataset.w+'%'));}},

 terminal:{title:'Terminal',icon:'💻',render:()=>`
   <div class="term"><div class="term__out" id="term-out"></div>
   <div class="term__line"><span class="p">josemi@portfolio</span>:<span class="dir">~</span>$<input class="term__in" id="term-in" autocomplete="off" spellcheck="false"></div></div>`,
   bind(b){const out=$('#term-out',b),inp=$('#term-in',b);
     // Esta función imprime una nueva línea dentro de la terminal simulada.
     const print=(h,c='')=>{const d=document.createElement('div');d.className=c;d.innerHTML=h;out.appendChild(d);out.scrollTop=out.scrollHeight;};
     print('JOSEMI OS Terminal · type <span class="ok">help</span>');
     inp.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const raw=inp.value.trim();inp.value='';
       print(`<span class="p">josemi@portfolio</span>:<span class="dir">~</span>$ ${raw}`);runCommand(raw,print,openWindow);});
     b.addEventListener('click',()=>inp.focus());}},

 readme:{title:'README.txt',icon:'📄',render:()=>`<div class="editor"><span class="h"># JOSEMI OS</span>\n\nWelcome.\nThis operating system contains information about Josemi,\na student of Desarrollo de Aplicaciones Multiplataforma.\n\nFeel free to explore the system.\n\nUseful commands:\n  Terminal → help\n\n<span class="w">Warning:</span>\nSome files may contain bugs.</div>`},

 contact:{title:'Contact',icon:'📬',render:()=>`
   <div class="contact"><h2>LET'S BUILD SOMETHING.</h2><div class="links">
     <a class="clink" href="https://github.com/josemidev1-code" target="_blank" rel="noopener"><span class="g">🐙</span> GitHub</a>
     <a class="clink" href="https://www.linkedin.com/in/TU_USUARIO" target="_blank" rel="noopener"><span class="g">💼</span> LinkedIn</a>
     <a class="clink" href="mailto:josemidev1@gmail.com"><span class="g">✉️</span> josemidev1@gmail.com</a>
   </div><button class="btn btn--accent" id="copy-email">COPY EMAIL</button></div>`,
   bind(b){$('#copy-email',b).addEventListener('click',async()=>{try{await navigator.clipboard.writeText('josemidev1@gmail.com');toast('Copied to clipboard.');}catch{toast('No clipboard access.');}});}},

 trash:{title:'Trash',icon:'🗑',render:()=>`
   <div class="app-title">/home/josemi/.trash</div>
   <div class="file-row" data-file="motivation.exe"><span class="g">⚙️</span> motivation.exe</div>
   <div class="file-row" data-file="x"><span class="g">📄</span> matrix-design.old</div>
   <div class="file-row" data-file="x"><span class="g">🗜️</span> failed-project.zip</div>
   <div class="file-row" data-file="x"><span class="g">📄</span> todo-list-final-final-v2.java</div>`,
   bind(b){b.querySelectorAll('.file-row').forEach(r=>r.addEventListener('dblclick',()=>{
     if(r.dataset.file==='motivation.exe')openWindow('motivation');else toast('File is corrupted. (just kidding 🙂)');}));}},

 settings:{title:'Settings',icon:'⚙',render:()=>`
   <div class="app-title">SETTINGS</div>
   <div class="setting"><div>Reduce animations<small>Desactiva transiciones</small></div><button class="switch ${state.motion?'on':''}" id="sw-motion"></button></div>
   <div class="setting"><div>Sounds<small>Beeps al abrir/cerrar</small></div><button class="switch ${state.sound?'on':''}" id="sw-sound"></button></div>
   <div class="setting"><div>Accent color<small>Sin efecto bajo Win95</small></div><div class="swatches" id="sw-accent">
     <span class="swatch ${state.accent==='#6C63FF'?'on':''}" data-c="#6C63FF" style="background:#6C63FF"></span>
     <span class="swatch ${state.accent==='#00C8FF'?'on':''}" data-c="#00C8FF" style="background:#00C8FF"></span>
     <span class="swatch ${state.accent==='#4ade80'?'on':''}" data-c="#4ade80" style="background:#4ade80"></span>
     <span class="swatch ${state.accent==='#f5b942'?'on':''}" data-c="#f5b942" style="background:#f5b942"></span></div></div>
   <div class="setting"><div>Darkness<small>Nivel de fondo</small></div><select id="sel-dark">
     <option value="#050505" ${state.bg==='#050505'?'selected':''}>Dark</option>
     <option value="#030303" ${state.bg==='#030303'?'selected':''}>Darker</option>
     <option value="#000000" ${state.bg==='#000000'?'selected':''}>Very Dark</option></select></div>
   <div class="setting"><div>Wallpaper<small>Fondo del escritorio</small></div><div class="wp-row" id="sw-wp">
     ${WALLS.map((w,i)=>w==='matrix'
       ?`<span class="wp wp--matrix ${i===state.wp?'on':''}" data-w="${i}">M</span>`
       :`<span class="wp ${i===state.wp?'on':''}" data-w="${i}" style="background:${w}"></span>`).join('')}</div></div>`,
   bind(b){
     $('#sw-motion',b).onclick=e=>{state.motion=!state.motion;e.target.classList.toggle('on');applyTheme();save();};
     $('#sw-sound',b).onclick=e=>{state.sound=!state.sound;e.target.classList.toggle('on');save();if(state.sound)beep();};
     $$('#sw-accent .swatch',b).forEach(s=>s.onclick=()=>{state.accent=s.dataset.c;$$('#sw-accent .swatch',b).forEach(x=>x.classList.remove('on'));s.classList.add('on');applyTheme();save();});
     $('#sel-dark',b).onchange=e=>{state.bg=e.target.value;applyTheme();save();};
     $$('#sw-wp .wp',b).forEach(w=>w.onclick=()=>{state.wp=+w.dataset.w;$$('#sw-wp .wp',b).forEach(x=>x.classList.remove('on'));w.classList.add('on');applyTheme();save();});}},

 system:{title:'System Monitor',icon:'🖥',render:()=>`
   <div class="app-title">JOSEMI OS · System Status: <span style="color:#4ade80">ONLINE</span></div>
   <div class="sys-grid">
     <div class="sys-card"><b id="sys-uptime">0s</b><span>Session uptime</span></div>
     <div class="sys-card"><b id="sys-time">--:--</b><span>Current time</span></div>
     <div class="sys-card"><b id="sys-res">—</b><span>Resolution</span></div>
     <div class="sys-card"><b id="sys-lang">—</b><span>Browser language</span></div>
     <div class="sys-card"><b id="sys-browser">—</b><span>Browser</span></div></div>`,
   bind(b){$('#sys-res',b).textContent=`${screen.width}×${screen.height}`;$('#sys-lang',b).textContent=navigator.language;
     const ua=navigator.userAgent;$('#sys-browser',b).textContent=/Firefox/.test(ua)?'Firefox':/Edg/.test(ua)?'Edge':/Chrome/.test(ua)?'Chrome':/Safari/.test(ua)?'Safari':'Unknown';}},

 motivation:{title:'motivation.exe',icon:'💡',render:()=>`<div style="text-align:center;padding:2rem 1rem"><div style="font-size:2.5rem">💡</div><p style="font-family:var(--font-mono);margin-top:1rem;line-height:1.8">Keep building.<br>You are closer than you think.</p></div>`},

/* =========================================================
   [NOU] 🎮 TETRIS  (canvas, sense IDs duplicats => usa classes)
   ========================================================= */
 tetris:{title:'Tetris',icon:'🎮',render:()=>`
   <div class="game game--tetris">
     <canvas class="tetris-canvas" width="240" height="480"></canvas>
     <div class="game__hud">
       <span>SCORE <b class="tetris-score">0</b></span>
       <span>LEVEL <b class="tetris-level">1</b></span>
       <button class="btn tetris-start">START</button>
     </div>
   </div>`,
   bind(b,win){
     win=win||b.closest('.window');                 // el WM ens passa la finestra
     const cv=$('.tetris-canvas',b),ctx=cv.getContext('2d');
     const scoreEl=$('.tetris-score',b),levelEl=$('.tetris-level',b),startBtn=$('.tetris-start',b);
     const COLS=12,ROWS=24,S=20;                    // tauler i mida de cel·la
     const COLORS=['#00C8FF','#6C63FF','#f5b942','#4ade80','#ef4444','#a3e635','#c084fc'];
     const SHAPES=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],[[1,1,0],[0,1,1]],[[0,1,1],[1,1,0]]];
     let board,piece,score=0,level=1,speed=500,timer=null,running=false;

     function reset(){board=Array.from({length:ROWS},()=>Array(COLS).fill(0));score=0;level=1;speed=500;scoreEl.textContent=score;levelEl.textContent=level;}
     function newPiece(){const i=Math.floor(Math.random()*SHAPES.length);return{x:Math.floor((COLS-SHAPES[i][0].length)/2),y:0,shape:SHAPES[i],color:i+1};}
     // collide: xoca la peça si es mou (dx,dy) o si la forma `shape` ix del tauler o toca un bloc fix.
     function collide(p,dx=0,dy=0,shape=p.shape){for(let y=0;y<shape.length;y++)for(let x=0;x<shape[y].length;x++){if(!shape[y][x])continue;const nx=p.x+x+dx,ny=p.y+y+dy;if(nx<0||nx>=COLS||ny>=ROWS)return true;if(ny>=0&&board[ny][nx])return true;}return false;}
     function rotate(){const r=piece.shape[0].map((_,i)=>piece.shape.map(row=>row[i]).reverse());if(!collide(piece,0,0,r))piece.shape=r;}
     function drawCell(x,y,c){ctx.fillStyle=c;ctx.fillRect(x*S,y*S,S,S);ctx.strokeStyle='rgba(0,0,0,.45)';ctx.strokeRect(x*S,y*S,S,S);}
     function draw(){ctx.fillStyle='#000';ctx.fillRect(0,0,cv.width,cv.height);ctx.strokeStyle='rgba(255,255,255,.04)';
       for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x*S,0);ctx.lineTo(x*S,cv.height);ctx.stroke();}
       for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*S);ctx.lineTo(cv.width,y*S);ctx.stroke();}
       board.forEach((row,y)=>row.forEach((v,x)=>{if(v)drawCell(x,y,COLORS[(v-1)%COLORS.length]);}));
       if(piece)piece.shape.forEach((row,y)=>row.forEach((v,x)=>{if(v)drawCell(piece.x+x,piece.y+y,COLORS[(piece.color-1)%COLORS.length]);}));}
     // lock: fixar la peça, netejar línies plenes, puntuar i pujar nivell/velocitat.
     function lock(){piece.shape.forEach((row,y)=>row.forEach((v,x)=>{if(v&&piece.y+y>=0)board[piece.y+y][piece.x+x]=piece.color;}));
       let cleared=0;for(let y=ROWS-1;y>=0;y--){if(board[y].every(v=>v)){board.splice(y,1);board.unshift(Array(COLS).fill(0));cleared++;y++;}}
       score+=[0,100,300,500,800][cleared]||0;level=Math.floor(score/1000)+1;speed=Math.max(90,500-(level-1)*40);
       scoreEl.textContent=score;levelEl.textContent=level;if(timer){clearInterval(timer);timer=setInterval(tick,speed);}
       piece=newPiece();if(collide(piece,0,0)){stop();toast('Game Over');}}
     function tick(){if(!piece)return;if(!collide(piece,0,1))piece.y++;else lock();draw();}
     function start(){stop();reset();piece=newPiece();running=true;timer=setInterval(tick,speed);draw();win.focus();}
     function stop(){if(timer)clearInterval(timer);timer=null;running=false;}
     // Teclat: ← → moure, ↓ baixar, ↑ girar, ESPAI caiguda instantània.
     function key(e){if(!running)return;if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' '].includes(e.key))e.preventDefault();
       if(e.key==='ArrowLeft'&&!collide(piece,-1,0))piece.x--;
       if(e.key==='ArrowRight'&&!collide(piece,1,0))piece.x++;
       if(e.key==='ArrowDown'&&!collide(piece,0,1)){piece.y++;score++;scoreEl.textContent=score;}
       if(e.key==='ArrowUp')rotate();
       if(e.key===' '){while(!collide(piece,0,1))piece.y++;lock();}draw();}
     win.tabIndex=0;win.addEventListener('keydown',key);cv.addEventListener('click',()=>win.focus());
     // [FIX] Cleanup: el WM cridarà win.__cleanup() en tancar la finestra.
     win.__cleanup=()=>{stop();win.removeEventListener('keydown',key);};
     startBtn.addEventListener('click',start);reset();draw();
   }},

/* =========================================================
   [NOU] 🟡 PAC-MAN mini  (fantasma que PERSEGUISCA el jugador)
   ========================================================= */
 pacman:{title:'Pac-Man',icon:'🟡',render:()=>`
   <div class="game game--pacman">
     <canvas class="pac-canvas" width="280" height="280"></canvas>
     <div class="game__hud">
       <span>SCORE <b class="pac-score">0</b></span>
       <button class="btn pac-start">START</button>
     </div>
   </div>`,
   bind(b,win){
     win=win||b.closest('.window');
     const cv=$('.pac-canvas',b),ctx=cv.getContext('2d'),scoreEl=$('.pac-score',b),startBtn=$('.pac-start',b);
     const CELL=20,COLS=14,ROWS=14;                 // # = paret, . = punt
     const maze=['##############','#............#','#.##.####.##.#','#.#........#.#','#.##.####.##.#','#............#','####.####.####','#..#....#..#.#','#.##.##.##.#.#','#............#','##.##.##.##.##','#............#','#.##.####.##.#','##############'];
     let dots=[],player={x:1,y:1},ghost={x:12,y:12},score=0,timer=null,running=false,lastGhost={dx:0,dy:0};
     function canMove(x,y){return x>=0&&x<COLS&&y>=0&&y<ROWS&&maze[y][x]!=='#';}
     function reset(){dots=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(maze[y][x]==='.')dots.push({x,y});player={x:1,y:1};ghost={x:12,y:12};score=0;scoreEl.textContent=score;lastGhost={dx:0,dy:0};}
     function draw(){ctx.fillStyle='#000';ctx.fillRect(0,0,cv.width,cv.height);ctx.fillStyle='#0033cc';
       for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(maze[y][x]==='#')ctx.fillRect(x*CELL,y*CELL,CELL,CELL);
       ctx.fillStyle='#fff';dots.forEach(d=>ctx.fillRect(d.x*CELL+8,d.y*CELL+8,4,4));
       ctx.fillStyle='#f5b942';ctx.beginPath();ctx.arc(player.x*CELL+CELL/2,player.y*CELL+CELL/2,8,0,Math.PI*2);ctx.fill();
       ctx.fillStyle='#ff3b3b';ctx.beginPath();ctx.arc(ghost.x*CELL+CELL/2,ghost.y*CELL+CELL/2,8,0,Math.PI*2);ctx.fill();}
     function eat(){const i=dots.findIndex(d=>d.x===player.x&&d.y===player.y);if(i>=0){dots.splice(i,1);score+=10;scoreEl.textContent=score;}if(!dots.length){stop();toast('Level clear!');}}
     function hit(){if(player.x===ghost.x&&player.y===ghost.y){stop();toast('Caught!');}}
     function move(dx,dy){if(!running)return;const nx=player.x+dx,ny=player.y+dy;if(!canMove(nx,ny))return;player.x=nx;player.y=ny;eat();hit();draw();}
     // [FIX] ghostMove: el fantasma tria la casella LLIURE que el ACOSTA al Pac-Man (greedy),
     // sense fer mitja volta constant i amb un 25% d'atzar per a no ser infal·lible.
     function ghostMove(){
       if(!running)return;
       const all=[[1,0],[-1,0],[0,1],[0,-1]];
       const noBack=all.filter(([dx,dy])=>!(dx===-lastGhost.dx&&dy===-lastGhost.dy));
       const valid=noBack.filter(([dx,dy])=>canMove(ghost.x+dx,ghost.y+dy));
       const pool=valid.length?valid:all.filter(([dx,dy])=>canMove(ghost.x+dx,ghost.y+dy));
       if(!pool.length)return;
       let best=pool[0],bestDist=Infinity;
       pool.forEach(([dx,dy])=>{const d=Math.abs((ghost.x+dx)-player.x)+Math.abs((ghost.y+dy)-player.y);if(d<bestDist){bestDist=d;best=[dx,dy];}});
       if(Math.random()<0.25)best=pool[Math.floor(Math.random()*pool.length)];
       ghost.x+=best[0];ghost.y+=best[1];lastGhost={dx:best[0],dy:best[1]};
       hit();draw();
     }
     function start(){stop();reset();running=true;draw();timer=setInterval(ghostMove,420);win.focus();}
     function stop(){if(timer)clearInterval(timer);timer=null;running=false;}
     function key(e){if(!running)return;if(e.key==='ArrowLeft'){e.preventDefault();move(-1,0);}if(e.key==='ArrowRight'){e.preventDefault();move(1,0);}if(e.key==='ArrowUp'){e.preventDefault();move(0,-1);}if(e.key==='ArrowDown'){e.preventDefault();move(0,1);}}
     win.tabIndex=0;win.addEventListener('keydown',key);cv.addEventListener('click',()=>win.focus());
     win.__cleanup=()=>{stop();win.removeEventListener('keydown',key);};   // [FIX] cleanup
     startBtn.addEventListener('click',start);reset();draw();
   }}
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
function runCommand(raw,print,openWin){const p=raw.split(' '),c=p[0],a=p.slice(1).join(' ');
  // switch selecciona una respuesta según la primera palabra escrita por el usuario.
  switch(c){case'':break;
    case'help':print('Comandos: <span class="ok">help whoami about projects skills contact clear date echo ls cat sudo secret matrix wallpaper tetris pacman coffee hello</span>');break;
    case'whoami':print('Josemi<br>DAM Student<br>Developer in progress.');break;
    case'about':print('Opening About Me...');openWin('about');break;
    case'projects':print('Opening Projects...');openWin('projects');break;
    case'skills':print('Opening Skills...');openWin('skills');break;
    case'contact':print('Opening Contact...');openWin('contact');break;
    case'clear':$('#term-out').innerHTML='';break;
    case'date':print(new Date().toString());break;
    case'echo':print(a||'');break;
    case'ls':print('about.txt  projects/  skills.json  contact.txt  secret/');break;
    case'cat':print(a==='about.txt'?'Estudiante de DAM. Aprendo creando. Me gusta el código limpio y el diseño sobrio.':`cat: ${a||'(no such file)'}: no such file or directory`);break;
    case'sudo':if(a.startsWith('rm -rf')){print('<span class="err">Nice try.</span>');break;}print('Permission granted.\nLaunching contact protocol...');openWin('contact');break;
    case'secret':print('<span class="ok">🔓 Easter egg unlocked.</span>');toast('Secret found.');break;
    // [FIX] 'matrix' ara activa el WALLPAPER persistent (no només l'efecte temporal).
    case'matrix':state.wp=4;applyTheme();save();print('<span class="ok">Matrix wallpaper ACTIVADO.</span> Escriu "wallpaper 0" per a eixir.');break;
    // [NOU] 'wallpaper' per a canviar el fons des de la terminal.
    case'wallpaper':if(a==='matrix'){state.wp=4;applyTheme();save();print('Matrix ON.');}else if(['0','1','2','3'].includes(a)){state.wp=+a;applyTheme();save();print('Wallpaper canviat.');}else print('Ús: wallpaper matrix|0|1|2|3');break;
    // [NOU] Obrir jocs des de la terminal.
    case'tetris':print('Obrint Tetris...');openWin('tetris');break;
    case'pacman':print('Obrint Pac-Man...');openWin('pacman');break;
    case'coffee':print('Compiling...\n☕ Coffee loaded successfully.');break;
    case'hello':print('Hello, human.');break;
    default:print(`<span class="err">command not found: ${c}</span>`);}}
// (Opcional) Efecte temporal de Matrix 5s, usat pel mode "matrix" del boot.
function matrixMode(){const c=document.createElement('canvas');Object.assign(c.style,{position:'fixed',inset:'0',zIndex:'9998',background:'#000',opacity:'.9'});
  document.body.appendChild(c);const x=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;
  const cols=Math.floor(c.width/16),drops=Array(cols).fill(0),ch='アイウエオ01JOSEMI<>/*';
  const iv=setInterval(()=>{x.fillStyle='rgba(0,0,0,.14)';x.fillRect(0,0,c.width,c.height);x.fillStyle='#4ade80';x.font='16px monospace';
    drops.forEach((y,i)=>{x.fillText(ch[Math.floor(Math.random()*ch.length)],i*16,y*16);if(y*16>c.height&&Math.random()>.975)drops[i]=0;drops[i]+=2;});},45);
  setTimeout(()=>{clearInterval(iv);c.remove();},5000);}

/* ========================================================= PROYECTOS */
const PROJECTS={
 java:{name:'Java Basics',desc:'Prácticas de POO en Java: clases, herencia, colecciones.',lang:'Java',db:'—',fw:'—',date:'2024',status:'done',tags:['Java','OOP']},
 web:{name:'JOSEMI OS',desc:'Este mismo portfolio-sistema. HTML/CSS/JS vanilla.',lang:'HTML/CSS/JS',db:'—',fw:'CSS Grid',date:'2025',status:'dev',tags:['Web','Vanilla JS']},
 exp:{name:'Experiments',desc:'Prototipos rápidos para aprender tecnologías nuevas.',lang:'Varios',db:'—',fw:'Varios',date:'2025',status:'exp',tags:['R&D']},
 school:{name:'School Projects',desc:'Trabajos de 1º DAM: bases de datos, apps, etc.',lang:'Java/SQL',db:'PostgreSQL',fw:'—',date:'2024',status:'done',tags:['DAM']}};
function openProject(k){const p=PROJECTS[k];if(!p)return;const id='proj-'+k;
  Apps[id]={title:p.name,icon:'📂',render:()=>`<div class="app-title">${p.name.toUpperCase()}</div><p class="bio">${p.desc}</p>
    <div class="proj">${p.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
    <dl class="kv"><dt>Language</dt><dd>${p.lang}</dd><dt>Database</dt><dd>${p.db}</dd><dt>Framework</dt><dd>${p.fw}</dd><dt>Date</dt><dd>${p.date}</dd></dl>
    <span class="status ${p.status}">${p.status==='done'?'COMPLETED':p.status==='dev'?'IN DEVELOPMENT':'EXPERIMENTAL'}</span>
    <div class="btn-row"><button class="btn btn--accent">VIEW PROJECT</button><button class="btn">VIEW SOURCE CODE</button></div>`};
  openWindow(id);}

/* ========================================================= BOOT */
const BOOTL=['Initializing kernel...','Loading user profile...','Loading projects...','Loading skills...','Starting interface...'];
async function boot(){const log=$('#boot__log');log.innerHTML='';$('#boot').classList.remove('out','hidden','glitch');
  for(const l of BOOTL){await sleep(380);log.innerHTML+=`<div><span class="ok">[ OK ]</span> ${l}</div>`;}
  await sleep(500);log.innerHTML+=`<div class="granted">ACCESS GRANTED</div>`;await sleep(700);
  $('#boot').classList.add('out');await sleep(500);$('#boot').classList.add('hidden');
  const sp=$('#splash'); sp.classList.remove('hidden');await sleep(1600);
  sp.classList.add('out');await sleep(500);sp.classList.add('hidden');
  $('#desktop').classList.remove('hidden');
  // [FIX] Ara sí: apliquem el tema DESPRÉS de mostrar el desktop => Matrix s'activa si wp=4.
  applyTheme();
  if(currentUser){
    (currentUser.auto||[]).forEach(a=>openWindow(a));
    if(currentUser.mode==='matrix') matrixMode();
    if(currentUser.mode==='dev') toast('Mode administrador activat.');
    toast('Benvingut, '+currentUser.nom+'.');
  }
}

/* ========================================================= ESCRITORIO */
// [FIX] Añadidos 'tetris' y 'pacman' perquè tinguen acces directe.
const ICONS=['about','projects','skills','terminal','readme','contact','trash','settings','system','tetris','pacman'];
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
    if(a==='refresh'){buildIcons();toast('Refreshed.');}
    // [FIX] array de noms ara inclou 'Matrix' (5 wallpapers).
    if(a==='wallpaper'){state.wp=(state.wp+1)%WALLS.length;applyTheme();save();toast('Wallpaper '+['Teal','Slate','Ocean','Steel','Matrix'][state.wp]);}
    if(a==='terminal')openWindow('terminal');if(a==='system')openWindow('system');});}
function shutdown(){const s=$('#shutdown');s.classList.remove('hidden');$('#shutdown__msg').textContent='Shutting down JOSEMI OS...';
  setTimeout(()=>{$('#shutdown__msg').textContent='It is now safe to close this tab.';$('#reboot').classList.remove('hidden');},1600);
  $('#reboot').onclick=()=>{s.classList.add('hidden');$('#reboot').classList.add('hidden');showLogin();};}
function buildKonami(){const s=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];let i=0;
  addEventListener('keydown',e=>{if(e.key===s[i])i++;else if(e.key===s[0])i=1;else i=0;if(i===s.length){toast('Developer Mode Enabled.');i=0;}});}

/* ========================================================= PERFILES
   Cada contraseña selecciona un perfil, su color y las aplicaciones permitidas.
   ========================================================= */
const USERS={
  // [FIX] 'tetris' i 'pacman' afegits a josemi i zoe => acces directe per a tu.
  "josemi":  {nom:"Josemi",  rol:"propietari",   color:"#6C63FF", apps:["about","projects","skills","terminal","readme","contact","trash","settings","system","tetris","pacman"], auto:[]},
  "invitado":{nom:"Invitado",rol:"convidat",     color:"#008080", apps:["about","contact"], auto:["about"]},
  "zoe":     {nom:"Zoe",     rol:"administrador",color:"#4ade80", apps:["about","projects","skills","terminal","readme","contact","trash","settings","system","tetris","pacman"], auto:["terminal"], mode:"dev"},
  "matrix":  {nom:"Agent",   rol:"despertar",    color:"#4ade80", apps:["about","terminal"], auto:["terminal"], mode:"matrix"}
};
let currentUser=null;

/* ========================================================= LOGIN */
const ASCII_FX_DURATION=3600;
const clamp01=n=>Math.max(0,Math.min(1,n));
const easeOutCubic=n=>1-Math.pow(1-n,3);

// Devuelve un número estable entre 0 y 1 para cada coordenada. Parece aleatorio,
// pero siempre produce la misma película y evita que el dibujo parpadee sin control.
function asciiSeed(x,y,salt=0){return ((x*73+y*151+salt*199+x*y*17)%997)/997;}

// Produce un fotograma de texto. Cada carácter viaja desde una coordenada inicial
// hasta su posición definitiva, como hacen los motores de efectos de terminal.
function renderLoginFrame(text,kind,elapsed){
  if((kind==='computer'&&elapsed>=2180)||(kind==='logo'&&elapsed>=3300))return text;
  const rows=text.split('\n'),width=Math.max(...rows.map(row=>row.length)),height=rows.length;
  const canvas=Array.from({length:height},()=>Array(width).fill(' '));
  const noise='01#$%?+*:/\\';

  rows.forEach((row,y)=>[...row].forEach((char,x)=>{
    if(char===' ')return;
    const seed=asciiSeed(x,y,kind==='computer'?1:2);

    if(kind==='computer'){
      if(char==='0'||char==='1'){
        const age=elapsed-(720+seed*380);
        if(age<0)return;
        if(age<920){const symbol=noise[(Math.floor(age/48)+x*5+y*3)%noise.length];canvas[y][x]=symbol;}else canvas[y][x]=char;
        return;
      }
      const local=clamp01((elapsed-seed*320)/820);
      if(local<=0)return;
      const side=Math.floor(seed*4),sx=side===0?0:side===1?width-1:Math.floor(seed*width);
      const sy=side===2?0:side===3?height-1:Math.floor(asciiSeed(x,y,8)*height);
      const ease=easeOutCubic(local);
      const px=Math.round(sx+(x-sx)*ease),py=Math.round(sy+(y-sy)*ease);
      canvas[py][px]=local<.72?noise[(x+y+Math.floor(elapsed/55))%noise.length]:char;
      return;
    }

    const local=clamp01((elapsed-(2180+seed*260))/820);
    if(local<=0)return;
    if(local>=1){canvas[y][x]=char;return;}
    const sx=Math.floor(asciiSeed(x,y,4)*width),sy=Math.floor(asciiSeed(x,y,9)*height);
    const ease=easeOutCubic(local),px=Math.round(sx+(x-sx)*ease),py=Math.round(sy+(y-sy)*ease);
    canvas[py][px]=local>.78?char:noise[(x*3+y+Math.floor(elapsed/50))%noise.length];
  }));

  if(kind==='computer'&&elapsed>1760&&elapsed<2180){
    const band=Math.floor((elapsed-1760)/70)%Math.max(1,height-4)+2;
    for(let y=band;y<Math.min(height,band+2);y++){
      const shift=y%2?2:-2,row=canvas[y].slice();
      canvas[y].fill(' ');
      row.forEach((char,x)=>{const nx=x+shift;if(nx>=0&&nx<width)canvas[y][nx]=char;});
    }
  }
  return canvas.map(row=>row.join('')).join('\n');
}

function typeLoginArt(){
  const login=$('#login'),status=$('#loginSequenceText'),bar=$('#loginSequenceBar');
  login.classList.remove('ascii-ready');login.classList.add('ascii-intro');

  const parts=$$('.login__computer,.login__ascii').map(el=>{
    const text=el.textContent,spacer=document.createElement('span'),ink=document.createElement('span');
    spacer.textContent=text;spacer.className='ascii-spacer';spacer.setAttribute('aria-hidden','true');
    ink.className='ascii-ink';ink.setAttribute('aria-hidden','true');
    el.classList.add('ascii-typing');el.replaceChildren(spacer,ink);
    return {el,text,ink,kind:el.classList.contains('login__computer')?'computer':'logo'};
  });
  const started=performance.now();
  function finish(){
    for(const part of parts){part.el.textContent=part.text;part.el.classList.remove('ascii-typing');}
    login.classList.remove('ascii-intro','ascii-pulse','ascii-glitch');login.classList.add('ascii-ready');
    status.textContent='[ ACCESS TERMINAL READY ]';bar.textContent='[########################] 100%';
    setTimeout(()=>$('#loginPass').focus(),180);
  }
  function frame(now){
    const elapsed=now-started,progress=clamp01(elapsed/ASCII_FX_DURATION);
    if(elapsed>=ASCII_FX_DURATION||login.classList.contains('out')||login.classList.contains('hidden')){finish();return;}
    for(const part of parts)part.ink.textContent=renderLoginFrame(part.text,part.kind,elapsed);

    login.classList.toggle('ascii-pulse',elapsed>1320&&elapsed<1710||elapsed>3020&&elapsed<3300);
    login.classList.toggle('ascii-glitch',elapsed>1760&&elapsed<2180&&Math.floor(elapsed/70)%2===0);
    status.textContent=elapsed<650?'> WAKE SIGNAL RECEIVED_':elapsed<1320?'> BUILDING ASCII DISPLAY...':elapsed<2180?'> DECRYPTING BINARY CORE...':elapsed<3100?'> LOADING JOSEMI_OS...':'> VERIFYING ACCESS TERMINAL...';
    const filled=Math.round(progress*24);
    bar.textContent=`[${'#'.repeat(filled)}${'.'.repeat(24-filled)}] ${String(Math.round(progress*100)).padStart(3,' ')}%`;
    requestAnimationFrame(frame);
  }
  for(const part of parts)part.ink.textContent=renderLoginFrame(part.text,part.kind,0);
  requestAnimationFrame(frame);
}
function showLogin(){const l=$('#login');l.classList.remove('hidden','out');
  $('#loginPass').value='';$('#loginErr').textContent='';$('#loginGo').disabled=true;typeLoginArt();}
function initLogin(){
  const login=$('#login'),pass=$('#loginPass'),go=$('#loginGo'),eye=$('#loginEye'),err=$('#loginErr');
  pass.addEventListener('input',()=>{go.disabled=pass.value.length===0;});
  eye.addEventListener('click',()=>{const show=pass.type==='password';pass.type=show?'text':'password';eye.textContent=show?'[-]':'[*]';eye.setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña');});
  $('#loginForm').addEventListener('submit',e=>{e.preventDefault();
    const u=USERS[pass.value];
    if(!u){login.classList.remove('shake');void login.offsetWidth;login.classList.add('shake');
      err.textContent='Contrasenya incorrecta.';pass.select();beep();return;}
    currentUser=u;
    document.documentElement.style.setProperty('--accent',u.color);
    $('.menu__head strong').textContent=u.nom;
    $('.menu__head small').textContent=u.rol;
    buildIcons();buildMenu();
    beep();
    login.classList.add('out');setTimeout(()=>login.classList.add('hidden'),600);
    boot();
  });
  // El foco se asigna al terminar la animación para que el cursor no distraiga antes.
}

/* ========================================================= INICIO */
buildIcons();buildMenu();buildClock();buildParallax();buildCursor();buildStart();buildContext();buildKonami();initLogin();typeLoginArt();