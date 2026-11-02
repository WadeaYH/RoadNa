import {createCity} from './scene.js';
import {attachHotspots} from './hotspots.js';

export function mountCityWorld() {
  const canvas=document.getElementById('city-canvas'),sequence=document.getElementById('city-story'),stage=document.getElementById('city-stage');
  const city=createCity(canvas),motionQuery=matchMedia('(prefers-reduced-motion: reduce)'),shortQuery=matchMedia('(max-height: 659px)');
  const supportsTimeline=CSS.supports('animation-timeline: view()')&&CSS.supports('view-timeline-inset: 64px 0');
  const chapters=[...document.querySelectorAll('[data-chapter]')],labels=document.getElementById('city-labels'),report=document.getElementById('city-report'),controls=document.getElementById('city-controls');
  const selector=document.getElementById('city-mobile-selector'),dialog=document.getElementById('city-info');
  const stageNames=['Welcome to the neighborhood','A hazard on the road','Give the problem a location','Explore RoadNa JO'],ids=['welcome','problem','report','hub'];
  let progress=0,chapter=-1,time=0,renderedFrames=0,last=0,frame=0,visible=true,disposed=false,infoTrigger=null,navigationTimer=0;
  const motion=()=>!motionQuery.matches;
  document.body.classList.add('city-ready');
  document.body.classList.toggle('has-scroll-timeline',supportsTimeline);
  function readProgress(){return !motion()||!supportsTimeline||shortQuery.matches?1:Math.max(0,Math.min(1,parseFloat(getComputedStyle(sequence).getPropertyValue('--city-progress'))||0));}
  function setChapter(next){
    if(chapter===next)return;chapter=next;stage.dataset.stage=ids[next];
    const focusedLabel=labels.contains(document.activeElement);
    for(const [i,element] of chapters.entries()){element.hidden=i!==next;element.classList.toggle('is-active',i===next);}
    labels.hidden=next!==3;controls.hidden=next!==3;selector.hidden=next!==3;report.hidden=next!==2;
    if(next!==3&&focusedLabel)document.querySelector('.city-skip')?.focus({preventScroll:true});
    document.getElementById('city-stage-name').textContent=stageNames[next];document.getElementById('city-stage-counter').textContent='0'+(next+1)+' / 04';
    document.getElementById('city-control-hint').textContent=next===3?'Drag to explore · Select a location':motion()&&supportsTimeline?'Scroll to follow the story':'Explore with the location links';
    if(next!==3)hotspots?.clear();
  }
  function tick(now){
    frame=0;if(disposed||document.hidden||!visible)return;
    const interval=canvas.clientWidth<900?1000/30:1000/60;
    if(motion()&&last&&now-last<interval-.65){frame=requestAnimationFrame(tick);return;}
    const delta=last?Math.min((now-last)/1000,.05):.016;last=now;
    if(motion())time+=delta;
    progress=readProgress();setChapter(progress<.22?0:progress<.48?1:progress<.78?2:3);
    city.render(time,progress,motion(),delta);renderedFrames++;hotspots.placeLabels();
    if(motion())frame=requestAnimationFrame(tick);
  }
  function invalidate(){if(!frame&&!disposed&&!document.hidden&&visible)frame=requestAnimationFrame(tick);}
  function showInfo(){infoTrigger=document.activeElement;if(!dialog.open)dialog.showModal();}
  dialog.addEventListener('close',()=>infoTrigger?.focus({preventScroll:true}));
  function navigate(href){
    if(navigationTimer)return;
    document.getElementById('city-transition').classList.add('is-active');
    navigationTimer=setTimeout(()=>window.location.assign(href),360);
  }
  const hotspots=attachHotspots(city,canvas,{isHub:()=>chapter===3,motion,invalidate,navigate,showInfo});
  function explore(event){
    if(event&&(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey))return;
    event?.preventDefault();city.controls.reset();
    if(motion()&&supportsTimeline&&!shortQuery.matches){const rect=sequence.getBoundingClientRect();window.scrollTo({top:window.scrollY+rect.top+sequence.offsetHeight-stage.offsetHeight-64,behavior:'instant'});}
    else stage.scrollIntoView({behavior:'instant',block:'start'});
    const target=document.getElementById('explore-city');target.focus({preventScroll:true});invalidate();
  }
  document.querySelectorAll('[data-explore-city]').forEach(link=>link.addEventListener('click',explore));
  document.getElementById('city-reset').addEventListener('click',()=>{city.controls.reset();invalidate();});
  document.getElementById('city-zoom-in').addEventListener('click',()=>{city.controls.zoomBy(.15);invalidate();});
  document.getElementById('city-zoom-out').addEventListener('click',()=>{city.controls.zoomBy(-.15);invalidate();});
  const resize=new ResizeObserver(()=>{city.resize(canvas.clientWidth,canvas.clientHeight);invalidate();});resize.observe(stage);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){last=0;invalidate();}else{cancelAnimationFrame(frame);frame=0;}},{threshold:0});intersection.observe(stage);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{last=0;invalidate();}});
  function preferences(){document.getElementById('city-transcript').open=!motion()||!supportsTimeline||shortQuery.matches;city.controls.reset();last=0;invalidate();}
  motionQuery.addEventListener('change',preferences);shortQuery.addEventListener('change',preferences);preferences();
  function fallback(){disposed=true;cancelAnimationFrame(frame);document.body.classList.remove('city-ready','has-scroll-timeline');document.getElementById('city-load-status').textContent='The 3D view is unavailable. All city locations remain available below.';labels.hidden=true;controls.hidden=true;selector.hidden=true;report.hidden=true;chapters.forEach((el,i)=>el.hidden=i!==0);document.getElementById('city-transcript').open=true;document.getElementById('city-control-hint').textContent='Choose a location below';resize.disconnect();intersection.disconnect();}
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fallback();},{once:true});
  window.addEventListener('pagehide',()=>{disposed=true;clearTimeout(navigationTimer);cancelAnimationFrame(frame);resize.disconnect();intersection.disconnect();motionQuery.removeEventListener('change',preferences);shortQuery.removeEventListener('change',preferences);city.dispose();},{once:true});
  window.addEventListener('pageshow',event=>{if(event.persisted)window.location.reload();});
  invalidate();
  // Read-only diagnostics support verification without adding gameplay or persistence.
  window.RoadNaCityWorld={get progress(){return progress;},get chapter(){return ids[chapter];},get metrics(){return {frames:renderedFrames,calls:city.renderer.info.render.calls,triangles:city.renderer.info.render.triangles,batches:city.world.batches,vehicles:city.vehicles.cars.length+1,pedestrians:city.people.walkers.length};},get motionEnabled(){return motion();},get simulationTime(){return time;},get carStop(){return {carFront:city.vehicles.hero.position.x+.9,potholeNearEdge:4.16};},get camera(){return {zoom:city.controls.camera.zoom,target:city.controls.target.toArray(),position:city.controls.camera.position.toArray()};},get traffic(){return city.vehicles.cars.map(item=>item.mesh.position.toArray());},get projectedLandmarks(){return city.world.landmarks.map(item=>{const point=item.center.clone().project(city.controls.camera);return {id:item.id,x:(point.x*.5+.5)*canvas.clientWidth,y:(-point.y*.5+.5)*canvas.clientHeight};});}};
}
