(function(){
'use strict';

var STORAGE_KEY='sonarMineEscape_history';
var TILE={WALL:0,PATH:1,MINE:2,DOOR_HIDDEN:3,DOOR_REVEALED:4,EXIT:5};
var DIFFICULTY={
  easy:{gridW:11,gridH:11,sonarCharges:7,echoDelay:2,maxEnergy:100,mineCount:4,doorCount:2,bpm:100,timeLimit:120},
  normal:{gridW:13,gridH:13,sonarCharges:5,echoDelay:3,maxEnergy:80,mineCount:7,doorCount:3,bpm:120,timeLimit:90},
  hard:{gridW:15,gridH:15,sonarCharges:4,echoDelay:4,maxEnergy:60,mineCount:10,doorCount:2,bpm:140,timeLimit:70}
};
var RHYTHM_WINDOW={perfect:80,good:160};
var DIR={up:{dx:0,dy:-1},down:{dx:0,dy:1},left:{dx:-1,dy:0},right:{dx:1,dy:0}};

var G={
  state:'menu',
  difficulty:'normal',
  map:[],
  mapW:0,mapH:0,
  player:{x:0,y:0},
  energy:0,maxEnergy:0,health:3,
  sonarCharges:0,maxSonarCharges:0,
  echoDelay:2,
  exitPos:{x:0,y:0},
  hiddenDoors:[],
  steps:0,
  beatCount:0,
  bpm:120,
  beatInterval:500,
  timeLimit:90,
  startTime:0,
  elapsedBeats:0,
  pendingSonar:[],
  revealedTiles:new Set(),
  doorRevealed:new Set(),
  auditLog:[],
  deductions:[],
  bonuses:[],
  beatTimer:null,
  renderRAF:null,
  lastBeatTime:0,
  rhythmQuality:'none',
  gameSession:null,
  gameHistory:[],
  replayData:null,
  modifiedPulses:{}
};

function $(id){return document.getElementById(id)}
function $$(sel){return document.querySelectorAll(sel)}
function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v))}

function showToast(msg,type){
  var c=$('toast-container');
  var t=document.createElement('div');
  t.className='toast '+(type||'info');
  t.textContent=msg;
  c.appendChild(t);
  setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t)},2500);
}

function formatTime(sec){
  var m=Math.floor(sec/60),s=Math.floor(sec%60);
  return m+':'+(s<10?'0':'')+s;
}

function addLog(beat,action,detail,isDeduction){
  var logEl=$('action-log');
  var entry=document.createElement('div');
  entry.className='log-entry'+(isDeduction?' deduction':'');
  entry.innerHTML='<span class="beat-num">B'+beat+'</span> <span class="action-name">'+action+'</span> <span class="detail">'+(detail||'')+'</span>';
  logEl.insertBefore(entry,logEl.firstChild);
  if(logEl.children.length>50)logEl.removeChild(logEl.lastChild);
  G.auditLog.push({beat:beat,action:action,detail:detail,isDeduction:!!isDeduction,timestamp:Date.now()});
}

function randomSeed(){return Math.floor(Math.random()*2147483647)}

function seededRandom(seed){
  var s=seed;
  return function(){s=(s*16807)%2147483647;return(s-1)/2147483646};
}

function generateMap(diff){
  var cfg=DIFFICULTY[diff];
  var w=cfg.gridW,h=cfg.gridH;
  var rng=seededRandom(randomSeed());
  var map=[];
  var x,y,i,j;
  for(y=0;y<h;y++){map[y]=[];for(x=0;x<w;x++)map[y][x]=TILE.WALL;}

  var sx=1,sy=1;
  var ex=w-2,ey=h-2;
  if(ex%2===0)ex--;
  if(ey%2===0)ey--;

  var visited={};
  function key(cx,cy){return cx+','+cy}
  function carve(cx,cy){
    visited[key(cx,cy)]=true;
    map[cy][cx]=TILE.PATH;
    var dirs=[{dx:0,dy:-2},{dx:0,dy:2},{dx:-2,dy:0},{dx:2,dy:0}];
    for(i=dirs.length-1;i>0;i--){var ri=Math.floor(rng()*(i+1));var tmp=dirs[i];dirs[i]=dirs[ri];dirs[ri]=tmp;}
    for(var d=0;d<dirs.length;d++){
      var nx=cx+dirs[d].dx,ny=cy+dirs[d].dy;
      if(nx>0&&nx<w-1&&ny>0&&ny<h-1&&!visited[key(nx,ny)]){
        map[cy+dirs[d].dy/2][cx+dirs[d].dx/2]=TILE.PATH;
        carve(nx,ny);
      }
    }
  }
  carve(sx,sy);
  map[ey][ex]=TILE.EXIT;

  var pathTiles=[];
  for(y=0;y<h;y++)for(x=0;x<w;x++){
    if(map[y][x]===TILE.PATH&&!(x===sx&&y===sy)&&!(x===ex&&y===ey)){
      pathTiles.push({x:x,y:y});
    }
  }
  for(i=pathTiles.length-1;i>0;i--){var ri2=Math.floor(rng()*(i+1));var tmp2=pathTiles[i];pathTiles[i]=pathTiles[ri2];pathTiles[ri2]=tmp2;}

  var mc=Math.min(cfg.mineCount,pathTiles.length);
  for(i=0;i<mc;i++){
    var t=pathTiles[i];
    map[t.y][t.x]=TILE.MINE;
  }

  var wallTiles=[];
  for(y=1;y<h-1;y++)for(x=1;x<w-1;x++){
    if(map[y][x]===TILE.WALL){
      var adj=0;
      if(y>0&&map[y-1][x]===TILE.PATH)adj++;
      if(y<h-1&&map[y+1][x]===TILE.PATH)adj++;
      if(x>0&&map[y][x-1]===TILE.PATH)adj++;
      if(x<w-1&&map[y][x+1]===TILE.PATH)adj++;
      if(adj>=2)wallTiles.push({x:x,y:y});
    }
  }
  for(i=wallTiles.length-1;i>0;i--){var ri3=Math.floor(rng()*(i+1));var tmp3=wallTiles[i];wallTiles[i]=wallTiles[ri3];wallTiles[ri3]=tmp3;}

  var doors=[];
  var dc=Math.min(cfg.doorCount,wallTiles.length);
  for(i=0;i<dc;i++){
    var d=wallTiles[i];
    map[d.y][d.x]=TILE.DOOR_HIDDEN;
    doors.push({x:d.x,y:d.y,id:i});
  }

  return{map:map,w:w,h:h,exitPos:{x:ex,y:ey},startPos:{x:sx,y:sy},hiddenDoors:doors};
}

