/* =========================================================
   JOSEMI OS · v1.2 (Windows 95)
   WM = motor de ventanas. Apps = contenido plug-in.
   ========================================================= */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms)), pad=n=>String(n).padStart(2,'0');

/* --- Estado persistente --- */
const DEF={accent:'#6C63FF',bg:'#050505',wp:0,sound:true,motion:false};
let state=Object.assign({},DEF);
try{ state=Object.assign(state, JSON.parse(localStorage.getItem('josemi-os')||'{}')); }catch(e){}
const save=()=>{ try{ localStorage.setItem('josemi-os',JSON.stringify(state)); }catch(e){} };

/* --- Wallpapers (tonos planos estilo Win95) --- */
const WALLS=['#008080','#006666','#004040','#0080a0'];
function applyTheme(){
  document.documentElement.style.setProperty('--accent',state.accent);
  document.documentElement.style.setProperty('--bg',state.bg);
  $('#bg').style.background=WALLS[state.wp];
  document.body.classList.toggle('reduce-motion',state.motion);
}
applyTheme();

/* --- Sonido Win95 "ding" (Web Audio, sin archivos) --- */
let AC;
function beep(){
  if(!state.sound)return;
  try{
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
function toast(m){const t=document.createElement('div');t.className='toast';t.textContent=m;$('#toasts').appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transform='translateX(20px)';t.style.transition='.3s';},2600);setTimeout(()=>t.remove(),3000);}

/* ========================================================= APPS */
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
     <a class="clink" href="mailto:josemidev1@gmail.com.com"><span class="g">✉️</span> tu_email@ejemplo.com</a>
   </div><button class="btn btn--accent" id="copy-email">COPY EMAIL</button></div>`,
   bind(b){$('#copy-email',b).addEventListener('click',async()=>{try{await navigator.clipboard.writeText('tu_email@ejemplo.com');toast('Copied to clipboard.');}catch{toast('No clipboard access.');}});}},

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
     ${WALLS.map((w,i)=>`<span class="wp ${i===state.wp?'on':''}" data-w="${i}" style="background:${w}"></span>`).join('')}</div></div>`,
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

 motivation:{title:'motivation.exe',icon:'💡',render:()=>`<div style="text-align:center;padding:2rem 1rem"><div style="font-size:2.5rem">💡</div><p style="font-family:var(--font-mono);margin-top:1rem;line-height:1.8">Keep building.<br>You are closer than you think.</p></div>`}
};
function bar(n,v){return `<div class="res"><div class="res__top"><span>${n}</span><span>${v}%</span></div><div class="bar"><i data-w="${v}"></i></div></div>`;}

/* ========================================================= WINDOW MANAGER */
const WM=(()=>{let z=10,open=new Map(),x=40,y=30;
  const nextPos=()=>{x+=28;y+=28;if(x>200)x=40;if(y>160)y=30;return{x,y};};
  function focus(win){win.style.zIndex=++z;$$('.tb-app').forEach(t=>t.classList.remove('active'));
    const c=$(`.tb-app[data-id="${win.dataset.id}"]`);if(c){c.classList.add('active');c.classList.remove('dim');}}
  function openWindow(id){const app=Apps[id];if(!app)return;
    if(open.has(id)){const o=open.get(id);if(o.minimized){o.el.classList.remove('minimized');o.minimized=false;}focus(o.el);beep();return o.el;}
    const p=nextPos(),win=document.createElement('section');win.className='window';win.dataset.id=id;
    win.style.left=p.x+'px';win.style.top=p.y+'px';win.style.zIndex=++z;
    win.innerHTML=`<div class="win__bar"><div class="win__title"><span class="t-ico">${app.icon}</span> ${app.title}</div>
      <div class="win__btns"><button class="win-btn min"></button><button class="win-btn max"></button><button class="win-btn close"></button></div></div>
      <div class="win__body"></div><div class="win__resize"></div>`;
    $('#desktop').appendChild(win);$('.win__body',win).innerHTML=app.render();if(app.bind)app.bind($('.win__body',win),win);
    requestAnimationFrame(()=>win.classList.add('open'));
    $('.close',win).onclick=()=>closeWindow(id);
    $('.min',win).onclick=()=>{win.classList.add('minimized');open.get(id).minimized=true;const c=$(`.tb-app[data-id="${id}"]`);if(c)c.classList.add('dim');beep();};
    $('.max',win).onclick=()=>win.classList.toggle('maximized');
    win.addEventListener('pointerdown',()=>focus(win));
    drag(win,$('.win__bar',win));resize(win,$('.win__resize',win));addChip(id,app);
    open.set(id,{el:win,minimized:false});beep();return win;}
  function closeWindow(id){const o=open.get(id);if(!o)return;o.el.classList.remove('open');setTimeout(()=>o.el.remove(),220);open.delete(id);
    const c=$(`.tb-app[data-id="${id}"]`);if(c)c.remove();beep();}
  function addChip(id,app){const b=document.createElement('button');b.className='tb-app active';b.dataset.id=id;
    b.innerHTML=`<span>${app.icon}</span> <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${app.title}</span>`;
    b.onclick=()=>{const o=open.get(id);if(!o)return;if(o.minimized){o.el.classList.remove('minimized');o.minimized=false;focus(o.el);}
      else if(o.el.style.zIndex==z){o.el.classList.add('minimized');o.minimized=true;b.classList.add('dim');}else focus(o.el);};
    $('#taskbar__apps').appendChild(b);}
  function drag(win,h){h.addEventListener('pointerdown',e=>{if(e.target.closest('.win-btn'))return;if(win.classList.contains('maximized'))return;
    focus(win);const sx=e.clientX,sy=e.clientY,ox=win.offsetLeft,oy=win.offsetTop;
    const mv=ev=>{let nx=Math.max(0,Math.min(ox+ev.clientX-sx,innerWidth-120)),ny=Math.max(0,Math.min(oy+ev.clientY-sy,innerHeight-120));win.style.left=nx+'px';win.style.top=ny+'px';};
    const up=()=>{document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);};
    document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);});}
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
  switch(c){case'':break;
    case'help':print('Comandos: <span class="ok">help whoami about projects skills contact clear date echo ls cat sudo secret matrix coffee hello</span>');break;
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
    case'matrix':print('<span class="ok">Entering the Matrix...</span>');matrixMode();break;
    case'coffee':print('Compiling...\n☕ Coffee loaded successfully.');break;
    case'hello':print('Hello, human.');break;
    default:print(`<span class="err">command not found: ${c}</span>`);}}
