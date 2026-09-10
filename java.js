const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const KEY = "devclub-study-panel-v1";
let state = JSON.parse(localStorage.getItem(KEY) || '{"tickets":[],"notes":[],"photos":[],"progress":0}');
let deferredPrompt = null;

function save(){
  localStorage.setItem(KEY, JSON.stringify(state));
  $("#saveStatus").textContent = "Salvo localmente";
  updateStats();
}
function toast(msg){
  const el=$("#toast"); el.textContent=msg; el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),2200);
}
function updateStats(){
  $("#statNotes").textContent=state.notes.length;
  $("#statPhotos").textContent=state.photos.length;
  $("#statProgress").textContent=state.progress+"%";
  $("#progressNumber").textContent=state.progress+"%";
  const deg=state.progress*3.6;
  $(".progress-ring").style.background=`conic-gradient(var(--purple) ${deg}deg, var(--border) ${deg}deg)`;
}
function renderTickets(){
  const list=$("#ticketList");
  if(!state.tickets.length){list.innerHTML='<div class="empty">Nenhum ticket ainda. Crie o primeiro ao lado.</div>';return}
  list.innerHTML=state.tickets.slice().reverse().map(t=>`
    <div class="ticket">
      <div class="ticket-top"><span class="ticket-title">${escapeHtml(t.title)}</span><span class="priority">${escapeHtml(t.priority)}</span></div>
      ${t.text?`<p>${escapeHtml(t.text)}</p>`:""}
      <button class="delete" onclick="deleteTicket('${t.id}')">Excluir</button>
    </div>`).join("");
}
function renderNotes(){
  const grid=$("#notesGrid");
  if(!state.notes.length){grid.innerHTML='<div class="card empty">Nenhuma anotação. Clique em “Nova anotação” para começar.</div>';return}
  grid.innerHTML=state.notes.slice().reverse().map(n=>`
    <article class="note"><span class="note-category">${escapeHtml(n.category)}</span>
    <h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.text)}</p>
    <div class="note-bottom"><small>${new Date(n.date).toLocaleDateString("pt-BR")}</small>
    <button class="delete" onclick="deleteNote('${n.id}')">Excluir</button></div></article>`).join("");
}
function renderPhotos(){
  const grid=$("#photoGrid");
  if(!state.photos.length){grid.innerHTML='<div class="card empty">Nenhuma foto adicionada ainda.</div>';return}
  grid.innerHTML=state.photos.slice().reverse().map(p=>`
    <div class="photo"><img src="${p.data}" alt="${escapeHtml(p.name)}" loading="lazy">
    <button onclick="deletePhoto('${p.id}')" aria-label="Excluir foto">×</button></div>`).join("");
}
function escapeHtml(str=""){return str.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

$("#ticketForm").addEventListener("submit",e=>{
  e.preventDefault();
  state.tickets.push({id:crypto.randomUUID(),title:$("#ticketTitle").value,priority:$("#ticketPriority").value,text:$("#ticketText").value});
  e.target.reset(); save(); renderTickets(); toast("Ticket criado!");
});
window.deleteTicket=id=>{state.tickets=state.tickets.filter(x=>x.id!==id);save();renderTickets();toast("Ticket excluído.")};

$("#newNoteBtn").onclick=()=>$("#noteFormWrap").classList.remove("hidden");
$("#cancelNote").onclick=()=>$("#noteFormWrap").classList.add("hidden");
$("#noteForm").addEventListener("submit",e=>{
  e.preventDefault();
  state.notes.push({id:crypto.randomUUID(),title:$("#noteTitle").value,category:$("#noteCategory").value,text:$("#noteText").value,date:Date.now()});
  e.target.reset();$("#noteFormWrap").classList.add("hidden");save();renderNotes();toast("Anotação salva!");
});
window.deleteNote=id=>{state.notes=state.notes.filter(x=>x.id!==id);save();renderNotes();toast("Anotação excluída.")};

function readFiles(files){
  [...files].filter(f=>f.type.startsWith("image/")).forEach(file=>{
    const reader=new FileReader();
    reader.onload=()=>{state.photos.push({id:crypto.randomUUID(),name:file.name,data:reader.result});save();renderPhotos();toast("Foto salva no aparelho.")};
    reader.readAsDataURL(file);
  });
}
$("#photoInput").addEventListener("change",e=>readFiles(e.target.files));
const drop=$("#dropArea");
["dragenter","dragover"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.style.borderColor="var(--purple)"}));
["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.style.borderColor="var(--border)"}));
drop.addEventListener("drop",e=>readFiles(e.dataTransfer.files));
window.deletePhoto=id=>{state.photos=state.photos.filter(x=>x.id!==id);save();renderPhotos();toast("Foto excluída.")};

$("#progressRange").value=state.progress;
$("#progressRange").oninput=e=>{$("#progressNumber").textContent=e.target.value+"%";const d=e.target.value*3.6;$(".progress-ring").style.background=`conic-gradient(var(--purple) ${d}deg,var(--border) ${d}deg)`};
$("#saveProgress").onclick=()=>{state.progress=Number($("#progressRange").value);save();toast("Progresso atualizado!")};

$$(".nav-item").forEach(btn=>btn.onclick=()=>{
  $$(".nav-item").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
  $$(".page").forEach(p=>p.classList.remove("active-page"));$("#"+btn.dataset.page).classList.add("active-page");
  $("#pageTitle").textContent={inicio:"Meu painel",anotacoes:"Anotações",fotos:"Fotos e prints",progresso:"Meu progresso"}[btn.dataset.page];
  $(".sidebar").classList.remove("open");window.scrollTo({top:0,behavior:"smooth"});
});
$("#menuBtn").onclick=()=>$(".sidebar").classList.toggle("open");
$("#themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("devclub-theme",document.body.classList.contains("dark")?"dark":"light")};
if(localStorage.getItem("devclub-theme")==="dark")document.body.classList.add("dark");

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installBtn").hidden=false});
$("#installBtn").onclick=async()=>{
  if(!deferredPrompt){toast("No Chrome, abra o menu e escolha instalar aplicativo.");return}
  deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; $("#installBtn").hidden=true;
};
window.addEventListener("appinstalled",()=>toast("Aplicativo instalado!"));

renderTickets();renderNotes();renderPhotos();updateStats();
