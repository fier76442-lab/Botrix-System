const state={data:null,page:"overview"};
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
async function api(path,options){const r=await fetch(path,{headers:{"Content-Type":"application/json"},...options});if(!r.ok)throw new Error(await r.text());return r.json()}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function setPage(p){
 state.page=p;document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
 document.querySelector("#page-"+p)?.classList.add("active");
 document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.page===p));
 const label=document.querySelector(`[data-page="${p}"]`)?.textContent?.trim()||p;
 $("#pageCrumb").textContent=label;
 renderPage(p);
}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>setPage(b.dataset.page)));
$("#refreshBtn").onclick=()=>load(true);

function stat(label,value,sub,cls=""){return `<div class="card stat"><div class="label">${label}</div><div class="value ${cls}">${esc(value)}</div><div class="sub">${esc(sub||"")}</div></div>`}
function serverCard(s){return `<div class="card server"><div class="server-icon">${esc((s.name||"S")[0].toUpperCase())}</div><div class="server-info"><b>${esc(s.name||"Unknown Server")}</b><small>${esc(s.id||"")} · ${esc(s.members??0)} members</small></div><span class="pill online">ONLINE</span></div>`}
function shell(title,kicker,desc){return `<div class="hero"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${desc}</p></div><div class="updated" id="updated">Updated just now</div></div>`}
function renderOverview(){
 const d=state.data||{}, servers=d.servers||[];
 $("#page-overview").innerHTML=shell("Control center","BOTRIX SYSTEM","A live command center for your Discord bot.")+
 `<div class="grid">${stat("Servers",d.serverCount??servers.length,"Connected Discord servers","purple")}${stat("Members",d.memberCount??"—","Total visible members")}${stat("Ping",d.ping!=null?d.ping+" ms":"—","Gateway latency","green")}${stat("Uptime",d.uptime||"—","Bot process uptime")}</div>
 <div class="section"><div class="section-title"><h2>Connected servers</h2><span>${servers.length} shown</span></div><div class="server-grid">${servers.length?servers.map(serverCard).join(""):`<div class="card empty">No servers available.</div>`}</div></div>
 <div class="section"><div class="section-title"><h2>System status</h2><span>LIVE</span></div><div class="card table"><div class="row head"><div>Service</div><div>Status</div><div>Details</div><div>State</div></div>
 ${["Discord Gateway","Dashboard API","Command Registry"].map((x,i)=>`<div class="row"><div>${x}</div><div class="green">Operational</div><div>${i===0?"Connected":i===1?"HTTP /api":"Global commands"}</div><div><span class="pill online">OK</span></div></div>`).join("")}</div></div>`;
}
function renderServers(){
 const servers=state.data?.servers||[];
 $("#page-servers").innerHTML=shell("Servers","MANAGEMENT","Manage and inspect every server connected to Botrix.")+
 `<div class="grid">${stat("Connected",servers.length,"Discord servers","purple")}${stat("Owner server",state.data?.ownerServer?"Configured":"Not set","Owner configuration")}${stat("Members",state.data?.memberCount??"—","Visible members")}${stat("Gateway",state.data?.ping!=null?state.data.ping+" ms":"—","Current latency","green")}</div>
 <div class="section"><div class="section-title"><h2>Server directory</h2></div><div class="card table"><div class="row head"><div>Server</div><div>ID</div><div>Members</div><div>Status</div></div>${servers.length?servers.map(s=>`<div class="row"><div><b>${esc(s.name)}</b></div><div>${esc(s.id)}</div><div>${esc(s.members??"—")}</div><div><span class="pill online">ONLINE</span></div></div>`).join(""):`<div class="empty">No servers available.</div>`}</div></div>`;
}
function renderActivity(){
 const logs=state.data?.activity||[];
 $("#page-activity").innerHTML=shell("Activity","SYSTEM","Recent dashboard and bot activity.")+
 `<div class="card table"><div class="row head"><div>Event</div><div>Server</div><div>Time</div><div>Type</div></div>${logs.length?logs.map(x=>`<div class="row"><div>${esc(x.event)}</div><div>${esc(x.server||"—")}</div><div>${esc(x.time||"—")}</div><div><span class="pill">${esc(x.type||"SYSTEM")}</span></div></div>`).join(""):`<div class="empty">Activity will appear here when the bot reports events.</div>`}</div>`;
}
function renderModeration(){
 const cmds=[["/ban","Ban a member"],["/kick","Kick a member"],["/timeout","Temporarily restrict a member"],["/warn","Issue a warning"],["/clear","Delete messages"],["/lockdown","Lock a channel"],["/slowmode","Set channel slowmode"],["/serverinfo","Show server information"],["/userinfo","Show member information"]];
 $("#page-moderation").innerHTML=shell("Moderation","MANAGEMENT","Moderation commands available in Botrix.")+
 `<div class="command-grid">${cmds.map(c=>`<div class="command"><code>${c[0]}</code><p>${c[1]}</p></div>`).join("")}</div>`;
}
function channelOptions(servers,selected){
 return servers.map(s=>`<option value="${esc(s.id)}" data-name="${esc(s.name)}" ${s.id===selected?"selected":""}>${esc(s.name)}</option>`).join("")
}
function configPanel(kind,title,desc,current){
 const servers=state.data?.servers||[];
 return `<div class="card panel"><h3>${title}</h3><p>${desc}</p><div class="form-row"><select class="select" id="${kind}Server"><option value="">Choose a server</option>${channelOptions(servers,"")}</select><input class="input" id="${kind}Channel" placeholder="Channel ID" value="${esc(current||"")}"><button class="btn" onclick="saveSetting('${kind}')">Save</button></div></div>`;
}
function renderAI(){
 const cfg=state.data?.settings?.aiChannels||{};
 $("#page-ai").innerHTML=shell("AI Assistant","BOTRIX AI","Choose where Botrix should automatically answer with AI.")+
 `<div class="two">${configPanel("ai","AI channel","Save the channel ID used by the automatic /ai system.","")}${`<div class="card panel"><h3>AI behavior</h3><p>Botrix can respond in the configured channel and support Arabic, Tunisian Arabic, French and English.</p><span class="pill online">MULTI-LANGUAGE</span></div>`}</div>
 <div class="section"><div class="section-title"><h2>Configured AI channels</h2></div><div class="card table"><div class="row head"><div>Server</div><div>Channel ID</div><div>Feature</div><div>Status</div></div>${Object.keys(cfg).length?Object.entries(cfg).map(([id,ch])=>`<div class="row"><div>${esc((state.data.servers||[]).find(s=>s.id===id)?.name||id)}</div><div>${esc(ch)}</div><div>Automatic AI</div><div><span class="pill online">ON</span></div></div>`).join(""):`<div class="empty">No AI channels configured.</div>`}</div></div>`;
}
function renderLogs(){
 $("#page-logs").innerHTML=shell("Logs","MANAGEMENT","Configure where Botrix sends operational and moderation logs.")+
 `<div class="two">${configPanel("logs","Logs channel","Save a channel ID for Botrix logs.","")}<div class="card panel"><h3>Log categories</h3><p>Gateway, commands, moderation and system events can be routed through your logs channel.</p><div class="command-grid"><div class="command"><code>COMMANDS</code><p>Slash command activity</p></div><div class="command"><code>MODERATION</code><p>Moderation actions</p></div><div class="command"><code>SYSTEM</code><p>Bot lifecycle events</p></div></div></div></div>`;
}
function renderWelcome(){
 $("#page-welcome").innerHTML=shell("Welcome","MANAGEMENT","Welcome configuration for your Discord communities.")+
 `<div class="two"><div class="card panel"><h3>Welcome system</h3><p>Configure a welcome channel and message from your Botrix database.</p><div class="form-row"><select class="select"><option>Choose a server</option>${channelOptions(state.data?.servers||[],"")}</select><input class="input" placeholder="Channel ID"><button class="btn" onclick="toast('Welcome settings saved')">Save</button></div></div><div class="card panel"><h3>Message preview</h3><p>Welcome new members with a clean Botrix message. Connect this panel to your existing welcome handler.</p><div class="card" style="padding:13px;background:#0a0c11"><b style="font-size:11px">Welcome to the server 👋</b><div style="font-size:10px;color:#6f788b;margin-top:5px">We’re glad you’re here.</div></div></div></div>`;
}
function renderTickets(){
 $("#page-tickets").innerHTML=shell("Tickets","MANAGEMENT","Ticket configuration and support workflow.")+
 `<div class="grid">${stat("Open tickets",state.data?.ticketStats?.open??0,"Currently open","purple")}${stat("Closed",state.data?.ticketStats?.closed??0,"Resolved tickets")}${stat("Category","—","Ticket category")}${stat("Status","Ready","Panel state","green")}</div><div class="section"><div class="card panel"><h3>Ticket system</h3><p>Connect this page to your existing ticket command and database settings.</p><button class="btn" onclick="toast('Ticket panel is ready')">Configure tickets</button></div></div>`;
}
function renderBot(){
 const d=state.data||{};
 $("#page-bot").innerHTML=shell("Bot Account","SYSTEM","Live identity and runtime information.")+
 `<div class="card bot-card"><div class="avatar">B</div><div><b>${esc(d.botName||"Botrix System")}</b><small>${esc(d.botTag||"Discord Bot")} · ${esc(d.botId||"ID unavailable")}</small><div style="margin-top:10px"><span class="pill online">CONNECTED</span></div></div></div>
 <div class="section"><div class="grid">${stat("Node.js","Runtime","Server process")}${stat("Servers",d.serverCount??"—","Connected guilds")}${stat("Ping",d.ping!=null?d.ping+" ms":"—","Gateway latency","green")}${stat("Uptime",d.uptime||"—","Process uptime")}</div></div>`;
}
function renderPage(p){
 ({overview:renderOverview,servers:renderServers,activity:renderActivity,moderation:renderModeration,ai:renderAI,logs:renderLogs,welcome:renderWelcome,tickets:renderTickets,bot:renderBot}[p]||renderOverview)();
}
async function saveSetting(kind){
 const sid=$("#"+kind+"Server")?.value, channel=$("#"+kind+"Channel")?.value.trim();
 if(!sid||!channel){toast("Choose a server and enter a channel ID");return}
 try{
   const key=kind==="ai"?"aiChannels":"logsChannels";
   await api("/api/settings",{method:"POST",body:JSON.stringify({key,serverId:sid,channelId:channel})});
   toast("Settings saved");
   await load();
 }catch(e){toast("Could not save settings")}
}
async function load(showToast=false){
 try{
  state.data=await api("/api/dashboard");
  $("#sideBotName").textContent=state.data.botName||"Botrix System";
  $("#sideServers").textContent=`${state.data.serverCount??(state.data.servers||[]).length} servers connected`;
  $("#connectionText").textContent="Bot online";
  renderPage(state.page);
  if(showToast)toast("Dashboard refreshed");
 }catch(e){
  $("#connectionText").textContent="Dashboard API unavailable";
  toast("Could not reach Botrix API");
 }
}
load();
setInterval(()=>load(false),30000);
