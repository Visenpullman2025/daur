'use strict';
/* [背景音乐] 程序化古风环境乐:五声音阶(C宫)轻拨弦 + 低吟垫底 + 简易混响空间感。
   原创、零版权、零音频文件、永不雷同。浏览器自动播放受限 → 首次用户手势(进庄/点击)后启动。
   设置「音乐」开关,存 daur-bgm(默认开)。想换成真实曲目:放 mp3 后改 playFile 即可(预留)。 */
(function(){
  var SK='daur-bgm';
  function isOn(){ try{ var v=localStorage.getItem(SK); return v===null?true:v==='1'; }catch(e){ return true; } }

  var ctx=null, master=null, lp=null, delay=null, started=false, timer=null;
  // C 宫五声音阶(C D E G A)跨两个八度,纯五声→怎么响都不会刺耳
  var SCALE=[261.63,293.66,329.63,392.00,440.00,523.25,587.33,659.25,783.99,880.00];
  function T(){ return ctx.currentTime; }

  function buildGraph(){
    master=ctx.createGain(); master.gain.value=0.0001; master.connect(ctx.destination);
    lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2200; lp.connect(master);
    // 反馈延时做空间/混响感
    delay=ctx.createDelay(1.0); delay.delayTime.value=0.30;
    var fb=ctx.createGain(); fb.gain.value=0.26;
    var wet=ctx.createGain(); wet.gain.value=0.28;
    delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
  }
  function pluck(freq){
    var t=T();
    var o=ctx.createOscillator(); o.type='triangle'; o.frequency.value=freq;
    var g=ctx.createGain();
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(0.15, t+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t+1.5+Math.random()*0.9);
    o.connect(g); g.connect(lp); g.connect(delay);
    o.start(t); o.stop(t+2.6);
  }
  function startDrone(){
    var dg=ctx.createGain(); dg.gain.value=0.0001; dg.connect(master);
    [130.81,196.00].forEach(function(f,i){
      var o=ctx.createOscillator(); o.type='sine'; o.frequency.value=f; o.detune.value=(i?-5:5);
      var g=ctx.createGain(); g.gain.value=0.5; o.connect(g); g.connect(dg); o.start();
    });
    dg.gain.exponentialRampToValueAtTime(0.05, T()+5);
  }
  function schedule(){
    if(!started) return;
    var idx=Math.floor(Math.pow(Math.random(),1.3)*SCALE.length);   // 偏中低音,偶尔高音点缀
    pluck(SCALE[idx]);
    if(Math.random()<0.22){ setTimeout(function(){ if(started) pluck(SCALE[Math.min(SCALE.length-1,idx+2)]); }, 170); }
    timer=setTimeout(schedule, 750+Math.random()*1150);
  }
  function start(){
    if(started) return;
    try{
      var AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
      ctx=new AC();
      if(ctx.state==='suspended' && ctx.resume) ctx.resume();
      buildGraph(); started=true; startDrone();
      master.gain.exponentialRampToValueAtTime(0.42, T()+2.5);   // 总音量轻
      schedule();
    }catch(e){ started=false; }
  }
  function stop(){
    started=false; if(timer){ clearTimeout(timer); timer=null; }
    try{ if(master) master.gain.exponentialRampToValueAtTime(0.0001, T()+0.6); }catch(e){}
    setTimeout(function(){ try{ if(ctx) ctx.close(); }catch(e){} ctx=null; master=null; }, 900);
  }

  function onGesture(){ if(isOn() && !started) start(); }
  document.addEventListener('pointerdown', onGesture, false);
  document.addEventListener('touchstart', onGesture, false);

  window.bgmIsOn=isOn;
  window.setBgm=function(on){
    try{ localStorage.setItem(SK, on?'1':'0'); }catch(e){}
    if(on) start(); else stop();
    if(typeof view!=='undefined' && view==='set' && typeof renderMain==='function') renderMain();
    if(typeof toast==='function') toast(on?'🎵 音乐已开':'音乐已关');
  };
})();