function initGame(diff,customCfg){
  var cfg=JSON.parse(JSON.stringify(DIFFICULTY[diff]));
  if(customCfg){
    cfg.echoDelay=customCfg.echoDelay||cfg.echoDelay;
    cfg.sonarCharges=customCfg.sonarCharges||cfg.sonarCharges;
    cfg.maxEnergy=customCfg.maxEnergy||cfg.maxEnergy;
    cfg.bpm=customCfg.bpm||cfg.bpm;
    cfg.timeLimit=customCfg.timeLimit||cfg.timeLimit;
    cfg._custom=true;
  }
  var gen=generateMap(diff);
  G.difficulty=diff;
  G.map=gen.map;
  G.mapW=gen.w;
  G.mapH=gen.h;
  G.player={x:gen.startPos.x,y:gen.startPos.y};
  G.exitPos=gen.exitPos;
  G.hiddenDoors=gen.hiddenDoors;
  G.energy=cfg.maxEnergy;
  G.maxEnergy=cfg.maxEnergy;
  G.health=3;
  G.sonarCharges=cfg.sonarCharges;
  G.maxSonarCharges=cfg.sonarCharges;
  G.echoDelay=cfg.echoDelay;
  G.bpm=cfg.bpm;
  G.beatInterval=60000/cfg.bpm;
  G.timeLimit=cfg.timeLimit;
  G.steps=0;
  G.beatCount=0;
  G.elapsedBeats=0;
  G.pendingSonar=[];
  G.revealedTiles=new Set();
  G.doorRevealed=new Set();
  G.auditLog=[];
  G.deductions=[];
  G.bonuses=[];
  G.rhythmQuality='none';
  G.lastBeatTime=0;
  G.modifiedPulses={};

  G.revealedTiles.add(G.player.x+','+G.player.y);
  revealAdjacent(G.player.x,G.player.y);

  G.gameSession={
    id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),
    difficulty:diff,
    startTime:Date.now(),
    endTime:null,
    config:JSON.parse(JSON.stringify(cfg)),
    mapSnapshot:JSON.parse(JSON.stringify(gen.map)),
    exitPos:JSON.parse(JSON.stringify(gen.exitPos)),
    hiddenDoors:JSON.parse(JSON.stringify(gen.hiddenDoors)),
    sonarPulses:[],
    actions:[],
    deductions:[],
    bonuses:[],
    result:null
  };
}

function revealAdjacent(px,py){
  for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){
    var nx=px+dx,ny=py+dy;
    if(nx>=0&&nx<G.mapW&&ny>=0&&ny<G.mapH){
      G.revealedTiles.add(nx+','+ny);
    }
  }
}

function renderMap(){
  var mapEl=$('mine-map');
  mapEl.style.gridTemplateColumns='repeat('+G.mapW+',28px)';
  mapEl.innerHTML='';
  var px=G.player.x,py=G.player.y;
  for(var y=0;y<G.mapH;y++){
    for(var x=0;x<G.mapW;x++){
      var cell=document.createElement('div');
      cell.className='map-cell';
      cell.dataset.x=x;cell.dataset.y=y;
      var isRevealed=G.revealedTiles.has(x+','+y);
      var isPlayer=(x===px&&y===py);
      var tile=G.map[y][x];
      if(isPlayer){
        cell.classList.add('player-cell');
        cell.textContent='◎';
      }else if(!isRevealed){
        cell.classList.add('fog');
        cell.textContent='';
      }else{
        switch(tile){
          case TILE.WALL:cell.classList.add('wall-revealed');cell.textContent='▪';break;
          case TILE.PATH:cell.classList.add('revealed');cell.textContent='·';break;
          case TILE.MINE:cell.classList.add('mine-revealed');cell.textContent='✦';break;
          case TILE.DOOR_HIDDEN:cell.classList.add('wall-revealed');cell.textContent='▪';break;
          case TILE.DOOR_REVEALED:cell.classList.add('door-revealed');cell.textContent='◈';break;
          case TILE.EXIT:cell.classList.add('exit-cell');cell.textContent='⬡';break;
        }
      }
      mapEl.appendChild(cell);
    }
  }
}

function renderStats(){
  var ePct=Math.max(0,G.energy/G.maxEnergy*100);
  $('energy-bar').querySelector('.bar-fill').style.width=ePct+'%';
  $('energy-val').textContent=Math.round(G.energy)+'/'+G.maxEnergy;
  var hPct=(G.health/3)*100;
  $('health-bar').querySelector('.bar-fill').style.width=hPct+'%';
  $('health-val').textContent=G.health+'/3';
  $('steps-val').textContent=G.steps;
  var elapsed=(Date.now()-G.startTime)/1000;
  var remaining=Math.max(0,G.timeLimit-elapsed);
  $('time-val').textContent=formatTime(remaining);
  $('echo-delay-val').textContent=G.echoDelay+'拍';
  $('diff-label').textContent={easy:'简单',normal:'普通',hard:'困难'}[G.difficulty];
}

function renderSonarCharges(){
  var c=$('sonar-charges');
  c.innerHTML='';
  for(var i=0;i<G.maxSonarCharges;i++){
    var d=document.createElement('div');
    d.className='sonar-charge '+(i<G.sonarCharges?'available':'used');
    c.appendChild(d);
  }
  var pe=$('pending-echoes');
  pe.innerHTML='';
  for(var j=0;j<G.pendingSonar.length;j++){
    var ps=G.pendingSonar[j];
    var peDiv=document.createElement('div');
    peDiv.className='pending-echo';
    var remaining=ps.arriveBeat-G.beatCount;
    peDiv.textContent='脉冲#'+ps.id+' 回声还有'+remaining+'拍到达';
    pe.appendChild(peDiv);
  }
}

