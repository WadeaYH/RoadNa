import * as THREE from './three.js';

export function attachHotspots(city,canvas,{isHub,motion,invalidate,navigate,showInfo}) {
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),projection=new THREE.Vector3();
  const labels=[...document.querySelectorAll('.city-label')],report=document.getElementById('city-report');
  let hover=null,pressed=null,dragged=false;
  function pick(event){
    const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(pointer,city.controls.camera);
    return raycaster.intersectObjects(city.world.pickTargets,false)[0]?.object.userData.landmark||null;
  }
  function highlight(item){
    hover=item;canvas.style.cursor=item?'pointer':isHub()?'grab':'default';
    for(const link of labels)link.classList.toggle('is-hovered',link.dataset.landmark===item?.id);
    city.world.highlight.visible=Boolean(item);
    if(item){city.world.highlight.position.set(item.center.x,.27,item.center.z);city.world.highlight.scale.set((item.size[0]/2+.65)/1.3,(item.size[2]/2+.65)/1.3,1);}
    invalidate();
  }
  function choose(item,event){
    if(!item)return;if(event&&(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button>0))return;
    if(item.id==='park'){event?.preventDefault();city.controls.focus(item.center);showInfo();invalidate();return;}
    if(motion()){event?.preventDefault();city.controls.focus(item.center);invalidate();navigate(item.href);}
    else if(!event)window.location.assign(item.href);
  }
  canvas.addEventListener('pointerdown',event=>{
    if(!isHub()||event.button!==0)return;
    pressed={x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,pointer:event.pointerId};dragged=false;
  });
  canvas.addEventListener('pointermove',event=>{
    if(!isHub())return;
    if(pressed&&event.pointerType==='mouse'){
      const distance=Math.hypot(event.clientX-pressed.x,event.clientY-pressed.y);
      if(distance>5){dragged=true;canvas.setPointerCapture(event.pointerId);city.controls.panBy(event.clientX-pressed.lastX,event.clientY-pressed.lastY);highlight(null);canvas.style.cursor='grabbing';invalidate();}
      pressed.lastX=event.clientX;pressed.lastY=event.clientY;
    }else if(event.pointerType==='mouse')highlight(pick(event));
  });
  canvas.addEventListener('pointerup',event=>{
    if(!pressed)return;
    const moved=Math.hypot(event.clientX-pressed.x,event.clientY-pressed.y)>8;
    if(!dragged&&!moved&&isHub())choose(pick(event));
    if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    pressed=null;dragged=false;
  });
  canvas.addEventListener('pointercancel',()=>{pressed=null;dragged=false;highlight(null);});
  canvas.addEventListener('pointerleave',()=>{if(!dragged)highlight(null);});
  const byId=id=>city.world.landmarks.find(item=>item.id===id);
  for(const link of [...labels,...document.querySelectorAll('[data-location]')]){
    const item=byId(link.dataset.landmark||link.dataset.location);
    link.addEventListener('mouseenter',()=>highlight(item));link.addEventListener('mouseleave',()=>highlight(null));
    link.addEventListener('focus',()=>highlight(item));link.addEventListener('blur',()=>highlight(null));
    link.addEventListener('click',event=>{if(isHub())choose(item,event);else if(item.id==='park'){event.preventDefault();showInfo();}});
  }
  document.getElementById('city-location-select').addEventListener('change',event=>{const item=byId(event.target.value);event.target.value='';choose(item);});
  function placeLabels(){
    const w=canvas.clientWidth,h=canvas.clientHeight,occupied=[];
    for(const link of document.getElementById('city-labels').hidden?[]:labels){
      const item=byId(link.dataset.landmark);projection.copy(item.position).project(city.controls.camera);
      const width=link.offsetWidth||170,height=link.offsetHeight||40;
      let x=THREE.MathUtils.clamp((projection.x*.5+.5)*w-width/2,16,w-width-16),y=THREE.MathUtils.clamp((-projection.y*.5+.5)*h-40,75,h-110);
      // Small deterministic offsets prevent labels stacking over nearby civic objects.
      if(item.id==='report')y+=18;if(item.id==='community')y+=18;if(item.id==='park')y+=32;
      for(let pass=0;pass<7;pass++){
        const overlap=occupied.find(rect=>x<rect.x+rect.w+8&&x+width+8>rect.x&&y<rect.y+rect.h+8&&y+height+8>rect.y);
        if(!overlap)break;y=overlap.y+overlap.h+10;
        if(y>h-100){y=overlap.y-height-12;x=THREE.MathUtils.clamp(x+width*.35,16,w-width-16);}
      }
      y=THREE.MathUtils.clamp(y,70,h-100);link.style.transform='translate('+Math.round(x)+'px,'+Math.round(y)+'px)';occupied.push({x,y,w:width,h:height});
    }
    if(!report.hidden){projection.copy(city.world.landmarks[0].position).project(city.controls.camera);
      const x=w<900?Math.max(16,w-222):THREE.MathUtils.clamp((projection.x*.5+.5)*w+150,420,w-256);
      const y=w<900?h-210:THREE.MathUtils.clamp((-projection.y*.5+.5)*h+45,180,h-240);
      report.style.left=Math.round(x)+'px';report.style.top=Math.round(y)+'px';
    }
  }
  return {placeLabels,clear(){highlight(null);}};
}
