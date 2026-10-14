import * as THREE from './three.js';

export function createCamera(width,height) {
  const camera=new THREE.OrthographicCamera(-20,20,20,-20,.1,150);
  const overview=new THREE.Vector3(0,.65,0),hazard=new THREE.Vector3(5,.45,.8),target=overview.clone(),desired=overview.clone();
  const offset=new THREE.Vector3(30,36,30),pan=new THREE.Vector3();
  let userZoom=1,focus=null,half=21,viewport={width,height};
  function resize(w,h){
    viewport={width:w,height:h};const aspect=w/h;half=Math.max(21,24/aspect);
    camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;
    camera.setViewOffset(w,h,w>=900?-w*.13:0,w<900?-h*.10:0,w,h);camera.updateProjectionMatrix();
  }
  function update(progress,delta,motion){
    let zoom=1;
    if(progress<.16){desired.copy(overview);zoom=1+THREE.MathUtils.smoothstep(progress,0,.16)*.055;}
    else if(progress<.4){const t=THREE.MathUtils.smoothstep(progress,.16,.4);desired.copy(overview).lerp(hazard,t);zoom=THREE.MathUtils.lerp(1.055,3.2,t);}
    else if(progress<.68){desired.copy(hazard);zoom=3.2;}
    else if(progress<.85){const t=THREE.MathUtils.smoothstep(progress,.68,.85);desired.copy(hazard).lerp(overview,t);zoom=THREE.MathUtils.lerp(3.2,1,t);}
    else {desired.copy(focus||overview).add(pan);zoom=(focus?1.8:1)*userZoom;}
    const damping=motion?1-Math.exp(-delta*9):1;
    target.lerp(desired,damping);camera.zoom=THREE.MathUtils.lerp(camera.zoom,zoom,damping);
    camera.position.copy(target).add(offset);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  }
  function panBy(dx,dy){focus=null;const units=half*2/viewport.height/userZoom;pan.x=THREE.MathUtils.clamp(pan.x-dx*units*.707-dy*units*.6,-3.5,3.5);pan.z=THREE.MathUtils.clamp(pan.z+dx*units*.707-dy*units*.6,-3.5,3.5);}
  function reset(){pan.set(0,0,0);focus=null;userZoom=1;}
  resize(width,height);update(0,1,false);
  return {camera,resize,update,panBy,reset,zoomBy(amount){userZoom=THREE.MathUtils.clamp(userZoom+amount,.8,1.5);},focus(point){focus=point.clone();pan.set(0,0,0);},get target(){return target;}};
}