function renderRhythm(){
  var indicator=$('rhythm-indicator');
  var marker=$('beat-marker');
  var now=Date.now();
  var progress=((now-G.lastBeatTime)/G.beatInterval)*100;
  progress=clamp(progress,0,100);
  marker.style.left=progress+'%';

  var dots=$('beat-dots');
  if(!dots.children.length){
    for(var i=0;i<8;i++){
      var dot=document.createElement('div');
      dot.className='beat-dot';
      dots.appendChild(dot);
    }
  }
  var dotEls=dots.children;
  for(var j=0;j<dotEls.length;j++){
    dotEls[j].classList.toggle('active',j===(G.beatCount%8));
  }

  var label=$('rhythm-label');
  label.className='';
  if(G.rhythmQuality==='perfect'){label.textContent='✦ 完美节拍';label.className='rhythm-perfect';}
  else if(G.rhythmQuality==='good'){label.textContent='● 合拍';label.className='rhythm-good';}
  else if(G.rhythmQuality==='miss'){label.textContent='✗ 偏拍';label.className='rhythm-miss';}
  else{label.textContent='—';}
}

function renderAll(){
  renderMap();
  renderStats();
  renderSonarCharges();
  renderRhythm();
}

function getRhythmQuality(){
  var now=Date.now();
  var timeSinceLastBeat=now-G.lastBeatTime;
  var timeToNextBeat=G.beatInterval-timeSinceLastBeat;
  var distToBeat=Math.min(timeSinceLastBeat,timeToNextBeat);
  if(distToBeat<=RHYTHM_WINDOW.perfect)return'perfect';
  if(distToBeat<=RHYTHM_WINDOW.good)return'good';
  return'miss';
}

function movePlayer(dir){
  if(G.state!=='playing')return;
  var dx=DIR[dir].dx,dy=DIR[dir].dy;
  var nx=G.player.x+dx,ny=G.player.y+dy;
  if(nx<0||nx>=G.mapW||ny<0||ny>=G.mapH)return;

  var quality=getRhythmQuality();
  G.rhythmQuality=quality;

  var tile=G.map[ny][nx];
  if(tile===TILE.WALL||tile===TILE.DOOR_HIDDEN){
    addLog(G.beatCount,'移动→'+dir,'撞墙',false);
    return;
  }

  var energyCost=quality==='perfect'?2:quality==='good'?4:7;
  if(G.energy<energyCost){
    addLog(G.beatCount,'移动→'+dir,'能量不足',true);
    G.deductions.push({beat:G.beatCount,type:'energy_shortage',detail:'能量不足无法移动',impact:-5});
    showToast('能量不足！','danger');
    return;
  }

  G.energy-=energyCost;
  G.player.x=nx;G.player.y=ny;
  G.steps++;
  G.revealedTiles.add(nx+','+ny);
  revealAdjacent(nx,ny);

  var logDetail='消耗'+energyCost+'能量';
  if(quality==='perfect'){
    logDetail+='(完美节拍)';
    G.bonuses.push({beat:G.beatCount,type:'perfect_beat',detail:'完美节拍移动',impact:5});
  }else if(quality==='miss'){
    logDetail+='(偏拍惩罚)';
    G.deductions.push({beat:G.beatCount,type:'rhythm_miss',detail:'偏拍移动，额外消耗'+(energyCost-2)+'能量',impact:-(energyCost-2)});
  }

  if(tile===TILE.MINE){
    G.health--;
    logDetail+='→踩雷！';
    G.deductions.push({beat:G.beatCount,type:'mine_hit',detail:'踩到地雷，生命-1',impact:-15});
    showToast('踩雷！生命-1','danger');
    G.map[ny][nx]=TILE.PATH;
    if(G.health<=0){
      addLog(G.beatCount,'移动→'+dir,logDetail,true);
      gameOver(false,'生命耗尽');
      return;
    }
  }else if(tile===TILE.DOOR_REVEALED){
    logDetail+='→通过暗门';
    G.bonuses.push({beat:G.beatCount,type:'door_pass',detail:'通过暗门捷径',impact:20});
    showToast('暗门捷径！+20','success');
  }else if(tile===TILE.EXIT){
    addLog(G.beatCount,'移动→'+dir,logDetail,false);
    gameOver(true,'成功逃出矿洞');
    return;
  }

  addLog(G.beatCount,'移动→'+dir,logDetail,quality==='miss');
  G.gameSession.actions.push({beat:G.beatCount,type:'move',dir:dir,quality:quality,pos:{x:nx,y:ny},energyCost:energyCost});
  renderAll();
}

function fireSonar(){
  if(G.state!=='playing')return;
  if(G.sonarCharges<=0){
    showToast('声呐已用完！','warning');
    addLog(G.beatCount,'声呐','无剩余脉冲',true);
    return;
  }

  var quality=getRhythmQuality();
  G.rhythmQuality=quality;

  var echoDelay=G.echoDelay;
  if(quality==='miss')echoDelay+=1;

  G.sonarCharges--;
  var pulseId=G.pendingSonar.length+1;
  var arriveBeat=G.beatCount+echoDelay;

  var pulse={
    id:pulseId,
    fireBeat:G.beatCount,
    arriveBeat:arriveBeat,
    echoDelay:echoDelay,
    quality:quality,
    pos:{x:G.player.x,y:G.player.y},
    range:3,
    result:null
  };

  if(G.modifiedPulses[pulseId]){
    pulse.echoDelay=G.modifiedPulses[pulseId].echoDelay;
    pulse.arriveBeat=pulse.fireBeat+pulse.echoDelay;
    arriveBeat=pulse.arriveBeat;
  }

  G.pendingSonar.push(pulse);

  var detail='延迟'+echoDelay+'拍';
  if(quality==='miss')detail+='(偏拍+1延迟)';
  if(quality==='perfect'){
    G.bonuses.push({beat:G.beatCount,type:'perfect_sonar',detail:'完美节拍声呐',impact:3});
    detail+='(完美节拍)';
  }

  addLog(G.beatCount,'声呐#'+pulseId,detail,quality==='miss');
  showToast('声呐脉冲#'+pulseId+' 已发射，'+echoDelay+'拍后回声到达','info');

  G.gameSession.sonarPulses.push({
    id:pulseId,
    fireBeat:G.beatCount,
    arriveBeat:arriveBeat,
    echoDelay:pulse.echoDelay,
    quality:quality,
    pos:{x:G.player.x,y:G.player.y},
    range:3
  });

  var mapCell=document.querySelector('.map-cell[data-x="'+G.player.x+'"][data-y="'+G.player.y+'"]');
  if(mapCell){
    var ring=document.querySelector('.sonar-ring');
    var rect=mapCell.getBoundingClientRect();
    var containerRect=$('map-container').getBoundingClientRect();
    ring.style.left=(rect.left-containerRect.left+rect.width/2)+'px';
    ring.style.top=(rect.top-containerRect.top+rect.height/2)+'px';
    ring.classList.remove('active');
    void ring.offsetWidth;
    ring.classList.add('active');
    setTimeout(function(){ring.classList.remove('active')},1100);
  }

  renderSonarCharges();
}

