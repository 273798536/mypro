(function(){
var TOTAL_ROUNDS=8;
var BANDS=[
  {name:'低频',min:60,max:250,color:'#ff5252'},
  {name:'中低频',min:250,max:500,color:'#ffab40'},
  {name:'中频',min:500,max:2000,color:'#ffd740'},
  {name:'中高频',min:2000,max:4000,color:'#69f0ae'},
  {name:'高频',min:4000,max:8000,color:'#00e5ff'}
];
var state={
  round:0,score:0,aliasCount:0,beatErrCount:0,phase:'idle',
  history:[],timeline:[],currentFish:[],currentRoundData:null,corrections:[]
};

var spectrumCanvas=document.getElementById('spectrumCanvas');
var sCtx=spectrumCanvas.getContext('2d');
var beatCanvas=document.getElementById('beatCanvas');
var bCtx=beatCanvas.getContext('2d');
var filterTypeEl=document.getElementById('filterType');
var cutoffFreqEl=document.getElementById('cutoffFreq');
var filterQEl=document.getElementById('filterQ');
var cutoffDisplayEl=document.getElementById('cutoffDisplay');
var qDisplayEl=document.getElementById('qDisplay');
var castBtn=document.getElementById('castBtn');
var roundBanner=document.getElementById('roundBanner');
var judgmentSection=document.getElementById('judgmentSection');
var judgmentList=document.getElementById('judgmentList');
var waveTime=0,fishAnimTime=0;

function resizeCanvas(){
  spectrumCanvas.width=spectrumCanvas.parentElement.clientWidth;
  spectrumCanvas.height=320;
  beatCanvas.width=beatCanvas.parentElement.clientWidth-28;
  beatCanvas.height=80;
}
window.addEventListener('resize',resizeCanvas);
resizeCanvas();

function showToast(msg){
  var t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  setTimeout(function(){t.classList.remove('show');},2000);
}

function showScorePopup(x,y,pts,positive){
  var el=document.createElement('div');
  el.className='score-popup';el.style.left=x+'px';el.style.top=y+'px';
  el.style.color=positive?'var(--accent-green)':'var(--accent-red)';
  el.textContent=(positive?'+':'')+pts;
  spectrumCanvas.parentElement.appendChild(el);
  setTimeout(function(){el.remove();},1000);
}

function rand(a,b){return Math.random()*(b-a)+a;}
function randInt(a,b){return Math.floor(rand(a,b+1));}

function hexToRgba(hex,a){
  var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return 'rgba('+r+','+g+','+b+','+a+')';
}

function generateRound(){
  var tbi=randInt(0,BANDS.length-1),tb=BANDS[tbi];
  var ha=Math.random()<0.45,abi=-1,ao=0;
  if(ha){
    if(tbi<BANDS.length-1&&Math.random()<0.6)abi=tbi+1;
    else if(tbi>0)abi=tbi-1;
    if(abi>=0)ao=rand(0.15,0.45);else ha=false;
  }
  var hbe=Math.random()<0.35,bo=hbe?randInt(20,120):0;
  var bpm=[80,100,120,140,160][randInt(0,4)];
  var fish=[];
  fish.push({
    bandIdx:tbi,freq:rand(tb.min,tb.max),amp:rand(0.6,1.0),size:rand(28,42),
    x:rand(80,spectrumCanvas.width-80),y:rand(60,260),
    vx:rand(-1.5,1.5),vy:rand(-0.5,0.5),isTarget:true,caught:false
  });
  if(ha&&abi>=0){
    var ab=BANDS[abi];
    var of2=abi>tbi?rand(tb.max*(1-ao),tb.max):rand(tb.min,tb.min*(1+ao));
    of2=Math.max(ab.min,Math.min(ab.max,of2));
    fish.push({
      bandIdx:abi,freq:of2,amp:rand(0.4,0.8),size:rand(22,34),
      x:rand(80,spectrumCanvas.width-80),y:rand(60,260),
      vx:rand(-1.2,1.2),vy:rand(-0.4,0.4),isTarget:false,isAlias:true,caught:false
    });
  }
  var di=[];
  for(var i=0;i<BANDS.length;i++){if(i!==tbi&&i!==abi)di.push(i);}
  for(var d=0;d<randInt(1,Math.min(3,di.length));d++){
    var idx=di[randInt(0,di.length-1)],db=BANDS[idx];
    fish.push({
      bandIdx:idx,freq:rand(db.min,db.max),amp:rand(0.2,0.5),size:rand(16,24),
      x:rand(80,spectrumCanvas.width-80),y:rand(60,260),
      vx:rand(-0.8,0.8),vy:rand(-0.3,0.3),isTarget:false,caught:false
    });
  }
  return {roundNum:state.round,targetBandIdx:tbi,targetBand:tb,hasAliasing:ha,aliasBandIdx:abi,aliasOverlap:ao,hasBeatError:hbe,beatOffset:bo,bpm:bpm,fish:fish};
}

function drawSpectrumSea(){
  var w=spectrumCanvas.width,h=spectrumCanvas.height;
  sCtx.clearRect(0,0,w,h);
  var gr=sCtx.createLinearGradient(0,0,0,h);
  gr.addColorStop(0,'#0d1b2a');gr.addColorStop(1,'#1a237e');
  sCtx.fillStyle=gr;sCtx.fillRect(0,0,w,h);
  for(var i=0;i<5;i++){
    sCtx.beginPath();sCtx.strokeStyle='rgba(0,229,255,'+(0.06+i*0.02)+')';sCtx.lineWidth=1;
    for(var x=0;x<w;x+=2){
      var y=h*(0.3+i*0.12)+Math.sin(x*0.01+waveTime+i)*15+Math.sin(x*0.005+waveTime*0.7)*8;
      if(x===0)sCtx.moveTo(x,y);else sCtx.lineTo(x,y);
    }
    sCtx.stroke();
  }
  var rd=state.currentRoundData;
  if(rd){
    for(var bi=0;bi<BANDS.length;bi++){
      var band=BANDS[bi],x1=(band.min/8000)*w,x2=(band.max/8000)*w;
      var isA=bi===rd.targetBandIdx||bi===rd.aliasBandIdx;
      sCtx.fillStyle=isA?hexToRgba(band.color,0.1):'rgba(255,255,255,0.02)';
      sCtx.fillRect(x1,0,x2-x1,h);
      sCtx.fillStyle=isA?hexToRgba(band.color,0.6):'rgba(255,255,255,0.15)';
      sCtx.font='11px sans-serif';sCtx.fillText(band.name,x1+4,h-8);
    }
  }
  state.currentFish.forEach(function(f){if(!f.caught)drawFish(f);});
}

function drawFish(f){
  var band=BANDS[f.bandIdx],x=f.x,y=f.y,sz=f.size,dir=f.vx>=0?1:-1;
  sCtx.save();sCtx.translate(x,y);sCtx.scale(dir,1);
  var bg=sCtx.createRadialGradient(0,0,2,0,0,sz);
  bg.addColorStop(0,hexToRgba(band.color,0.9));bg.addColorStop(1,hexToRgba(band.color,0.3));
  sCtx.fillStyle=bg;sCtx.beginPath();sCtx.ellipse(0,0,sz,sz*0.55,0,0,Math.PI*2);sCtx.fill();
  sCtx.beginPath();sCtx.moveTo(-sz,0);sCtx.lineTo(-sz-sz*0.4,-sz*0.35);sCtx.lineTo(-sz-sz*0.4,sz*0.35);sCtx.closePath();sCtx.fill();
  sCtx.fillStyle='#fff';sCtx.beginPath();sCtx.arc(sz*0.35,-sz*0.1,sz*0.12,0,Math.PI*2);sCtx.fill();
  sCtx.fillStyle='#111';sCtx.beginPath();sCtx.arc(sz*0.38,-sz*0.1,sz*0.06,0,Math.PI*2);sCtx.fill();
  if(f.isTarget){
    sCtx.strokeStyle=hexToRgba('#ffd740',0.6+Math.sin(fishAnimTime*3)*0.3);
    sCtx.lineWidth=2;sCtx.setLineDash([4,4]);
    sCtx.beginPath();sCtx.ellipse(0,0,sz+8,sz*0.55+6,0,0,Math.PI*2);sCtx.stroke();sCtx.setLineDash([]);
  }
  if(f.isAlias){
    sCtx.strokeStyle=hexToRgba('#ff5252',0.5+Math.sin(fishAnimTime*4)*0.3);
    sCtx.lineWidth=1.5;sCtx.setLineDash([3,3]);
    sCtx.beginPath();sCtx.ellipse(0,0,sz+6,sz*0.55+5,0,0,Math.PI*2);sCtx.stroke();sCtx.setLineDash([]);
  }
  sCtx.restore();
  sCtx.fillStyle=hexToRgba(band.color,0.7);sCtx.font='10px sans-serif';sCtx.textAlign='center';
  sCtx.fillText(Math.round(f.freq)+'Hz',x,y+sz*0.55+14);sCtx.textAlign='start';
}

function drawBeatTrack(){
  var w=beatCanvas.width,h=beatCanvas.height;
  bCtx.clearRect(0,0,w,h);bCtx.fillStyle='#0a0e1a';bCtx.fillRect(0,0,w,h);
  var rd=state.currentRoundData;
  if(!rd){bCtx.fillStyle='rgba(255,255,255,0.1)';bCtx.font='11px sans-serif';bCtx.fillText('等待开始...',10,h/2);return;}
  var bi2=60000/rd.bpm,off=rd.hasBeatError?rd.beatOffset:0;
  bCtx.strokeStyle='rgba(255,255,255,0.06)';bCtx.lineWidth=1;
  for(var y=0;y<h;y+=10){bCtx.beginPath();bCtx.moveTo(0,y);bCtx.lineTo(w,y);bCtx.stroke();}
  var bw=w/8;
  for(var i=0;i<8;i++){
    var bx=i*bw;
    bCtx.fillStyle='rgba(255,215,64,0.5)';bCtx.fillRect(bx,8,2,h-16);
    if(off>0){bCtx.fillStyle='rgba(255,82,82,0.5)';bCtx.fillRect(bx+(off/bi2)*bw,8,1.5,h-16);}
  }
  var pos=(fishAnimTime*80)%w;
  bCtx.strokeStyle='rgba(0,229,255,0.4)';bCtx.lineWidth=2;bCtx.beginPath();bCtx.moveTo(pos,0);bCtx.lineTo(pos,h);bCtx.stroke();
  bCtx.fillStyle='rgba(255,255,255,0.3)';bCtx.font='10px sans-serif';bCtx.fillText('BPM: '+rd.bpm,4,h-4);
  if(rd.hasBeatError){bCtx.fillStyle='rgba(255,82,82,0.7)';bCtx.fillText('偏移: +'+off+'ms',70,h-4);}
}

function animate(){
  waveTime+=0.02;fishAnimTime+=0.016;
  var w=spectrumCanvas.width;
  state.currentFish.forEach(function(f){
    if(f.caught)return;
    f.x+=f.vx;f.y+=f.vy+Math.sin(fishAnimTime*2+f.x*0.01)*0.3;
    if(f.x<40||f.x>w-40)f.vx*=-1;
    if(f.y<40||f.y>280)f.vy*=-1;
  });
  drawSpectrumSea();drawBeatTrack();requestAnimationFrame(animate);
}

function startRound(){
  state.round++;
  if(state.round>TOTAL_ROUNDS){endGame();return;}
  state.phase='fishing';
  state.currentRoundData=generateRound();
  state.currentRoundData.roundNum=state.round;
  state.currentFish=state.currentRoundData.fish;
  document.getElementById('roundNum').textContent=state.round;
  document.getElementById('bpmDisplay').textContent=state.currentRoundData.bpm;
  document.getElementById('offsetDisplay').textContent=state.currentRoundData.hasBeatError
    ?'+'+state.currentRoundData.beatOffset+'ms':'0ms';
  judgmentSection.style.display='none';judgmentList.innerHTML='';
  castBtn.disabled=false;
  roundBanner.textContent='第 '+state.round+' 回合';
  roundBanner.classList.add('show');
  setTimeout(function(){roundBanner.classList.remove('show');},1200);
  var bs=document.getElementById('beatStatus');
  if(state.currentRoundData.hasBeatError)
    bs.innerHTML='⚠️ 检测到节拍偏移 <strong style="color:var(--accent-orange)">+'+state.currentRoundData.beatOffset+'ms</strong>';
  else bs.textContent='✅ 节拍正常';
}

function isInBand(freq,type,cut,q){
  var bw=cut/q;
  switch(type){
    case 'lowpass':return freq<=cut+bw*0.5;
    case 'highpass':return freq>=cut-bw*0.5;
    case 'bandpass':return freq>=cut-bw&&freq<=cut+bw;
    case 'notch':return!(freq>=cut-bw*0.3&&freq<=cut+bw*0.3);
    default:return false;
  }
}

function filterLabel(type,cut,q){
  var bw=cut/q;
  switch(type){
    case 'lowpass':return '0~'+Math.round(cut+bw*0.5)+'Hz';
    case 'highpass':return Math.round(cut-bw*0.5)+'Hz~';
    case 'bandpass':return Math.round(cut-bw)+'~'+Math.round(cut+bw)+'Hz';
    case 'notch':return '排除'+Math.round(cut-bw*0.3)+'~'+Math.round(cut+bw*0.3)+'Hz';
    default:return '?';
  }
}

function applyFilterToRound(rd,fish,ft,cut,q){
  var tb=rd.targetBand,sc=[];
  fish.forEach(function(f){if(!f.caught&&isInBand(f.freq,ft,cut,q))sc.push(f);});
  var tis=sc.some(function(f){return f.isTarget;});
  var sv=tis?'目标在网内':'目标不在网内';
  var tif=isInBand((tb.min+tb.max)/2,ft,cut,q);
  var fv=tif?'目标在网内':'目标不在网内';
  var cf=sv!==fv;
  var be=null;
  if(cf&&rd.hasBeatError)
    be={bpm:rd.bpm,offset:rd.beatOffset,
      analysis:'节拍偏移+'+rd.beatOffset+'ms可能影响频谱时域采样窗，导致频域读数偏差',
      conclusion:tis?'倾向采纳频谱海结论':'倾向采纳滤波网结论'};
  var ai=null;
  if(rd.hasAliasing&&rd.aliasBandIdx>=0){
    var ac=sc.some(function(f){return f.isAlias;});
    ai={aliasBand:BANDS[rd.aliasBandIdx].name,overlap:Math.round(rd.aliasOverlap*100)+'%',aliasCaught:ac,penalty:ac?-5:0};
  }
  var bsc=tis?10:-3,ap=ai?ai.penalty:0,bp=(rd.hasBeatError&&cf)?-3:0,td=bsc+ap+bp;
  return {filterType:ft,cutoff:cut,q:q,filterBandName:filterLabel(ft,cut,q),
    spectrumVerdict:sv,filterVerdict:fv,conflict:cf,beatEvidence:be,aliasInfo:ai,
    hasBeatError:rd.hasBeatError,beatOffset:rd.beatOffset,
    baseScore:bsc,aliasPenalty:ap,beatPenalty:bp,totalDelta:td,
    caughtFish:sc.length,targetCaught:tis};
}

function handleCast(){
  if(state.phase!=='fishing')return;
  state.phase='judging';castBtn.disabled=true;
  var ft=filterTypeEl.value,cut=parseInt(cutoffFreqEl.value),q=parseFloat(filterQEl.value);
  var rd=state.currentRoundData;
  var res=applyFilterToRound(rd,state.currentFish,ft,cut,q);
  state.currentFish.forEach(function(f){if(!f.caught&&isInBand(f.freq,ft,cut,q))f.caught=true;});
  state.score+=res.totalDelta;if(state.score<0)state.score=0;
  if(res.aliasInfo)state.aliasCount++;
  if(res.hasBeatError)state.beatErrCount++;
  document.getElementById('totalScore').textContent=state.score;
  document.getElementById('aliasCount').textContent=state.aliasCount;
  document.getElementById('beatErrCount').textContent=state.beatErrCount;
  showScorePopup(spectrumCanvas.width/2,160,res.totalDelta,res.totalDelta>0);
  judgmentSection.style.display='block';judgmentList.innerHTML='';
  addJI('频谱海',res.spectrumVerdict,'src-spectrum');
  addJI('滤波网',res.filterVerdict,'src-filter');
  if(res.conflict){
    var ce=document.createElement('div');ce.className='judgment-item';ce.style.borderLeftColor='var(--accent-red)';
    ce.innerHTML='<span class="j-conflict">⚠️ 结论不一致！频谱海与滤波网判定矛盾</span>';
    judgmentList.appendChild(ce);
    if(res.beatEvidence){
      var be=document.createElement('div');be.className='judgment-item';be.style.borderLeftColor='var(--accent-gold)';
      be.innerHTML='<span class="j-beat-evidence">🥁 节拍轨补充证据：'+res.beatEvidence.analysis+'<br>→ '+res.beatEvidence.conclusion+'</span>';
      judgmentList.appendChild(be);
    }
  }
  if(res.aliasInfo){
    var ae=document.createElement('div');ae.className='judgment-item';ae.style.borderLeftColor='var(--accent-orange)';
    ae.innerHTML='<span class="j-label">频段混叠：</span><span class="j-value">'+res.aliasInfo.aliasBand+'（重叠'+res.aliasInfo.overlap+'）</span>'
      +(res.aliasInfo.aliasCaught?' <span class="j-conflict">误捕！-5分</span>':' <span style="color:var(--accent-green)">未误捕 ✓</span>');
    judgmentList.appendChild(ae);
  }
  if(res.hasBeatError){
    var berr=document.createElement('div');berr.className='judgment-item';berr.style.borderLeftColor='var(--accent-orange)';
    berr.innerHTML='<span class="j-label">节拍错位：</span><span class="j-value">+'+res.beatOffset+'ms</span>'
      +(res.beatPenalty?' <span class="j-conflict">判定偏差 -3分</span>':'');
    judgmentList.appendChild(berr);
  }
  var se=document.createElement('div');se.className='judgment-item';
  se.style.borderLeftColor=res.totalDelta>=0?'var(--accent-green)':'var(--accent-red)';
  se.innerHTML='<span class="j-label">本回合：</span><span class="j-value" style="color:'
    +(res.totalDelta>=0?'var(--accent-green)':'var(--accent-red)')+'">'
    +(res.totalDelta>=0?'+':'')+res.totalDelta+'分</span>';
  judgmentList.appendChild(se);

  var he={
    step:state.history.length+1,round:state.round,
    action:'甩网 — '+filterTypeEl.options[filterTypeEl.selectedIndex].text+' '+cut+'Hz Q='+q,
    result:res,timestamp:new Date().toLocaleTimeString(),
    filterType:ft,cutoff:cut,q:q,
    roundData:{targetBandIdx:rd.targetBandIdx,aliasBandIdx:rd.aliasBandIdx,aliasOverlap:rd.aliasOverlap,hasBeatError:rd.hasBeatError,beatOffset:rd.beatOffset,bpm:rd.bpm}
  };
  var se2=[];
  if(res.aliasInfo)se2.push({type:'频段混叠',order:1,handler:'滤波网',impact:res.aliasInfo.aliasCaught?'误捕-5分':'无惩罚',detail:res.aliasInfo.aliasBand+'重叠'+res.aliasInfo.overlap});
  if(res.hasBeatError)se2.push({type:'节拍错位',order:res.aliasInfo?2:1,handler:'节拍轨',impact:res.beatPenalty?'偏差-3分':'无惩罚',detail:'偏移+'+res.beatOffset+'ms'});
  if(se2.length>0){
    he.simultaneousEvents=se2;
    state.timeline.push({step:he.step,round:state.round,events:se2,timestamp:new Date().toLocaleTimeString()});
  }
  state.history.push(he);renderHistory();renderTimeline();
  setTimeout(function(){startRound();},2500);
}

function addJI(src,v,sc){
  var el=document.createElement('div');el.className='judgment-item';
  el.innerHTML='<span class="j-label">'+src+'：</span><span class="j-value '+sc+'">'+v+'</span>';
  judgmentList.appendChild(el);
}

function renderHistory(){
  var list=document.getElementById('historyList');list.innerHTML='';
  for(var i=state.history.length-1;i>=0;i--){
    var h=state.history[i],div=document.createElement('div');div.className='history-item';
    var html='<div><span class="h-step">步骤'+h.step+'</span> <span style="color:var(--text-dim)">R'+h.round+'</span> '+h.action+'</div>';
    html+='<div class="h-detail">频谱海: '+h.result.spectrumVerdict+' | 滤波网: '+h.result.filterVerdict;
    if(h.result.conflict)html+=' <span class="h-type-alias">⚠矛盾</span>';
    html+='</div>';
    if(h.result.aliasInfo)
      html+='<div><span class="h-type-alias">频段混叠</span>: '+h.result.aliasInfo.aliasBand+' 重叠'+h.result.aliasInfo.overlap
        +(h.result.aliasInfo.aliasCaught?' → 误捕-5':'')+'</div>';
    if(h.result.hasBeatError)
      html+='<div><span class="h-type-beat">节拍错位</span>: +'+h.result.beatOffset+'ms'
        +(h.result.beatPenalty?' → 偏差-3':'')+'</div>';
    if(h.simultaneousEvents&&h.simultaneousEvents.length>1){
      html+='<div style="margin-top:4px;padding-top:4px;border-top:1px dashed var(--border)"><span style="color:var(--accent-purple);font-size:11px">并存事件：</span>';
      h.simultaneousEvents.forEach(function(ev){
        html+='<div style="padding-left:8px"><span style="color:var(--text-dim)">序'+ev.order+'</span> '
          +'<span class="'+(ev.type==='频段混叠'?'h-type-alias':'h-type-beat')+'">'+ev.type+'</span> → '
          +'<span class="h-handler">处理:'+ev.handler+'</span> → '
          +'<span class="h-impact">'+ev.impact+'</span></div>';
      });
      html+='</div>';
    }
    if(h.result.beatEvidence)
      html+='<div class="h-detail" style="color:var(--accent-gold)">🥁 节拍轨补充: '+h.result.beatEvidence.conclusion+'</div>';
    html+='<div class="h-detail" style="color:'+(h.result.totalDelta>=0?'var(--accent-green)':'var(--accent-red)')+'">得分: '
      +(h.result.totalDelta>=0?'+':'')+h.result.totalDelta+' | '+h.timestamp+'</div>';
    div.innerHTML=html;list.appendChild(div);
  }
}

function renderTimeline(){
  var list=document.getElementById('timelineList');list.innerHTML='';
  if(state.timeline.length===0){
    list.innerHTML='<div style="color:var(--text-dim);font-size:12px;padding:8px">暂无事件时序记录</div>';return;
  }
  state.timeline.forEach(function(tl){
    var div=document.createElement('div');div.className='history-item';
    var html='<div><span class="h-step">步骤'+tl.step+'</span> <span style="color:var(--text-dim)">R'+tl.round+'</span> '
      +'<span style="color:var(--text-dim);font-size:11px">'+tl.timestamp+'</span></div>';
    tl.events.forEach(function(ev){
      html+='<div style="padding:3px 0"><span style="color:var(--text-dim);font-size:11px">第'+ev.order+'顺位</span> '
        +'<span class="'+(ev.type==='频段混叠'?'h-type-alias':'h-type-beat')+'">'+ev.type+'</span> '
        +'<span class="h-handler">处理人:'+ev.handler+'</span> '
        +'<span class="h-impact">影响:'+ev.impact+'</span>'
        +'<div class="h-detail">'+ev.detail+'</div></div>';
    });
    div.innerHTML=html;list.appendChild(div);
  });
}

function endGame(){
  state.phase='ended';
  document.getElementById('finalScore').textContent=state.score;
  document.getElementById('endSummary').textContent='共'+state.history.length+'步 | 混叠'+state.aliasCount+'次 | 错位'+state.beatErrCount+'次';
  document.getElementById('endOverlay').classList.add('open');
}

function openReview(){
  var body=document.getElementById('reviewBody');body.innerHTML='';
  if(state.history.length===0){
    body.innerHTML='<div style="color:var(--text-dim);text-align:center;padding:40px">暂无判定记录</div>';
    document.getElementById('reviewPanel').classList.add('open');return;
  }
  state.history.forEach(function(h){
    var div=document.createElement('div');div.className='review-step';
    var html='<div><span class="rs-step">步骤'+h.step+'</span><span class="rs-action"> R'+h.round+' '+h.action+'</span></div>';
    html+='<div class="rs-judgments">'
      +'<div class="rs-j-item"><span class="j-source src-spectrum">频谱海</span>: '+h.result.spectrumVerdict+'</div>'
      +'<div class="rs-j-item"><span class="j-source src-filter">滤波网</span>: '+h.result.filterVerdict+'</div></div>';
    if(h.result.conflict){
      html+='<div class="rs-conflict">⚠️ 频谱海与滤波网结论不一致</div>';
      if(h.result.beatEvidence)
        html+='<div class="rs-beat-evidence">🥁 节拍轨补充证据：'+h.result.beatEvidence.analysis+'<br>→ '+h.result.beatEvidence.conclusion+'</div>';
    }
    if(h.result.aliasInfo)
      html+='<div class="rs-error-hint">🔊 频段混叠 — '+h.result.aliasInfo.aliasBand+'重叠'+h.result.aliasInfo.overlap
        +(h.result.aliasInfo.aliasCaught?'，误捕混叠鱼导致-5分':'，成功避开混叠')+'</div>';
    if(h.result.hasBeatError)
      html+='<div class="rs-error-hint">🥁 节拍错位 — 偏移+'+h.result.beatOffset+'ms'
        +(h.result.beatPenalty?'，判定偏差-3分':'')+'</div>';
    if(h.simultaneousEvents&&h.simultaneousEvents.length>1){
      html+='<div style="margin-top:6px;padding:6px 10px;background:rgba(179,136,255,.1);border:1px solid rgba(179,136,255,.25);border-radius:4px;font-size:12px;color:var(--accent-purple)">⚡ 混叠与错位并存 — ';
      h.simultaneousEvents.forEach(function(ev,idx){
        if(idx>0)html+=' → ';
        html+=ev.type+'(第'+ev.order+'顺位, 处理人:'+ev.handler+', 影响:'+ev.impact+')';
      });
      html+='</div>';
    }
    var eh='';
    if(!h.result.targetCaught)eh+='未捕获目标鱼：滤波参数未覆盖目标频段；';
    if(h.result.aliasInfo&&h.result.aliasInfo.aliasCaught)eh+='混叠频段未隔离导致误捕；';
    if(h.result.hasBeatError&&h.result.beatPenalty)eh+='节拍错位放大了频域判定偏差；';
    if(h.result.conflict)eh+='频谱海与滤波网判定矛盾影响最终裁定；';
    if(eh)
      html+='<div style="margin-top:6px;padding:6px 10px;background:rgba(255,171,64,.06);border:1px solid rgba(255,171,64,.2);border-radius:4px;font-size:12px;color:var(--accent-orange)">💡 错因提示（影响成绩）：'+eh+'</div>';
    html+='<div class="rs-score-delta '+(h.result.totalDelta>=0?'positive':'negative')+'">'
      +(h.result.totalDelta>=0?'+':'')+h.result.totalDelta+'</div>';
    div.innerHTML=html;body.appendChild(div);
  });
  document.getElementById('reviewPanel').classList.add('open');
}

function reconstructRoundData(h){
  var rd=h.roundData;
  return {
    roundNum:h.round,targetBandIdx:rd.targetBandIdx,targetBand:BANDS[rd.targetBandIdx],
    hasAliasing:!!h.result.aliasInfo,aliasBandIdx:rd.aliasBandIdx,aliasOverlap:rd.aliasOverlap,
    hasBeatError:rd.hasBeatError,beatOffset:rd.beatOffset,bpm:rd.bpm,fish:[]
  };
}

function reconstructFish(rd){
  var fish=[];
  fish.push({
    bandIdx:rd.targetBandIdx,freq:(rd.targetBand.min+rd.targetBand.max)/2,
    amp:0.8,size:35,x:spectrumCanvas.width/2,y:160,vx:0,vy:0,isTarget:true,caught:false
  });
  if(rd.hasAliasing&&rd.aliasBandIdx>=0){
    var ab=BANDS[rd.aliasBandIdx];
    fish.push({
      bandIdx:rd.aliasBandIdx,freq:(ab.min+ab.max)/2,
      amp:0.6,size:28,x:spectrumCanvas.width/2+60,y:140,vx:0,vy:0,isTarget:false,isAlias:true,caught:false
    });
  }
  return fish;
}

var correctionTargetStep=-1;

function openCorrection(){
  if(state.history.length===0){showToast('暂无可修正的记录');return;}
  correctionTargetStep=state.history.length-1;
  var lastH=state.history[correctionTargetStep];
  document.getElementById('corrFilterType').value=lastH.filterType;
  document.getElementById('corrCutoff').value=lastH.cutoff;
  document.getElementById('corrQ').value=lastH.q;
  document.getElementById('corrCutoffDisplay').textContent=lastH.cutoff+' Hz';
  document.getElementById('corrQDisplay').textContent=lastH.q.toFixed(1);
  renderComparison(lastH.result,null);
  document.getElementById('correctionPanel').classList.add('open');
}

function renderComparison(oldResult,newResult){
  document.getElementById('oldResult').innerHTML=renderResultRows(oldResult);
  document.getElementById('newResult').innerHTML=newResult?renderResultRows(newResult)
    :'<div style="color:var(--text-dim);padding:20px;text-align:center">调整参数后点击"应用修正"</div>';
}

function renderResultRows(result){
  var html='';
  html+=cmpRow('频谱海',result.spectrumVerdict,false);
  html+=cmpRow('滤波网',result.filterVerdict,false);
  html+=cmpRow('结论一致',result.conflict?'否 ⚠️':'是',result.conflict);
  if(result.aliasInfo){
    html+=cmpRow('混叠频段',result.aliasInfo.aliasBand,false);
    html+=cmpRow('混叠误捕',result.aliasInfo.aliasCaught?'是 ⚠️':'否',result.aliasInfo.aliasCaught);
  }
  html+=cmpRow('节拍错位',result.hasBeatError?'+'+result.beatOffset+'ms':'无',result.hasBeatError);
  html+=cmpRow('目标捕获',result.targetCaught?'是 ✓':'否 ✗',false);
  html+=cmpRow('总得分',(result.totalDelta>=0?'+':'')+result.totalDelta,false);
  return html;
}

function cmpRow(label,value,hl){
  return '<div class="compare-row"><span class="cr-label">'+label+'</span>'
    +'<span class="cr-value'+(hl?' cr-changed':'')+'">'+value+'</span></div>';
}

function applyCorrectionAction(){
  if(correctionTargetStep<0||correctionTargetStep>=state.history.length)return;
  var h=state.history[correctionTargetStep];
  var cft=document.getElementById('corrFilterType').value;
  var ccut=parseInt(document.getElementById('corrCutoff').value);
  var cq=parseFloat(document.getElementById('corrQ').value);
  var rd=reconstructRoundData(h);
  var fish=reconstructFish(rd);
  var newResult=applyFilterToRound(rd,fish,cft,ccut,cq);
  renderComparison(h.result,newResult);
  state.corrections.push({
    step:h.step,round:h.round,oldResult:h.result,newResult:newResult,
    oldParams:{type:h.filterType,cutoff:h.cutoff,q:h.q},
    newParams:{type:cft,cutoff:ccut,q:cq},
    timestamp:new Date().toLocaleTimeString()
  });
  showToast('修正已应用，可对比新旧结果');
}

function restartGame(){
  state.round=0;state.score=0;state.aliasCount=0;state.beatErrCount=0;
  state.phase='idle';state.history=[];state.timeline=[];
  state.currentFish=[];state.currentRoundData=null;state.corrections=[];
  document.getElementById('totalScore').textContent='0';
  document.getElementById('aliasCount').textContent='0';
  document.getElementById('beatErrCount').textContent='0';
  document.getElementById('roundNum').textContent='0';
  document.getElementById('historyList').innerHTML='';
  document.getElementById('timelineList').innerHTML='';
  judgmentSection.style.display='none';judgmentList.innerHTML='';
  document.getElementById('endOverlay').classList.remove('open');
  document.getElementById('reviewPanel').classList.remove('open');
  document.getElementById('correctionPanel').classList.remove('open');
  startRound();
}

cutoffFreqEl.addEventListener('input',function(){cutoffDisplayEl.textContent=this.value+' Hz';});
filterQEl.addEventListener('input',function(){qDisplayEl.textContent=parseFloat(this.value).toFixed(1);});
castBtn.addEventListener('click',handleCast);

document.getElementById('corrCutoff').addEventListener('input',function(){
  document.getElementById('corrCutoffDisplay').textContent=this.value+' Hz';
});
document.getElementById('corrQ').addEventListener('input',function(){
  document.getElementById('corrQDisplay').textContent=parseFloat(this.value).toFixed(1);
});

document.querySelectorAll('.tab-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
    this.classList.add('active');
    var tab=this.getAttribute('data-tab');
    document.getElementById('historyList').style.display=tab==='history'?'block':'none';
    document.getElementById('timelineList').style.display=tab==='timeline'?'block':'none';
  });
});

document.getElementById('closeReview').addEventListener('click',function(){
  document.getElementById('reviewPanel').classList.remove('open');
});
document.getElementById('closeCorrection').addEventListener('click',function(){
  document.getElementById('correctionPanel').classList.remove('open');
});
document.getElementById('applyCorrection').addEventListener('click',applyCorrectionAction);

document.getElementById('endReviewBtn').addEventListener('click',function(){
  document.getElementById('endOverlay').classList.remove('open');openReview();
});
document.getElementById('endCorrectBtn').addEventListener('click',function(){
  document.getElementById('endOverlay').classList.remove('open');openCorrection();
});
document.getElementById('endRestartBtn').addEventListener('click',restartGame);

document.getElementById('startBtn').addEventListener('click',function(){
  document.getElementById('startOverlay').classList.add('hidden');
  startRound();
});

animate();
})();