function matrixMode(){const c=document.createElement('canvas');Object.assign(c.style,{position:'fixed',inset:'0',zIndex:'9998',background:'#000',opacity:'.9'});
  document.body.appendChild(c);const x=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;
  const cols=Math.floor(c.width/16),drops=Array(cols).fill(0),ch='アイウエオ01JOSEMI<>/*';
  const iv=setInterval(()=>{x.fillStyle='rgba(0,0,0,.06)';x.fillRect(0,0,c.width,c.height);x.fillStyle='#4ade80';x.font='14px monospace';
    drops.forEach((y,i)=>{x.fillText(ch[Math.floor(Math.random()*ch.length)],i*16,y*16);if(y*16>c.height&&Math.random()>.975)drops[i]=0;drops[i]++;});},45);
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
  if(currentUser){
    (currentUser.auto||[]).forEach(a=>openWindow(a));
    if(currentUser.mode==='matrix') matrixMode();
    if(currentUser.mode==='dev') toast('Mode administrador activat.');
    toast('Benvingut, '+currentUser.nom+'.');
  }
}

/* ========================================================= ESCRITORIO */
const ICONS=['about','projects','skills','terminal','readme','contact','trash','settings','system'];
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
function buildParallax(){const bg=$('#bg');addEventListener('mousemove',e=>{bg.style.transform=`translate(${(e.clientX/innerWidth-.5)*30}px,${(e.clientY/innerHeight-.5)*30}px)`;});}
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
    if(a==='refresh'){buildIcons();toast('Refreshed.');}if(a==='wallpaper'){state.wp=(state.wp+1)%WALLS.length;applyTheme();save();toast('Wallpaper '+['Teal','Slate','Ocean','Steel'][state.wp]);}
    if(a==='terminal')openWindow('terminal');if(a==='system')openWindow('system');});}
function shutdown(){const s=$('#shutdown');s.classList.remove('hidden');$('#shutdown__msg').textContent='Shutting down JOSEMI OS...';
  setTimeout(()=>{$('#shutdown__msg').textContent='It is now safe to close this tab.';$('#reboot').classList.remove('hidden');},1600);
  $('#reboot').onclick=()=>{s.classList.add('hidden');$('#reboot').classList.add('hidden');showLogin();};}
function buildKonami(){const s=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];let i=0;
  addEventListener('keydown',e=>{if(e.key===s[i])i++;else if(e.key===s[0])i=1;else i=0;if(i===s.length){toast('Developer Mode Enabled.');i=0;}});}

/* ========================================================= MULTIUSUARI */
const USERS={
  "josemi":  {nom:"Josemi",  rol:"propietari",   color:"#6C63FF", apps:["about","projects","skills","terminal","readme","contact","trash","settings","system"], auto:[]},
  "invitado":{nom:"Invitado",rol:"convidat",     color:"#008080", apps:["about","contact"], auto:["about"]},
  "zoe":     {nom:"Zoe",     rol:"administrador",color:"#4ade80", apps:["about","projects","skills","terminal","readme","contact","trash","settings","system"], auto:["terminal"], mode:"dev"},
  "matrix":  {nom:"Agent",   rol:"despertar",    color:"#4ade80", apps:["about","terminal"], auto:["terminal"], mode:"matrix"}
};
let currentUser=null;

function showLogin(){const l=$('#login');l.classList.remove('hidden','out');
  $('#loginPass').value='';$('#loginErr').textContent='';$('#loginGo').disabled=true;setTimeout(()=>$('#loginPass').focus(),250);}

function initLogin(){
  const login=$('#login'),pass=$('#loginPass'),go=$('#loginGo'),eye=$('#loginEye'),err=$('#loginErr');
  pass.addEventListener('input',()=>{go.disabled=pass.value.length===0;});
  eye.addEventListener('click',()=>{const show=pass.type==='password';pass.type=show?'text':'password';eye.textContent=show?'🙈':'👁';});
  $('#loginForm').addEventListener('submit',e=>{e.preventDefault();
    const u=USERS[pass.value];
    if(!u){login.classList.remove('shake');void login.offsetWidth;login.classList.add('shake');
      err.textContent='Contrasenya incorrecta.';pass.select();beep();return;}
    currentUser=u;
    document.documentElement.style.setProperty('--accent',u.color);
    $('.menu__head strong').textContent=u.nom;
    $('.login__user').textContent=u.nom;
    $('.login__avatar').textContent=u.nom[0].toUpperCase();
    beep();
    login.classList.add('out');setTimeout(()=>login.classList.add('hidden'),600);
    boot();
  });
  setTimeout(()=>pass.focus(),300);
}

/* ========================================================= INICIO */
buildIcons();buildMenu();buildClock();buildParallax();buildCursor();buildStart();buildContext();buildKonami();initLogin();