function processSonarEchoes(){
  var processed=[];
  for(var i=0;i<G.pendingSonar.length;i++){
    var ps=G.pendingSonar[i];
    if(G.beatCount>=ps.arriveBeat){
      processOneEcho(ps);
      processed.push(i);
    }
  }
  for(var j=processed.length-1;j>=0;j--){
    G.pendingSonar.splice(processed[j],1);
  }
}

function processOneEcho(pulse){
  var range=pulse.range;
  var px=pulse.pos.x,py=pulse.pos.y;
  var revealed=[];
  var doorsFound=[];

  for(var dy=-range;dy<=range;dy++){
    for(var dx=-range;dx<=range;dx++){
      if(dx*dx+dy*dy>range*range)continue;
      var nx=px+dx,ny=py+dy;
      if(nx<0||nx>=G.mapW||ny<0||ny>=G.mapH)continue;
      var key=nx+','+ny;
      G.revealedTiles.add(key);
      revealed.push({x:nx,y:ny,tile:G.map[ny][nx]});
      if(G.map[ny][nx]===TILE.DOOR_HIDDEN){
        G.map[ny][nx]=TILE.DOOR_REVEALED;
        G.doorRevealed.add(key);
        doorsFound.push({x:nx,y:ny});
      }
    }
  }

  pulse.result={revealed:revealed,doorsFound:doorsFound};

  var detail='揭示'+revealed.length+'格';
  if(doorsFound.length>0){
    detail+='，发现'+doorsFound.length+'扇暗门！';
    G.bonuses.push({beat:G.beatCount,type:'door_discovered',detail:'声呐发现暗门',impact:10});
    showToast('发现暗门！','success');
  }

  addLog(G.beatCount,'回声#'+pulse.id+'到达',detail,false);

  for(var k=0;k<G.gameSession.sonarPulses.length;k++){
    if(G.gameSession.sonarPulses[k].id===pulse.id){
      G.gameSession.sonarPulses[k].result={revealedCount:revealed.length,doorsFound:doorsFound.map(function(d){return{x:d.x,y:d.y}}),actualEchoDelay:pulse.echoDelay};
    }
  }

  if(pulse.echoDelay>G.echoDelay){
    G.deductions.push({beat:G.beatCount,type:'echo_delay_penalty',detail:'回声延迟'+pulse.echoDelay+'拍（基础'+G.echoDelay+'），信息滞后',impact:-3});
  }

  renderAll();
}

function onBeat(){
  G.beatCount++;
  G.elapsedBeats++;
  G.lastBeatTime=Date.now();

  var elapsed=(Date.now()-G.startTime)/1000;
  if(elapsed>=G.timeLimit){
    gameOver(false,'时间耗尽');
    return;
  }

  processSonarEchoes();
  renderRhythm();
  renderStats();
  renderSonarCharges();

  G.rhythmQuality='none';
  setTimeout(function(){
    var label=$('rhythm-label');
    label.textContent='—';label.className='';
  },200);
}

function startGame(diff){
  var customCfg=null;
  var useCustom=$('use-custom-cfg');
  if(useCustom&&useCustom.checked){
    customCfg={
      echoDelay:parseInt($('cfg-echo-delay').value)||3,
      sonarCharges:parseInt($('cfg-sonar-charges').value)||5,
      maxEnergy:parseInt($('cfg-max-energy').value)||80,
      bpm:parseInt($('cfg-bpm').value)||120,
      timeLimit:parseInt($('cfg-time-limit').value)||90
    };
  }
  initGame(diff,customCfg);
  G.state='playing';
  G.startTime=Date.now();

  $('start-screen').classList.remove('active');
  $('game-screen').classList.add('active');

  renderAll();
  addLog(0,'开始','难度：'+{easy:'简单',normal:'普通',hard:'困难'}[diff],false);

  G.beatTimer=setInterval(onBeat,G.beatInterval);
  G.lastBeatTime=Date.now();

  startRenderLoop();
}

function startRenderLoop(){
  function loop(){
    if(G.state==='playing'){
      renderRhythm();
      renderStats();
    }
    G.renderRAF=requestAnimationFrame(loop);
  }
  G.renderRAF=requestAnimationFrame(loop);
}

function pauseGame(){
  if(G.state!=='playing')return;
  G.state='paused';
  clearInterval(G.beatTimer);
  cancelAnimationFrame(G.renderRAF);
  $('pause-overlay').classList.add('active');
}

function resumeGame(){
  if(G.state!=='paused')return;
  G.state='playing';
  $('pause-overlay').classList.remove('active');
  G.lastBeatTime=Date.now();
  G.beatTimer=setInterval(onBeat,G.beatInterval);
  startRenderLoop();
  G.rhythmQuality='none';
  renderAll();
}

