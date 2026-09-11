const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const CACHE_KEY="devclub-study-pro-v2-cache";

let data=JSON.parse(localStorage.getItem(CACHE_KEY)||'{"notes":[],"photos":[]}');
let currentUser=null;
let deferredPrompt=null;

// Cliente Supabase (usa as chaves definidas em supabase-config.js)
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);

function toast(t){const x=$("#toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2200)}
function setStatus(text,cls){$("#statusText").textContent=text;$(".status").className="status"+(cls?" "+cls:"")}

const titles={dashboard:"Dashboard",notes:"Anotações",photos:"Fotos & Prints"};
function openPage(id){$$(".page").forEach(p=>p.classList.remove("active"));$("#"+id).classList.add("active");$$(".nav").forEach(n=>n.classList.toggle("active",n.dataset.page===id));$("#title").textContent=titles[id];$(".sidebar").classList.remove("open");scrollTo({top:0,behavior:"smooth"})}
window.openPage=openPage;
$$(".nav").forEach(n=>n.onclick=()=>openPage(n.dataset.page));
$("#menuBtn").onclick=()=>$(".sidebar").classList.toggle("open");
$("#themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("devclub-theme",document.body.classList.contains("dark")?"dark":"light")};
if(localStorage.getItem("devclub-theme")==="dark")document.body.classList.add("dark");

/* ============================ AUTENTICAÇÃO ============================ */
const authOverlay=$("#authOverlay"), authMsg=$("#authMsg");
let authMode="login";

function switchAuthMode(m){
  authMode=m;
  $("#authTabLogin").classList.toggle("active",m==="login");
  $("#authTabSignup").classList.toggle("active",m==="signup");
  $("#authSubmit").textContent=m==="login"?"Entrar":"Criar conta";
  authMsg.textContent="";authMsg.className="auth-msg";
}
$("#authTabLogin").onclick=()=>switchAuthMode("login");
$("#authTabSignup").onclick=()=>switchAuthMode("signup");

function traduzErroAuth(m){
  if(/Invalid login credentials/i.test(m))return "E-mail ou senha incorretos.";
  if(/User already registered/i.test(m))return "Este e-mail já tem conta. Faça login.";
  if(/Password should be at least/i.test(m))return "A senha precisa ter pelo menos 6 caracteres.";
  if(/Email not confirmed/i.test(m))return "Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).";
  return "Erro: "+m;
}

$("#authForm").onsubmit=async e=>{
  e.preventDefault();
  const email=$("#authEmail").value.trim(), password=$("#authPassword").value;
  $("#authSubmit").disabled=true; authMsg.textContent="Aguarde..."; authMsg.className="auth-msg";
  try{
    if(authMode==="login"){
      const {error}=await sb.auth.signInWithPassword({email,password});
      if(error) throw error;
    }else{
      const {error}=await sb.auth.signUp({email,password});
      if(error) throw error;
      authMsg.textContent="Conta criada! Se for solicitado, confirme seu e-mail e depois faça login.";
      authMsg.className="auth-msg ok";
      $("#authSubmit").disabled=false;
      return;
    }
  }catch(err){
    authMsg.textContent=traduzErroAuth(err.message);
    authMsg.className="auth-msg error";
  }
  $("#authSubmit").disabled=false;
};
$("#logoutBtn").onclick=async()=>{await sb.auth.signOut();};

sb.auth.onAuthStateChange((_event,session)=>{
  if(session?.user){currentUser=session.user;onLogin();}
  else{currentUser=null;onLogout();}
});

async function onLogin(){
  authOverlay.classList.add("hidden");
  $("#userChip").textContent=currentUser.email;
  await loadCloudData();
}
function onLogout(){
  data={notes:[],photos:[]};
  $("#userChip").textContent="";
  switchAuthMode("login");
  authOverlay.classList.remove("hidden");
  render();
}

/* ======================= CARREGAR DADOS DA NUVEM ======================= */
async function loadCloudData(){
  setStatus("Sincronizando...","syncing");
  try{
    const nt=await sb.from("notes").select("*").order("created_at",{ascending:true});
    if(nt.error)throw nt.error;
    data.notes=nt.data.map(n=>({id:n.id,title:n.title,cat:n.category,text:n.content,date:new Date(n.created_at).getTime()}));
    data.photos=await loadPhotos();
    localStorage.setItem(CACHE_KEY,JSON.stringify(data));
    setStatus("Sincronizado ✓","");
  }catch(err){
    console.error(err);
    const cached=localStorage.getItem(CACHE_KEY);
    if(cached){data=JSON.parse(cached);setStatus("Modo offline (dados salvos localmente)","offline");}
    else setStatus("Erro ao conectar à nuvem","offline");
  }
  render();
}

async function loadPhotos(){
  const {data:files,error}=await sb.storage.from("photos").list(currentUser.id,{sortBy:{column:"created_at",order:"desc"}});
  if(error||!files)return [];
  const withUrls=await Promise.all(files.map(async f=>{
    const path=`${currentUser.id}/${f.name}`;
    const {data:signed}=await sb.storage.from("photos").createSignedUrl(path,3600);
    return {id:f.name,path,name:f.name,src:signed?.signedUrl||""};
  }));
  return withUrls;
}

/* ================================ NOTAS ================================ */
$("#newNoteBtn").onclick=()=>$("#noteForm").classList.remove("hidden");
$("#cancelNote").onclick=()=>$("#noteForm").classList.add("hidden");
$("#noteFormEl").onsubmit=async e=>{
  e.preventDefault();
  const title=$("#nTitle").value, cat=$("#nCat").value, text=$("#nText").value;
  e.target.reset(); $("#noteForm").classList.add("hidden");
  try{
    const {data:row,error}=await sb.from("notes").insert({title,category:cat,content:text,user_id:currentUser.id}).select().single();
    if(error)throw error;
    data.notes.push({id:row.id,title:row.title,cat:row.category,text:row.content,date:new Date(row.created_at).getTime()});
    cacheAndRender();toast("Anotação salva!");
  }catch(err){console.error(err);toast("Não foi possível salvar na nuvem.");}
};
window.delNote=async id=>{
  const backup=data.notes;
  data.notes=data.notes.filter(x=>x.id!==id);cacheAndRender();
  const {error}=await sb.from("notes").delete().eq("id",id);
  if(error){console.error(error);data.notes=backup;cacheAndRender();toast("Erro ao excluir na nuvem.");}
  else toast("Anotação excluída.");
};

/* ============================ FOTOS & PRINTS ============================ */
async function addImages(files){
  for(const file of [...files].filter(f=>f.type.startsWith("image/"))){
    const path=`${currentUser.id}/${crypto.randomUUID()}-${file.name}`;
    try{
      const {error}=await sb.storage.from("photos").upload(path,file);
      if(error)throw error;
      const {data:signed}=await sb.storage.from("photos").createSignedUrl(path,3600);
      data.photos.unshift({id:path.split("/").pop(),path,name:file.name,src:signed?.signedUrl||""});
      cacheAndRender();toast("Foto adicionada!");
    }catch(err){console.error(err);toast("Erro ao enviar foto para a nuvem.");}
  }
}
$("#photoInput").onchange=e=>addImages(e.target.files);
$("#drop").ondragover=e=>{e.preventDefault();$("#drop").style.borderColor="var(--purple)"};
$("#drop").ondrop=e=>{e.preventDefault();$("#drop").style.borderColor="var(--line)";addImages(e.dataTransfer.files)};
window.delPhoto=async id=>{
  const photo=data.photos.find(p=>p.id===id);
  const backup=data.photos;
  data.photos=data.photos.filter(x=>x.id!==id);cacheAndRender();
  if(photo){
    const {error}=await sb.storage.from("photos").remove([photo.path]);
    if(error){console.error(error);data.photos=backup;cacheAndRender();toast("Erro ao excluir na nuvem.");}
    else toast("Foto excluída.");
  }
};

/* ================================ RENDER ================================ */
function cacheAndRender(){localStorage.setItem(CACHE_KEY,JSON.stringify(data));render();}
function render(){
  $("#sNotes").textContent=data.notes.length;$("#sPhotos").textContent=data.photos.length;
  const dn=$("#dashNotes");dn.innerHTML=data.notes.length?data.notes.slice(-4).reverse().map(n=>`<div class="mini"><b>${esc(n.title)}</b><small>${esc(n.cat)} • ${new Date(n.date).toLocaleDateString("pt-BR")}</small></div>`).join(""):'<p style="color:var(--muted);font-size:12px">Nenhuma anotação cadastrada.</p>';
  const ng=$("#notesGrid");ng.innerHTML=data.notes.length?data.notes.slice().reverse().map(n=>`<article class="note"><span class="cat">${esc(n.cat)}</span><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p><div class="note-foot"><span>${new Date(n.date).toLocaleDateString("pt-BR")}</span><button class="delete" onclick="delNote('${n.id}')">Excluir</button></div></article>`).join(""):'<div class="card" style="grid-column:1/-1;color:var(--muted)">Nenhuma anotação ainda.</div>';
  const pg=$("#photosGrid");pg.innerHTML=data.photos.length?data.photos.map(p=>`<div class="photo"><img src="${p.src}" alt="${esc(p.name)}"><button onclick="delPhoto('${p.id}')">×</button></div>`).join(""):'<div class="card" style="grid-column:1/-1;color:var(--muted)">Nenhuma foto adicionada.</div>';
}
render();

/* ================================== PWA ================================== */
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installBtn").hidden=false});
$("#installBtn").onclick=async()=>{if(!deferredPrompt){toast("No Chrome, use ⋮ > Instalar aplicativo.");return}deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("#installBtn").hidden=true};
window.addEventListener("appinstalled",()=>toast("Aplicativo instalado!"));
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(console.error);
