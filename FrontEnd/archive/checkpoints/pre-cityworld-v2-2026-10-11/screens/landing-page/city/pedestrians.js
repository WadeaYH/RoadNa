import * as THREE from './three.js';

export function createPedestrians(world) {
  const {box,cylinder,sphere}=world.kit;
  function person(color){
    const g=new THREE.Group();world.animated.add(g);
    cylinder(g,.115,.1,.25,color,0,.56,0,7);
    sphere(g,.115,'#cf9e78',0,.79,0);sphere(g,.11,'#5b5144',-.015,.85,-.01);
    const legs=[],arms=[];
    for(const side of [-1,1]){
      const leg=new THREE.Group();leg.position.set(0,.44,side*.065);g.add(leg);box(leg,.065,.23,.055,'#50606b',0,-.12,0,.01);box(leg,.1,.055,.075,'#334543',.02,-.25,0,.012);legs.push(leg);
      const arm=new THREE.Group();arm.position.set(0,.64,side*.145);g.add(arm);box(arm,.055,.2,.055,color,0,-.1,0,.01);sphere(arm,.035,'#cf9e78',0,-.21,0);arms.push(arm);
    }
    return {g,legs,arms};
  }
  const paths=[
    [[-14.2,-2.25],[-9.3,-2.25]],
    [[-.5,2.22],[8.8,2.22]],
    [[4.2,6.3],[4.2,11.8],[6.5,11.8],[6.5,9.8],[4.2,9.8]],
    [[-7.22,4],[-7.22,10.5]]
  ];
  const walkers=['#c7825e','#087f80','#f2b766','#e9e4d6','#668e9f'].map((color,i)=>{
    const item=person(color),points=paths[i%paths.length];
    item.path=points.length===2?null:new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,.23,z)),true,'centripetal');item.points=points;item.offset=i*.18;return item;
  });
  const v=new THREE.Vector3(),direction=new THREE.Vector3();
  function update(time,motion){
    for(const [i,item] of walkers.entries()){
      const t=(item.offset+(motion?time*.038:0))%1;
      if(item.path){item.path.getPointAt(t,v);item.path.getTangentAt(t,direction);}
      else{const [a,b]=item.points,forward=t<.5,fraction=forward?t*2:2-t*2;v.set(THREE.MathUtils.lerp(a[0],b[0],fraction),.23,THREE.MathUtils.lerp(a[1],b[1],fraction));direction.set((b[0]-a[0])*(forward?1:-1),0,(b[1]-a[1])*(forward?1:-1));}
      item.g.position.copy(v);item.g.rotation.y=Math.atan2(-direction.z,direction.x);
      const swing=motion?Math.sin(time*8+i)*.43:0;
      item.legs.forEach((leg,j)=>leg.rotation.z=swing*(j?1:-1));item.arms.forEach((arm,j)=>arm.rotation.z=swing*(j?-1:1));
    }
  }
  update(0,false);return {update,walkers};
}