function gameOver(escaped,reason){
  G.state='gameover';
  clearInterval(G.beatTimer);
  cancelAnimationFrame(G.renderRAF);

  var elapsed=(Date.now()-G.startTime)/1000;
  var baseScore=escaped?100:20;
  var timeBonus=escaped?Math.round(Math.max(0,(G.timeLimit-elapsed)/G.timeLimit*50)):0;
  var energyBonus=Math.round(G.energy/G.maxEnergy*20);
  var doorBonus=G.doorRevealed.size*10;
  var deductionTotal=0;
  var bonusTotal=0;

  for(var i=0;i<G.deductions.length;i++)deductionTotal+=G.deductions[i].impact;
  for(var j=0;j<G.bonuses.length;j++)bonusTotal+=G.bonuses[j].impact;

  var totalScore=Math.max(0,baseScore+timeBonus+energyBonus+doorBonus+deductionTotal+bonusTotal);

  G.gameSession.endTime=Date.now();
  G.gameSession.result={
    escaped:escaped,
    reason:reason,
    totalScore:totalScore,
    baseScore:baseScore,
    timeBonus:timeBonus,
    energyBonus:energyBonus,
    doorBonus:doorBonus,
    deductionTotal:deductionTotal,
    bonusTotal:bonusTotal,
    elapsedSeconds:Math.round(elapsed),
    steps:G.steps,
    deductions:JSON.parse(JSON.stringify(G.deductions)),
    bonuses:JSON.parse(JSON.stringify(G.bonuses)),
    finalPlayerPos:{x:G.player.x,y:G.player.y},
    finalHealth:G.health,
    finalEnergy:Math.round(G.energy)
  };

  saveGameToHistory(G.gameSession);

  $('gameover-title').textContent=escaped?'🎉 逃生成功！':'💀 逃生失败';
  $('gameover-title').style.color=escaped?'var(--success)':'var(--danger)';
  $('gameover-summary').innerHTML=
    '<div class="score">'+totalScore+'分</div>'+
    '<div class="breakdown">'+
    '基础分: '+baseScore+' | 时间奖励: +'+timeBonus+' | 能量奖励: +'+energyBonus+'<br>'+
    '暗门奖励: +'+doorBonus+' | 扣分: '+deductionTotal+' | 加分: +'+bonusTotal+'<br>'+
    '用时: '+formatTime(elapsed)+' | 步数: '+G.steps+'<br>'+
    '原因: '+reason+
    '</div>';

  $('gameover-overlay').classList.add('active');
  $('replay-btn').style.display=escaped?'none':'inline-block';
}

function saveGameToHistory(session){
  G.gameHistory=loadHistory();
  G.gameHistory.push(session);
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(G.gameHistory));}catch(e){}
}

function loadHistory(){
  try{
    var data=localStorage.getItem(STORAGE_KEY);
    return data?JSON.parse(data):[];
  }catch(e){return[];}
}

function clearHistory(){
  try{localStorage.removeItem(STORAGE_KEY);}catch(e){}
  G.gameHistory=[];
  showToast('历史已清空','info');
  renderHistory();
}

function renderHistory(){
  var history=loadHistory();
  var c=$('history-content');
  if(!history.length){c.innerHTML='<p style="text-align:center;color:var(--fg3)">暂无记录</p>';return;}

  c.innerHTML='';
  for(var i=history.length-1;i>=0;i--){
    var s=history[i];
    var item=document.createElement('div');
    item.className='history-item';
    var result=s.result||{};
    var escaped=result.escaped;
    item.innerHTML=
      '<div class="hi-header">'+
        '<span class="hi-id">'+s.id+(s.config&&s.config._custom?'<span class="config-badge">自定义</span>':'')+'</span>'+
        '<span class="hi-score" style="color:'+(escaped?'var(--success)':'var(--danger)')+'">'+(result.totalScore||0)+'分</span>'+
      '</div>'+
      '<div class="hi-meta">'+
        {easy:'简单',normal:'普通',hard:'困难'}[s.difficulty]+' | '+
        (escaped?'逃生成功':'逃生失败')+' | '+
        '步数:'+(result.steps||0)+' | '+
        formatTime(result.elapsedSeconds||0)+
      '</div>'+
      '<div class="history-config">'+
        '<span>回声延迟:'+(s.config?s.config.echoDelay:'?')+'拍</span>'+
        '<span>脉冲数:'+(s.config?s.config.sonarCharges:'?')+'</span>'+
        '<span>BPM:'+(s.config?s.config.bpm:'?')+'</span>'+
      '</div>';

    (function(session){
      item.addEventListener('click',function(){
        showReportForSession(session);
        $('history-overlay').classList.remove('active');
      });
    })(s);

    c.appendChild(item);
  }
}

