const $=s=>document.querySelector(s);
async function api(url,opt={}){const r=await fetch(url,{headers:{"Content-Type":"application/json"},...opt});let d={};try{d=await r.json()}catch{}if(!r.ok)throw Error(d.error||"Something went wrong");return d}

let user=null;
async function load(){
 const m=await api("/api/me");user=m.user;updateAuth();
 if(user){$("#welcome").textContent=`Welcome, ${user.name}! Your data is synced to your account.`;await Promise.all([loadTasks(),loadNotes(),loadProgress()])}
}
function updateAuth(){$("#authBtn").textContent=user?"Logout":"Login"}
$("#authBtn").onclick=async()=>{if(user){await api("/api/logout",{method:"POST"});location.reload()}else openModal()}
function openModal(){ $("#modal").style.display="flex";$("#authMsg").textContent=""}
$("#close").onclick=()=>$("#modal").style.display="none";
$("#showRegister").onclick=()=>{$("#loginView").hidden=true;$("#registerView").hidden=false}
$("#showLogin").onclick=()=>{$("#registerView").hidden=true;$("#loginView").hidden=false}
$("#login").onclick=async()=>{try{const d=await api("/api/login",{method:"POST",body:JSON.stringify({email:$("#lemail").value,password:$("#lpass").value})});user=d.user;$("#modal").style.display="none";updateAuth();await Promise.all([loadTasks(),loadNotes(),loadProgress()])}catch(e){$("#authMsg").textContent=e.message}}
$("#register").onclick=async()=>{try{const d=await api("/api/register",{method:"POST",body:JSON.stringify({name:$("#rname").value,email:$("#remail").value,password:$("#rpass").value})});user=d.user;$("#modal").style.display="none";updateAuth();await Promise.all([loadTasks(),loadNotes(),loadProgress()])}catch(e){$("#authMsg").textContent=e.message}}

async function loadTasks(){const data=await api("/api/tasks");$("#tasks").innerHTML="";data.forEach(t=>{const li=document.createElement("li");li.innerHTML=`<label><input type="checkbox" ${t.done?"checked":""}> ${esc(t.text)}</label><button>✕</button>`;li.querySelector("input").onchange=async e=>{await api("/api/tasks/"+t.id,{method:"PATCH",body:JSON.stringify({done:e.target.checked})});loadProgress()};li.querySelector("button").onclick=async()=>{await api("/api/tasks/"+t.id,{method:"DELETE"});loadTasks();loadProgress()};$("#tasks").appendChild(li)})}
$("#addTask").onclick=async()=>{if(!user)return openModal();let text=$("#taskText").value.trim();if(text){await api("/api/tasks",{method:"POST",body:JSON.stringify({text})});$("#taskText").value="";loadTasks();loadProgress()}}
async function loadNotes(){const data=await api("/api/notes");$("#notes").innerHTML="";data.forEach(n=>{const li=document.createElement("li");li.innerHTML=`<span><b>${esc(n.title)}</b><br>${esc(n.content).slice(0,80)}</span><button>✕</button>`;li.querySelector("button").onclick=async()=>{await api("/api/notes/"+n.id,{method:"DELETE"});loadNotes()};$("#notes").appendChild(li)})}
$("#saveNote").onclick=async()=>{if(!user)return openModal();await api("/api/notes",{method:"POST",body:JSON.stringify({title:$("#noteTitle").value,content:$("#noteContent").value})});$("#noteTitle").value="";$("#noteContent").value="";loadNotes()}
async function loadProgress(){if(!user)return;const p=await api("/api/progress");const done=p.tasks,total=p.totalTasks;const quizTotal=p.quizzes.t,quizScore=p.quizzes.s;let percent=total?Math.round(done/total*100):0;$("#progress").textContent=percent+"%";$("#progressBar").style.width=percent+"%"}

function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

// Timer
let sec=1500,int=null;function draw(){let m=String(Math.floor(sec/60)).padStart(2,"0"),s=String(sec%60).padStart(2,"0");$("#timer").textContent=m+":"+s}
$("#go").onclick=()=>{if(int)return;int=setInterval(()=>{if(sec){sec--;draw()}else{clearInterval(int);int=null;alert("Focus session complete! 🎉")}},1000)}
$("#pause").onclick=()=>{clearInterval(int);int=null};$("#reset").onclick=()=>{clearInterval(int);int=null;sec=1500;draw()};draw();

// Quiz
const qs=[["Which language structures a web page?",["HTML","CSS","SQL","Python"],0],["Which CSS property changes text color?",["margin","display","color","padding"],2],["What does CPU stand for?",["Central Processing Unit","Computer Personal Unit","Control Program Utility","Central Print Unit"],0]];
let qi=0,sc=0,answered=false;
function showQ(){answered=false;$("#next").disabled=true;$("#qno").textContent=`Question ${qi+1} of ${qs.length}`;$("#question").textContent=qs[qi][0];$("#answers").innerHTML="";qs[qi][1].forEach((a,i)=>{let b=document.createElement("button");b.className="answer";b.textContent=a;b.onclick=()=>answer(i,b);$("#answers").appendChild(b)});$("#score").textContent=`Score: ${sc}/${qi}`}
function answer(i,b){if(answered)return;answered=true;let c=qs[qi][2];document.querySelectorAll(".answer").forEach((x,j)=>{if(j===c)x.classList.add("correct")});if(i===c){sc++;$("#quizMsg").textContent="Correct! 🎉"}else{b.classList.add("wrong");$("#quizMsg").textContent="Keep practicing! 💪"}$("#score").textContent=`Score: ${sc}/${qi+1}`;$("#next").disabled=false}
$("#next").onclick=async()=>{qi++;if(qi<qs.length)showQ();else{if(user)await api("/api/quiz-results",{method:"POST",body:JSON.stringify({score:sc,total:qs.length})});$("#question").textContent=`You scored ${sc}/${qs.length}!`;$("#answers").innerHTML="";$("#next").textContent="Restart";$("#next").onclick=()=>{qi=0;sc=0;$("#next").textContent="Next";$("#next").onclick=nextQuiz;showQ()}}};
async function nextQuiz(){qi++;if(qi<qs.length)showQ()}
showQ();
$("#startBtn").onclick=()=>document.querySelector("#subjects").scrollIntoView();
load();
