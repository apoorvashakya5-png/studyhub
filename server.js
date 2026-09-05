const express=require("express");
const session=require("express-session");
const bcrypt=require("bcryptjs");
const Database=require("better-sqlite3");
const path=require("path");

const app=express(), PORT=process.env.PORT||3000;
const db=new Database("studyhub.db");
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tasks(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 text TEXT NOT NULL,
 done INTEGER DEFAULT 0,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS notes(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 title TEXT NOT NULL,
 content TEXT NOT NULL,
 updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(user_id,title),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS quiz_results(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 score INTEGER NOT NULL,
 total INTEGER NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);
app.use(express.json({limit:"200kb"}));
app.use(session({
 secret:process.env.SESSION_SECRET||"change-this-secret-before-deploying",
 resave:false,saveUninitialized:false,
 cookie:{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:7*24*60*60*1000}
}));
app.use(express.static(path.join(__dirname,"public")));

function auth(req,res,next){if(!req.session.userId)return res.status(401).json({error:"Please login"});next();}
function cleanEmail(e){return String(e||"").trim().toLowerCase();}

app.post("/api/register",async(req,res)=>{
 const name=String(req.body.name||"").trim(),email=cleanEmail(req.body.email),password=String(req.body.password||"");
 if(name.length<2||!email.includes("@")||password.length<6)return res.status(400).json({error:"Name, valid email and password of at least 6 characters are required."});
 try{
  const hash=await bcrypt.hash(password,12);
  const info=db.prepare("INSERT INTO users(name,email,password_hash) VALUES(?,?,?)").run(name,email,hash);
  req.session.userId=info.lastInsertRowid;
  res.json({user:{name,email}});
 }catch(e){res.status(409).json({error:"An account with that email already exists."});}
});
app.post("/api/login",async(req,res)=>{
 const email=cleanEmail(req.body.email),password=String(req.body.password||"");
 const u=db.prepare("SELECT * FROM users WHERE email=?").get(email);
 if(!u||!(await bcrypt.compare(password,u.password_hash)))return res.status(401).json({error:"Invalid email or password."});
 req.session.userId=u.id;res.json({user:{name:u.name,email:u.email}});
});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/me",(req,res)=>{
 if(!req.session.userId)return res.json({user:null});
 const u=db.prepare("SELECT name,email FROM users WHERE id=?").get(req.session.userId);
 res.json({user:u||null});
});

app.get("/api/tasks",auth,(req,res)=>res.json(db.prepare("SELECT id,text,done FROM tasks WHERE user_id=? ORDER BY id DESC").all(req.session.userId)));
app.post("/api/tasks",auth,(req,res)=>{
 const text=String(req.body.text||"").trim();if(!text)return res.status(400).json({error:"Task is empty"});
 const x=db.prepare("INSERT INTO tasks(user_id,text) VALUES(?,?)").run(req.session.userId,text);
 res.json({id:x.lastInsertRowid,text,done:0});
});
app.patch("/api/tasks/:id",auth,(req,res)=>{
 const done=req.body.done?1:0;
 db.prepare("UPDATE tasks SET done=? WHERE id=? AND user_id=?").run(done,req.params.id,req.session.userId);
 res.json({ok:true});
});
app.delete("/api/tasks/:id",auth,(req,res)=>{
 db.prepare("DELETE FROM tasks WHERE id=? AND user_id=?").run(req.params.id,req.session.userId);res.json({ok:true});
});

app.get("/api/notes",auth,(req,res)=>res.json(db.prepare("SELECT id,title,content,updated_at FROM notes WHERE user_id=? ORDER BY updated_at DESC").all(req.session.userId)));
app.post("/api/notes",auth,(req,res)=>{
 const title=String(req.body.title||"").trim(),content=String(req.body.content||"");
 if(!title)return res.status(400).json({error:"Note title is required"});
 db.prepare(`INSERT INTO notes(user_id,title,content,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP)
 ON CONFLICT(user_id,title) DO UPDATE SET content=excluded.content,updated_at=CURRENT_TIMESTAMP`)
 .run(req.session.userId,title,content);
 res.json({ok:true});
});
app.delete("/api/notes/:id",auth,(req,res)=>{
 db.prepare("DELETE FROM notes WHERE id=? AND user_id=?").run(req.params.id,req.session.userId);res.json({ok:true});
});
app.post("/api/quiz-results",auth,(req,res)=>{
 const score=Number(req.body.score),total=Number(req.body.total);
 if(!Number.isInteger(score)||!Number.isInteger(total)||score<0||total<1||score>total)return res.status(400).json({error:"Invalid result"});
 db.prepare("INSERT INTO quiz_results(user_id,score,total) VALUES(?,?,?)").run(req.session.userId,score,total);res.json({ok:true});
});
app.get("/api/progress",auth,(req,res)=>{
 const tasks=db.prepare("SELECT COUNT(*) c FROM tasks WHERE user_id=? AND done=1").get(req.session.userId).c;
 const totalTasks=db.prepare("SELECT COUNT(*) c FROM tasks WHERE user_id=?").get(req.session.userId).c;
 const quizzes=db.prepare("SELECT COUNT(*) c,COALESCE(SUM(score),0) s,COALESCE(SUM(total),0) t FROM quiz_results WHERE user_id=?").get(req.session.userId);
 res.json({tasks,totalTasks,quizzes});
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`StudyHub running on port ${PORT}`));