function showReportForSession(session){
  var r=session.result;
  if(!r)return;
  var c=$('report-content');

  var html='<div class="report-section"><h3>总览</h3>';
  html+='<table class="report-table">';
  html+='<tr><th>项目</th><th>数值</th></tr>';
  html+='<tr><td>总分</td><td><strong>'+r.totalScore+'</strong></td></tr>';
  html+='<tr><td>是否逃生</td><td>'+(r.escaped?'✅ 是':'❌ 否')+'</td></tr>';
  html+='<tr><td>难度</td><td>'+{easy:'简单',normal:'普通',hard:'困难'}[session.difficulty]+'</td></tr>';
  html+='<tr><td>用时</td><td>'+formatTime(r.elapsedSeconds)+'</td></tr>';
  html+='<tr><td>步数</td><td>'+r.steps+'</td></tr>';
  html+='<tr><td>剩余生命</td><td>'+r.finalHealth+'/3</td></tr>';
  html+='<tr><td>剩余能量</td><td>'+r.finalEnergy+'</td></tr>';
  html+='</table></div>';

  html+='<div class="report-section"><h3>脉冲配置'+(session.config&&session.config._custom?' <span class="config-badge">自定义</span>':'')+'</h3>';
  html+='<table class="report-table">';
  html+='<tr><th>参数</th><th>数值</th></tr>';
  if(session.config){
    html+='<tr><td>回声延迟</td><td>'+session.config.echoDelay+'拍</td></tr>';
    html+='<tr><td>声呐脉冲数</td><td>'+session.config.sonarCharges+'</td></tr>';
    html+='<tr><td>起始能量</td><td>'+session.config.maxEnergy+'</td></tr>';
    html+='<tr><td>BPM</td><td>'+session.config.bpm+'</td></tr>';
    html+='<tr><td>时间限制</td><td>'+session.config.timeLimit+'秒</td></tr>';
  }
  html+='</table></div>';

  html+='<div class="report-section"><h3>分数构成</h3>';
  html+='<table class="report-table">';
  html+='<tr><th>项目</th><th>分值</th></tr>';
  html+='<tr class="bonus-row"><td>基础分</td><td>+'+r.baseScore+'</td></tr>';
  html+='<tr class="bonus-row"><td>时间奖励</td><td>+'+r.timeBonus+'</td></tr>';
  html+='<tr class="bonus-row"><td>能量奖励</td><td>+'+r.energyBonus+'</td></tr>';
  html+='<tr class="bonus-row"><td>暗门奖励</td><td>+'+r.doorBonus+'</td></tr>';
  html+='<tr class="deduction-row"><td>扣分合计</td><td>'+r.deductionTotal+'</td></tr>';
  html+='<tr class="bonus-row"><td>加分合计</td><td>+'+r.bonusTotal+'</td></tr>';
  html+='</table></div>';

  if(r.deductions&&r.deductions.length){
    html+='<div class="report-section"><h3>扣分明细（可追溯）</h3>';
    html+='<table class="report-table">';
    html+='<tr><th>Beat</th><th>类型</th><th>详情</th><th>影响</th><th></th></tr>';
    for(var i=0;i<r.deductions.length;i++){
      var d=r.deductions[i];
      html+='<tr class="deduction-row">';
      html+='<td>B'+d.beat+'</td>';
      html+='<td>'+deductionTypeLabel(d.type)+'</td>';
      html+='<td>'+d.detail+'</td>';
      html+='<td>'+d.impact+'</td>';
      html+='<td><span class="audit-link" data-beat="'+d.beat+'" data-type="deduction" data-idx="'+i+'">追溯</span></td>';
      html+='</tr>';
    }
    html+='</table></div>';
  }

  if(r.bonuses&&r.bonuses.length){
    html+='<div class="report-section"><h3>加分明细</h3>';
    html+='<table class="report-table">';
    html+='<tr><th>Beat</th><th>类型</th><th>详情</th><th>影响</th></tr>';
    for(var j=0;j<r.bonuses.length;j++){
      var b=r.bonuses[j];
      html+='<tr class="bonus-row">';
      html+='<td>B'+b.beat+'</td>';
      html+='<td>'+bonusTypeLabel(b.type)+'</td>';
      html+='<td>'+b.detail+'</td>';
      html+='<td>+'+b.impact+'</td>';
      html+='</tr>';
    }
    html+='</table></div>';
  }

  if(session.sonarPulses&&session.sonarPulses.length){
    html+='<div class="report-section"><h3>声呐脉冲记录</h3>';
    html+='<table class="report-table">';
    html+='<tr><th>ID</th><th>发射Beat</th><th>到达Beat</th><th>延迟</th><th>节拍</th><th>位置</th><th>结果</th></tr>';
    for(var k=0;k<session.sonarPulses.length;k++){
      var p=session.sonarPulses[k];
      var pr=p.result;
      html+='<tr>';
      html+='<td>#'+p.id+'</td>';
      html+='<td>B'+p.fireBeat+'</td>';
      html+='<td>B'+p.arriveBeat+'</td>';
      html+='<td>'+p.echoDelay+'拍</td>';
      html+='<td>'+{perfect:'完美',good:'合拍',miss:'偏拍'}[p.quality||'good']+'</td>';
      html+='<td>('+p.pos.x+','+p.pos.y+')</td>';
      html+='<td>'+(pr?'揭示'+pr.revealedCount+'格'+(pr.doorsFound.length?',发现'+pr.doorsFound.length+'暗门':''):'—')+'</td>';
      html+='</tr>';
    }
    html+='</table></div>';
  }

  if(session.hiddenDoors&&session.hiddenDoors.length){
    html+='<div class="report-section"><h3>暗门原始记录</h3>';
    html+='<table class="report-table">';
    html+='<tr><th>ID</th><th>位置</th><th>地图状态</th></tr>';
    for(var m=0;m<session.hiddenDoors.length;m++){
      var hd=session.hiddenDoors[m];
      var wasRevealed=r.deductions&&r.deductions.some?false:false;
      var doorInResult=session.sonarPulses&&session.sonarPulses.filter(function(sp){return sp.result&&sp.result.doorsFound&&sp.result.doorsFound.some(function(df){return df.x===hd.x&&df.y===hd.y})}).length>0;
      html+='<tr>';
      html+='<td>#'+hd.id+'</td>';
      html+='<td>('+hd.x+','+hd.y+')</td>';
      html+='<td>'+(doorInResult?'✅ 已发现':'❌ 未发现')+'</td>';
      html+='</tr>';
    }
    html+='</table></div>';
  }

  html+='<div class="report-section"><h3>矿洞地图快照（起始状态）</h3>';
  html+='<div style="font-size:10px;line-height:1.2;font-family:monospace;background:var(--bg);padding:8px;border-radius:4px;overflow-x:auto">';
  var sm=session.mapSnapshot;
  for(var my=0;my<sm.length;my++){
    var row='';
    for(var mx=0;mx<sm[my].length;mx++){
      switch(sm[my][mx]){
        case TILE.WALL:row+='██';break;
        case TILE.PATH:row+='··';break;
        case TILE.MINE:row+='✦✦';break;
        case TILE.DOOR_HIDDEN:row+='◈◈';break;
        case TILE.DOOR_REVEALED:row+='◈◈';break;
        case TILE.EXIT:row+='⬡⬡';break;
        default:row+='??';
      }
    }
    html+=row+'<br>';
  }
  html+='</div></div>';

  html+='<div class="report-section"><h3>审计追溯（点击"追溯"查看上下文）</h3>';
  html+='<div id="audit-details"></div></div>';

  c.innerHTML=html;

  c.querySelectorAll('.audit-link').forEach(function(link){
    link.addEventListener('click',function(){
      var beat=parseInt(this.dataset.beat);
      var type=this.dataset.type;
      var idx=parseInt(this.dataset.idx);
      showAuditDetail(session,beat,type,idx);
    });
  });

  $('report-overlay').classList.add('active');
}

