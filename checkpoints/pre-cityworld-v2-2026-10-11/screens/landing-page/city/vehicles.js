import * as THREE from './three.js';

export function createVehicles(world) {
  const {box,cylinder,material}=world.kit;
  function car(color,van=false,taxi=false){
    const g=new THREE.Group();world.animated.add(g);
    box(g,van?2.05:1.78,.36,.82,color,0,.45,0,.15);
    box(g,van?1.4:.94,van?.56:.33,.72,color,-.14,van?.86:.74,0,.13);
    box(g,.035,.27,.62,'#6b969d',.35,.77,0,.04);
    for(const side of [-1,1]){
      box(g,.66,.22,.035,'#60868e',-.16,.8,side*.373,.025);
      box(g,.035,.27,.035,color,-.16,.8,side*.399);
      for(const x of [-.56,.55]){
        const tire=cylinder(g,.18,.18,.1,'#263639',x,.3,side*.43,10);tire.rotation.x=Math.PI/2;
        const hub=cylinder(g,.085,.085,.11,'#c3cecb',x,.3,side*.445,8);hub.rotation.x=Math.PI/2;
      }
      box(g,.05,.1,.19,'#fff0bd',.89,.46,side*.23,.015);
      box(g,.025,.09,.16,'#cb725e',-.9,.46,side*.24,.01);
      box(g,.09,.09,.15,color,.3,.65,side*.46,.025);
    }
    box(g,.025,.09,.69,'#d4ddda',.9,.34,0,.02);
    if(taxi)box(g,.32,.13,.27,'#faf1c4',-.16,1.01,0,.025);
    if(van){box(g,.035,.22,.35,'#ddf5f0',-.8,.9,.375,.025);box(g,.28,.035,.04,'#087f80',-.15,.55,.426);}
    return g;
  }
  const points=[[-4.2,-6.8],[-4.2,-7.5],[-3.2,-8.2],[11.7,-8.2],[12.7,-7.2],[12.7,-1.9],[11.6,-.85],[-3.1,-.85],[-4.2,-1.9]];
  const path=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,0,z)),true,'centripetal');
  const cars=[{mesh:car('#fafaf6'),offset:.04,speed:.023},{mesh:car('#f6c45a',false,true),offset:.38,speed:.023},{mesh:car('#749b8f',true),offset:.72,speed:.023}];
  const hero=car('#087f80');
  const parked=car('#c8896d');parked.position.set(.1,0,4.3);parked.rotation.y=Math.PI/2;
  const tangent=new THREE.Vector3(),position=new THREE.Vector3();
  function update(time,progress,motion){
    for(const item of cars){const t=(item.offset+(motion?time*item.speed:0))%1;path.getPointAt(t,position);path.getTangentAt(t,tangent);item.mesh.position.copy(position);item.mesh.rotation.y=Math.atan2(-tangent.z,tangent.x);}
    const drive=THREE.MathUtils.smoothstep(progress,.16,.49);
    hero.position.set(THREE.MathUtils.lerp(-13,3.05,drive),0,.8);
  }
  update(0,0,false);
  return {update,hero,cars};
}
