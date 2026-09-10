const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY="devclub-study-pro-v2";
let data=JSON.parse(localStorage.getItem(KEY)||'{"tickets":[],"notes":[],"photos":[],"progress":0}');
let deferredPrompt=null;
const esc=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function save(){localStorage.setItem(KEY,JSON.stringify(data));$("#statusText").textContent="Salvo neste aparelho";render();}
function toast(t){const x=$("#toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2200)}
const titles={dashboard:"Dashboard",tickets:"Tickets de estudo",notes:"Anotações",photos:"Fotos & Prints",progress:"Meu progresso"};
function openPage(id){$$(".page").forEach(p=>p.classList.remove("active"));$("#"+id).classList.add("active");$$(".nav").forEach(n=>n.classList.toggle("active",n.dataset.page===id));$("#title").textContent=titles[id];$(".sidebar").classList.remove("open");scrollTo({top:0,behavior:"smooth"})}
window.openPage=openPage;
$$(".nav").forEach(n=>n.onclick=()=>openPage(n.dataset.page));
$("#menuBtn").onclick=()=>$(".sidebar").classList.toggle("open");
$("#themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("devclub-theme",document.body.classList.contains("dark")?"dark":"light")};
if(localStorage.getItem("devclub-theme")==="dark")document.body.classList.add("dark");

$("#newTicketBtn").onclick=()=>$("#ticketForm").classList.remove("hidden");
$("#cancelTicket").onclick=()=>$("#ticketForm").classList.add("hidden");
$("#ticketFormEl").onsubmit=e=>{e.preventDefault();data.tickets.push({id:crypto.randomUUID(),title:$("#tTitle").value,priority:$("#tPriority").value,desc:$("#tDesc").value,date:Date.now()});e.target.reset();$("#ticketForm").classList.add("hidden");save();toast("Ticket salvo!")};
window.delTicket=id=>{data.tickets=data.tickets.filter(x=>x.id!==id);save();toast("Ticket excluído.")};

$("#newNoteBtn").onclick=()=>$("#noteForm").classList.remove("hidden");
$("#cancelNote").onclick=()=>$("#noteForm").classList.add("hidden");
$("#noteFormEl").onsubmit=e=>{e.preventDefault();data.notes.push({id:crypto.randomUUID(),title:$("#nTitle").value,cat:$("#nCat").value,text:$("#nText").value,date:Date.now()});e.target.reset();$("#noteForm").classList.add("hidden");save();toast("Anotação salva!")};
window.delNote=id=>{data.notes=data.notes.filter(x=>x.id!==id);save();toast("Anotação excluída.")};

function addImages(files){[...files].filter(f=>f.type.startsWith("image/")).forEach(file=>{const r=new FileReader();r.onload=()=>{data.photos.push({id:crypto.randomUUID(),name:file.name,src:r.result});save();toast("Foto adicionada!")};r.readAsDataURL(file)})}
$("#photoInput").onchange=e=>addImages(e.target.files);
$("#drop").ondragover=e=>{e.preventDefault();$("#drop").style.borderColor="var(--purple)"};
$("#drop").ondrop=e=>{e.preventDefault();$("#drop").style.borderColor="var(--line)";addImages(e.dataTransfer.files)};
window.delPhoto=id=>{data.photos=data.photos.filter(x=>x.id!==id);save();toast("Foto excluída.")};

$("#range").value=data.progress;
$("#range").oninput=e=>updateRing(+e.target.value);
function updateRing(v){$("#pNumber").textContent=v+"%";let d=v*3.6;$("#ring").style.background=`conic-gradient(var(--purple) ${d}deg,var(--line) ${d}deg)`}
$("#saveP").onclick=()=>{data.progress=+$("#range").value;save();toast("Progresso atualizado!")};

function render(){
 $("#sTickets").textContent=data.tickets.length;$("#sNotes").textContent=data.notes.length;$("#sPhotos").textContent=data.photos.length;$("#sProgress").textContent=data.progress+"%";$("#ticketBadge").textContent=data.tickets.length;updateRing(data.progress);
 const dt=$("#dashTickets");dt.innerHTML=data.tickets.length?data.tickets.slice(-4).reverse().map(t=>`<div class="mini"><b>${esc(t.title)}</b><small>${esc(t.priority)} • ${new Date(t.date).toLocaleDateString("pt-BR")}</small></div>`).join(""):'<p style="color:var(--muted);font-size:12px">Nenhum ticket cadastrado.</p>';
 const tg=$("#ticketsGrid");tg.innerHTML=data.tickets.length?data.tickets.slice().reverse().map(t=>`<article class="ticket"><div class="ticket-top"><span class="ticket-title">${esc(t.title)}</span><span class="priority">${esc(t.priority)}</span></div><p>${esc(t.desc)||"Sem descrição."}</p><div class="ticket-foot"><small>${new Date(t.date).toLocaleDateString("pt-BR")}</small><button class="delete" onclick="delTicket('${t.id}')">Excluir</button></div></article>`).join(""):'<div class="card" style="grid-column:1/-1;color:var(--muted)">Nenhum ticket ainda. Crie sua primeira dúvida.</div>';
 const ng=$("#notesGrid");ng.innerHTML=data.notes.length?data.notes.slice().reverse().map(n=>`<article class="note"><span class="cat">${esc(n.cat)}</span><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p><div class="note-foot"><span>${new Date(n.date).toLocaleDateString("pt-BR")}</span><button class="delete" onclick="delNote('${n.id}')">Excluir</button></div></article>`).join(""):'<div class="card" style="grid-column:1/-1;color:var(--muted)">Nenhuma anotação ainda.</div>';
 const pg=$("#photosGrid");pg.innerHTML=data.photos.length?data.photos.slice().reverse().map(p=>`<div class="photo"><img src="${p.src}" alt="${esc(p.name)}"><button onclick="delPhoto('${p.id}')">×</button></div>`).join(""):'<div class="card" style="grid-column:1/-1;color:var(--muted)">Nenhuma foto adicionada.</div>';
}
render();

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installBtn").hidden=false});
$("#installBtn").onclick=async()=>{if(!deferredPrompt){toast("No Chrome, use ⋮ > Instalar aplicativo.");return}deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("#installBtn").hidden=true};
window.addEventListener("appinstalled",()=>toast("Aplicativo instalado!"));
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(console.error);