function showAuditDetail(session,beat,type,idx){
  var container=document.getElementById('audit-details');
  if(!container)return;

  var existing=container.querySelector('.audit-detail[data-beat="'+beat+'"]');
  if(existing){existing.classList.toggle('visible');return;}

  var detail=document.createElement('div');
  detail.className='audit-detail';
  detail.dataset.beat=beat;

  var html='<strong>Beat '+beat+' 上下文</strong><br>';

  var actionsAtBeat=session.actions?session.actions.filter(function(a){return a.beat===beat}):[];
  if(actionsAtBeat.length){
    html+='操作：<br>';
    for(var i=0;i<actionsAtBeat.length;i++){
      var a=actionsAtBeat[i];
      html+='  '+a.type+(a.dir?' →'+a.dir:'')+' 节拍:'+({perfect:'完美',good:'合拍',miss:'偏拍'}[a.quality||''])+' 位置:('+a.pos.x+','+a.pos.y+')<br>';
    }
  }

  var pulsesAtBeat=session.sonarPulses?session.sonarPulses.filter(function(p){return p.fireBeat===beat||p.arriveBeat===beat}):[];
  if(pulsesAtBeat.length){
    html+='声呐：<br>';
    for(var j=0;j<pulsesAtBeat.length;j++){
      var p=pulsesAtBeat[j];
      if(p.fireBeat===beat)html+='  脉冲#'+p.id+' 发射 (延迟'+p.echoDelay+'拍)<br>';
      if(p.arriveBeat===beat)html+='  脉冲#'+p.id+' 回声到达'+(p.result?' 揭示'+p.result.revealedCount+'格':'')+'<br>';
    }
  }

  if(type==='deduction'&&session.result&&session.result.deductions&&session.result.deductions[idx]){
    var d=session.result.deductions[idx];
    html+='扣分原因：'+d.detail+' (影响: '+d.impact+'分)<br>';
    if(d.type==='echo_delay_penalty'){
      html+='<em>此扣分由回声延迟导致：声呐信息滞后使决策基于过时地形数据</em><br>';
    }else if(d.type==='rhythm_miss'){
      html+='<em>此扣分由节拍错位导致：操作未与节拍同步，额外消耗资源</em><br>';
    }else if(d.type==='mine_hit'){
      html+='<em>此扣分由踩雷导致：可能在回声延迟期间误入雷区</em><br>';
    }
  }

  var nearbyDoors=session.hiddenDoors?session.hiddenDoors.filter(function(hd){
    return Math.abs(hd.x-(actionsAtBeat.length?actionsAtBeat[0].pos.x:0))<=3&&Math.abs(hd.y-(actionsAtBeat.length?actionsAtBeat[0].pos.y:0))<=3;
  }):[];
  if(nearbyDoors.length){
    html+='附近暗门：<br>';
    for(var k=0;k<nearbyDoors.length;k++){
      html+='  暗门#'+nearbyDoors[k].id+' 位置:('+nearbyDoors[k].x+','+nearbyDoors[k].y+')<br>';
    }
  }

  detail.innerHTML=html;
  detail.classList.add('visible');
  container.appendChild(detail);
}

function deductionTypeLabel(t){
  var map={rhythm_miss:'节拍错位',echo_delay_penalty:'回声延迟',mine_hit:'踩雷',energy_shortage:'能量不足'};
  return map[t]||t;
}
function bonusTypeLabel(t){
  var map={perfect_beat:'完美节拍',perfect_sonar:'完美声呐',door_discovered:'发现暗门',door_pass:'通过暗门'};
  return map[t]||t;
}

