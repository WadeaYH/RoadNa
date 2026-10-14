import * as THREE from './three.js';
import {createWorld} from './world.js';
import {createVehicles} from './vehicles.js';
import {createPedestrians} from './pedestrians.js';
import {createCamera} from './camera.js';

export function createCity(canvas) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'default'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,window.innerWidth<768?1.25:1.75));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.17;
  renderer.shadowMap.enabled=window.innerWidth>=600;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#fafaf6');
  scene.add(new THREE.HemisphereLight('#fff6e7','#92af9f',2.2));
  const sun=new THREE.DirectionalLight('#fff3dc',3.1);sun.position.set(-14,28,16);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:.5,far:75});sun.shadow.bias=-.0006;sun.shadow.normalBias=.06;scene.add(sun);
  const world=createWorld(scene),vehicles=createVehicles(world),people=createPedestrians(world);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#fafaf6',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.065;floor.receiveShadow=true;scene.add(floor);
  const controls=createCamera(canvas.clientWidth,canvas.clientHeight);
  function resize(w,h){renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,w<768?1.25:1.75));renderer.shadowMap.enabled=w>=600;renderer.setSize(w,h,false);controls.resize(w,h);}
  function render(time,progress,motion,delta){
    controls.update(progress,delta,motion);vehicles.update(time,progress,motion);people.update(time,motion);
    world.pin.visible=progress>=.48;world.ring.visible=progress>=.22;
    if(world.pin.visible)world.pin.position.y=2.15+(motion?Math.sin(time*2)*.055:0);
    world.environment.forEach((tree,i)=>tree.rotation.z=motion?Math.sin(time*.75+i)*.015:0);
    renderer.render(scene,controls.camera);
  }
  function dispose(){
    const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const mat of Array.isArray(object.material)?object.material:[object.material])if(mat){materials.add(mat);if(mat.map)textures.add(mat.map);}});
    for(const geo of world.kit.geometries.values())geometries.add(geo);
    geometries.forEach(geo=>geo.dispose());textures.forEach(texture=>texture.dispose());materials.forEach(mat=>mat.dispose());renderer.dispose();
  }
  resize(canvas.clientWidth,canvas.clientHeight);
  return {renderer,scene,world,vehicles,people,controls,resize,render,dispose};
}
