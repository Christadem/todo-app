var filter="all",editing=null,root=document.documentElement;
var C={1:"var(--high)",2:"var(--med)",3:"var(--low)"},N={1:"High",2:"Medium",3:"Low"};
function load(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
var tasks=[],theme=load("todo-theme",null),$=function(i){return document.getElementById(i)};
function isDark(){return theme?theme==="dark":window.matchMedia("(prefers-color-scheme:dark)").matches}
function applyTheme(){if(theme)root.setAttribute("data-theme",theme);$("mode").textContent=isDark()?"☀️":"🌙"}
$("mode").onclick=function(){theme=isDark()?"light":"dark";save("todo-theme",theme);applyTheme()};
function pad(n){return String(n).padStart(2,"0")}
function dueDT(t){return t.due?new Date(t.due+"T"+(t.time||"09:00")):null}
function fmtT(ms){var s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return(h?h+":"+pad(m):m)+":"+pad(s%60)}
function spent(t){return(t.spent||0)+(t.run?Date.now()-t.run:0)}
var sb=null,last={},uid=null;
function row(t){return{id:t.id,"text":t.text,p:t.p,cat:t.cat||"",due:t.due||null,"time":t.time||"",rem:t.rem==null?-1:t.rem,done:!!t.done,fired:!!t.fired,spent:Math.round(t.spent||0),run:t.run||0}}
function unrow(r){return{id:+r.id,text:r.text,p:r.p,cat:r.cat,due:r.due||"",time:r.time,rem:r.rem,done:r.done,fired:r.fired,spent:+r.spent,run:+r.run}}
async function sync(){
  if(!sb||!uid)return;
  var up=[],ids={};
  tasks.forEach(function(t){var r=row(t),j=JSON.stringify(r);ids[t.id]=1;if(last[t.id]!==j){up.push(r);last[t.id]=j}});
  var del=Object.keys(last).filter(function(i){return!ids[i]});
  del.forEach(function(i){delete last[i]});
  try{
    if(up.length){var x=await sb.from("todos").upsert(up);if(x.error)throw x.error}
    if(del.length){var y=await sb.from("todos").delete().in("id",del);if(y.error)throw y.error}
    $("sync").textContent="☁️ Saved";
  }catch(e){up.forEach(function(r){delete last[r.id]});$("sync").textContent="⚠️ Not saved"}
}
function persist(){render();sync()}
async function loadTasks(){
  if(editing!==null)return;
  var r=await sb.from("todos").select("*");
  if(r.error){$("sync").textContent="⚠️ Load failed";return}
  tasks=r.data.map(unrow);last={};tasks.forEach(function(t){last[t.id]=JSON.stringify(row(t))});
  $("sync").textContent="☁️ Saved";render();checkReminders();
}
function showApp(on){$("auth").style.display=on?"none":"flex";$("app").style.display=on?"block":"none"}
async function authGo(signup){
  var e=$("em").value.trim(),p=$("pw").value,m=$("amsg");m.textContent="…";
  var r=signup?await sb.auth.signUp({email:e,password:p}):await sb.auth.signInWithPassword({email:e,password:p});
  if(r.error)m.textContent=r.error.message;
  else if(signup&&!r.data.session)m.textContent="Check your email to confirm, then sign in.";
  else m.textContent="";
}
function start(){
  applyTheme();
  var c=window.APP_CONFIG||{};
  $("si").onclick=function(){authGo(false)};$("su").onclick=function(){authGo(true)};
  showApp(false);
  if(!window.supabase||!c.SUPABASE_URL||c.SUPABASE_URL.indexOf("YOUR")>-1){$("amsg").textContent="Add your Supabase URL and key in config.js (see README).";return}
  sb=supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY);
  $("out").onclick=function(){sb.auth.signOut()};
  sb.auth.onAuthStateChange(function(ev,s){
    if(s&&s.user){if(uid!==s.user.id){uid=s.user.id;showApp(true);setTimeout(loadTasks,0)}}
    else{uid=null;tasks=[];last={};showApp(false);render()}
  });
  document.addEventListener("visibilitychange",function(){if(!document.hidden&&uid)loadTasks()});
}
/* reminders */
function beep(){try{var a=new(window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator();o.connect(a.destination);o.frequency.value=880;o.start();setTimeout(function(){o.stop()},250)}catch(e){}}
function toast(msg){var d=document.createElement("div");d.className="toast";d.innerHTML="<span></span><button>OK</button>";d.firstChild.textContent="⏰ "+msg;d.lastChild.onclick=function(){d.remove()};$("toasts").appendChild(d);beep()}
$("bell").onclick=function(){try{Notification.requestPermission().then(function(p){toast(p==="granted"?"Notifications on":"Notifications blocked — in-app alerts still work")})}catch(e){toast("Notifications unsupported — in-app alerts still work")}};
function checkReminders(){
  var now=Date.now(),ch=false;
  tasks.forEach(function(t){
    var dt=dueDT(t);
    if(t.done||t.fired||!dt||t.rem==null||t.rem<0)return;
    if(now>=dt.getTime()-t.rem*60000){
      t.fired=true;ch=true;
      var msg=t.text+(t.rem>0?" — due soon":" — due now");
      toast(msg);
      try{if(Notification.permission==="granted")new Notification("Task reminder",{body:msg})}catch(e){}
    }
  });
  if(ch)persist();
}
/* render */
function render(){
  var l=$("list");l.innerHTML="";var q=$("q").value.toLowerCase(),s=$("s").value,fc=$("fc").value,now=new Date();
  var cats=[];tasks.forEach(function(t){if(t.cat&&cats.indexOf(t.cat)<0)cats.push(t.cat)});cats.sort();
  $("cats").innerHTML=cats.map(function(c){return"<option value=\""+c.replace(/"/g,"&quot;")+"\">"}).join("");
  var sel=$("fc"),cur=sel.value;sel.innerHTML="";
  var o=new Option("All categories","");sel.add(o);cats.forEach(function(c){sel.add(new Option(c,c))});sel.value=cats.indexOf(cur)>-1?cur:"";fc=sel.value;
  var v=tasks.filter(function(t){return(filter==="all"||(filter==="done")===t.done)&&t.text.toLowerCase().indexOf(q)>-1&&(!fc||t.cat===fc)});
  v.sort(function(a,b){
    if(a.done!==b.done)return a.done-b.done;
    if(s==="d"){var x=dueDT(a),y=dueDT(b);x=x?x.getTime():9e15;y=y?y.getTime():9e15;return x-y||a.p-b.p}
    if(s==="n")return b.id-a.id;
    return a.p-b.p||a.id-b.id});
  var done=tasks.filter(function(t){return t.done}).length;
  $("count").firstChild.textContent=(tasks.length-done)+" remaining · "+done+" done";
  $("bar").style.width=(tasks.length?done/tasks.length*100:0)+"%";
  $("clr").style.visibility=done?"visible":"hidden";
  if(!v.length)l.innerHTML='<div class="empty">Nothing here yet.</div>';
  v.forEach(function(t){
    var li=document.createElement("li");li.style.setProperty("--c",C[t.p]);if(t.done)li.className="done";
    var cb=document.createElement("input");cb.type="checkbox";cb.checked=t.done;
    cb.onchange=function(){t.done=cb.checked;if(t.done&&t.run){t.spent=spent(t);t.run=0}persist()};
    var body=document.createElement("div");body.className="body";
    if(editing===t.id){
      var ed=document.createElement("input");ed.className="edit";ed.value=t.text;
      var fin=function(){if(editing===t.id){if(ed.value.trim())t.text=ed.value.trim();editing=null;persist()}};
      ed.onkeydown=function(e){if(e.key==="Enter")fin();if(e.key==="Escape"){editing=null;render()}};
      ed.onblur=fin;body.appendChild(ed);setTimeout(function(){ed.focus()},0);
    }else{var tx=document.createElement("div");tx.className="tx";tx.textContent=t.text;body.appendChild(tx)}
    var m=document.createElement("div");m.className="meta";
    var b=document.createElement("span");b.className="badge";b.textContent=N[t.p];m.appendChild(b);
    if(t.cat){var ch=document.createElement("span");ch.className="chip";ch.textContent="# "+t.cat;m.appendChild(ch)}
    var dt=dueDT(t);
    if(dt){var du=document.createElement("span"),label=t.due+(t.time?" "+t.time:"");
      var sameDay=dt.toDateString()===now.toDateString();
      if(!t.done&&(t.time?dt<now:dt<new Date(now.getFullYear(),now.getMonth(),now.getDate()))){du.className="over";du.textContent="Overdue · "+label}
      else if(!t.done&&sameDay){du.className="today";du.textContent="Today"+(t.time?" "+t.time:"")}
      else du.textContent="Due "+label;
      m.appendChild(du)}
    if(t.rem!=null&&t.rem>=0&&dt){var rb=document.createElement("span");rb.textContent=t.fired?"🔕":"🔔";m.appendChild(rb)}
    var tm=document.createElement("span");tm.className="timer";tm.dataset.id=t.id;tm.textContent=spent(t)?"⏱ "+fmtT(spent(t)):"";m.appendChild(tm);
    body.appendChild(m);
    li.append(cb,body);
    if(!t.done){var pl=document.createElement("button");pl.className="ib";pl.textContent=t.run?"⏸":"▶";pl.setAttribute("aria-label","Start or pause timer");
      pl.onclick=function(){if(t.run){t.spent=spent(t);t.run=0}else t.run=Date.now();persist()};li.appendChild(pl)}
    var e=document.createElement("button");e.className="ib";e.textContent="✎";e.setAttribute("aria-label","Edit");e.onclick=function(){editing=t.id;render()};
    var d=document.createElement("button");d.className="ib";d.textContent="✕";d.setAttribute("aria-label","Delete");
    d.onclick=function(){tasks=tasks.filter(function(x){return x!==t});persist()};
    li.append(e,d);l.appendChild(li);
  });
}
$("f").onsubmit=function(e){
  e.preventDefault();
  tasks.push({id:Date.now(),text:$("t").value.trim(),p:+$("p").value,cat:$("c").value.trim(),due:$("d").value,time:$("h").value,rem:+$("r").value,done:false,spent:0,run:0});
  $("t").value="";$("d").value="";$("h").value="";$("c").value="";$("r").value="-1";persist();checkReminders();
};
$("clr").onclick=function(){tasks=tasks.filter(function(t){return!t.done});persist()};
$("q").oninput=render;$("s").onchange=render;$("fc").onchange=render;
$("tabs").onclick=function(e){
  if(!e.target.dataset.f)return;filter=e.target.dataset.f;
  [].forEach.call(this.children,function(b){b.classList.toggle("on",b===e.target)});render();
};
setInterval(function(){
  tasks.forEach(function(t){if(t.run){var el=document.querySelector('.timer[data-id="'+t.id+'"]');if(el)el.textContent="⏱ "+fmtT(spent(t))}});
},1000);
setInterval(checkReminders,15000);
start();