function exportReport(){
  if(!G.gameSession||!G.gameSession.result)return;
  var data=JSON.stringify(G.gameSession,null,2);
  var blob=new Blob([data],{type:'application/json'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;a.download='sonar-escape-report-'+G.gameSession.id+'.json';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('报告已导出','success');
}

function startReplay(){
  if(!G.gameSession)return;
  G.replayData={
    session:G.gameSession,
    currentBeat:0,
    maxBeat:G.beatCount,
    playing:false,
    timer:null
  };

  $('gameover-overlay').classList.remove('active');
  $('replay-overlay').classList.add('active');
  renderReplayMap(0);
}

function renderReplayMap(beat){
  var session=G.replayData.session;
  var mapSnap=JSON.parse(JSON.stringify(session.mapSnapshot));
  var revealedSet=new Set();
  var playerPos={x:session.mapSnapshot[0]?0:0,y:0};

  for(var y=0;y<session.mapSnapshot.length;y++){
    for(var x=0;x<session.mapSnapshot[y].length;x++){
      if(session.mapSnapshot[y][x]===TILE.PATH||session.mapSnapshot[y][x]===TILE.EXIT){
        if(y<=1&&x<=1){playerPos={x:x,y:y};}
      }
    }
  }

  revealedSet.add(playerPos.x+','+playerPos.y);
  for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){
    var nx=playerPos.x+dx,ny=playerPos.y+dy;
    if(nx>=0&&ny>=0&&ny<mapSnap.length&&nx<mapSnap[0].length)revealedSet.add(nx+','+ny);
  }

  var actions=session.actions||[];
  var pulses=session.sonarPulses||[];

  for(var i=0;i<actions.length;i++){
    if(actions[i].beat>beat)break;
    playerPos={x:actions[i].pos.x,y:actions[i].pos.y};
    revealedSet.add(playerPos.x+','+playerPos.y);
    for(var dy2=-1;dy2<=1;dy2++)for(var dx2=-1;dx2<=1;dx2++){
      var nx2=playerPos.x+dx2,ny2=playerPos.y+dy2;
      if(nx2>=0&&ny2>=0&&ny2<mapSnap.length&&nx2<mapSnap[0].length)revealedSet.add(nx2+','+ny2);
    }
  }

  for(var j=0;j<pulses.length;j++){
    var p=pulses[j];
    if(p.arriveBeat>beat)continue;
    var range=3;
    for(var dy3=-range;dy3<=range;dy3++){
      for(var dx3=-range;dx3<=range;dx3++){
        if(dx3*dx3+dy3*dy3>range*range)continue;
        var nx3=p.pos.x+dx3,ny3=p.pos.y+dy3;
        if(nx3>=0&&ny3>=0&&ny3<mapSnap.length&&nx3<mapSnap[0].length){
          revealedSet.add(nx3+','+ny3);
          if(mapSnap[ny3][nx3]===TILE.DOOR_HIDDEN)mapSnap[ny3][nx3]=TILE.DOOR_REVEALED;
        }
      }
    }
  }

  var mapEl=$('replay-map');
  var w=mapSnap[0].length,h=mapSnap.length;
  mapEl.style.gridTemplateColumns='repeat('+w+',24px)';
  mapEl.innerHTML='';

  for(var ry=0;ry<h;ry++){
    for(var rx=0;rx<w;rx++){
      var cell=document.createElement('div');
      cell.className='map-cell';
      cell.style.width='24px';cell.style.height='24px';cell.style.fontSize='11px';
      var isRevealed=revealedSet.has(rx+','+ry);
      var isPlayer=(rx===playerPos.x&&ry===playerPos.y);
      var tile=mapSnap[ry][rx];

      if(isPlayer){
        cell.classList.add('player-cell');cell.textContent='◎';
      }else if(!isRevealed){
        cell.classList.add('fog');
      }else{
        switch(tile){
          case TILE.WALL:cell.classList.add('wall-revealed');cell.textContent='▪';break;
          case TILE.PATH:cell.classList.add('revealed');cell.textContent='·';break;
          case TILE.MINE:cell.classList.add('mine-revealed');cell.textContent='✦';break;
          case TILE.DOOR_HIDDEN:cell.classList.add('wall-revealed');cell.textContent='▪';break;
          case TILE.DOOR_REVEALED:cell.classList.add('door-revealed');cell.textContent='◈';break;
          case TILE.EXIT:cell.classList.add('exit-cell');cell.textContent='⬡';break;
        }
      }
      mapEl.appendChild(cell);
    }
  }

  $('replay-beat-label').textContent='Beat '+beat+' / '+G.replayData.maxBeat;
  G.replayData.currentBeat=beat;
}

function toggleReplayPlay(){
  if(!G.replayData)return;
  if(G.replayData.playing){
    G.replayData.playing=false;
    clearInterval(G.replayData.timer);
    $('replay-play-btn').textContent='▶';
  }else{
    G.replayData.playing=true;
    $('replay-play-btn').textContent='⏸';
    G.replayData.timer=setInterval(function(){
      if(G.replayData.currentBeat>=G.replayData.maxBeat){
        G.replayData.playing=false;
        clearInterval(G.replayData.timer);
        $('replay-play-btn').textContent='▶';
        return;
      }
      renderReplayMap(G.replayData.currentBeat+1);
    },300);
  }
}

function closeReplay(){
  if(G.replayData&&G.replayData.timer)clearInterval(G.replayData.timer);
  G.replayData=null;
  $('replay-overlay').classList.remove('active');
  $('gameover-overlay').classList.add('active');
}

function resetGame(){
  G.state='menu';
  clearInterval(G.beatTimer);
  cancelAnimationFrame(G.renderRAF);
  G.pendingSonar=[];
  G.deductions=[];
  G.bonuses=[];
  G.auditLog=[];
  G.rhythmQuality='none';
  G.gameSession=null;
  G.modifiedPulses={};
  $('action-log').innerHTML='';
  $('beat-dots').innerHTML='';
  if($('use-custom-cfg'))$('use-custom-cfg').checked=false;
  if($('config-fields'))$('config-fields').style.display='none';
  syncConfigDefaults();

  $('gameover-overlay').classList.remove('active');
  $('pause-overlay').classList.remove('active');
  $('report-overlay').classList.remove('active');
  $('game-screen').classList.remove('active');
  $('start-screen').classList.add('active');
}

function modifyPulseConfig(pulseId,newDelay){
  G.modifiedPulses[pulseId]={echoDelay:newDelay};
}

function syncConfigDefaults(){
  var cfg=DIFFICULTY[G.difficulty];
  if($('cfg-echo-delay'))$('cfg-echo-delay').value=cfg.echoDelay;
  if($('cfg-sonar-charges'))$('cfg-sonar-charges').value=cfg.sonarCharges;
  if($('cfg-max-energy'))$('cfg-max-energy').value=cfg.maxEnergy;
  if($('cfg-bpm'))$('cfg-bpm').value=cfg.bpm;
  if($('cfg-time-limit'))$('cfg-time-limit').value=cfg.timeLimit;
}

function bindEvents(){
  $('start-btn').addEventListener('click',function(){
    startGame(G.difficulty);
  });

  $('history-btn').addEventListener('click',function(){
    renderHistory();
    $('history-overlay').classList.add('active');
  });

  $$('.diff-btn').forEach(function(btn){
    btn.addEventListener('click',function(){
      $$('.diff-btn').forEach(function(b){b.classList.remove('active')});
      this.classList.add('active');
      G.difficulty=this.dataset.diff;
      syncConfigDefaults();
    });
  });

  $('use-custom-cfg').addEventListener('change',function(){
    $('config-fields').style.display=this.checked?'block':'none';
    if(this.checked)syncConfigDefaults();
  });

  $('pause-btn').addEventListener('click',pauseGame);
  $('resume-btn').addEventListener('click',resumeGame);
  $('quit-btn').addEventListener('click',function(){
    $('pause-overlay').classList.remove('active');
    gameOver(false,'主动放弃');
  });

  $('view-report-btn').addEventListener('click',function(){
    $('gameover-overlay').classList.remove('active');
    showReportForSession(G.gameSession);
  });

  $('replay-btn').addEventListener('click',startReplay);
  $('retry-btn').addEventListener('click',resetGame);

  $('export-report-btn').addEventListener('click',exportReport);
  $('close-report-btn').addEventListener('click',function(){
    $('report-overlay').classList.remove('active');
    if(G.state==='gameover')$('gameover-overlay').classList.add('active');
  });

  $('report-btn').addEventListener('click',function(){
    if(G.state==='playing')pauseGame();
    if(G.gameSession&&G.gameSession.result)showReportForSession(G.gameSession);
  });

  $('clear-history-btn').addEventListener('click',clearHistory);
  $('close-history-btn').addEventListener('click',function(){
    $('history-overlay').classList.remove('active');
  });

  $('replay-play-btn').addEventListener('click',toggleReplayPlay);
  $('replay-close-btn').addEventListener('click',closeReplay);

  document.addEventListener('keydown',function(e){
    if(G.state==='playing'){
      switch(e.key){
        case'ArrowUp':case'w':case'W':e.preventDefault();movePlayer('up');break;
        case'ArrowDown':case's':case'S':e.preventDefault();movePlayer('down');break;
        case'ArrowLeft':case'a':case'A':e.preventDefault();movePlayer('left');break;
        case'ArrowRight':case'd':case'D':e.preventDefault();movePlayer('right');break;
        case' ':e.preventDefault();fireSonar();break;
        case'p':case'P':case'Escape':pauseGame();break;
      }
    }else if(G.state==='paused'){
      if(e.key==='p'||e.key==='P'||e.key==='Escape')resumeGame();
    }
  });

  window.addEventListener('blur',function(){
    if(G.state==='playing')pauseGame();
  });
}

bindEvents();
syncConfigDefaults();

})();
