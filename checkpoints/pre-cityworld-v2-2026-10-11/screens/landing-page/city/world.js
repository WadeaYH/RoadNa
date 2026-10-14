import * as THREE from './three.js';
import {createKit,bakeStatic} from './geometry.js';

export function createWorld(scene) {
  const kit=createKit(), {box,cylinder,sphere,sign,material}=kit;
  const fixed=new THREE.Group(), animated=new THREE.Group();scene.add(fixed,animated);
  const cream='#eadac4', stone='#d6c3a8', white='#fafaf6', teal='#087f80', glass='#587d85', road='#303b42', mint='#ddf5f0', orange='#f6a649';
  const group=(parent,x,z)=>{const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);return g;};
  // A softly edged tabletop with a visible limestone foundation.
  box(fixed,34,.85,29,stone,0,-.58,0,.75);
  box(fixed,33.5,.18,28.5,cream,0,-.08,0,.7);
  box(fixed,33,.12,28,'#a9cbb1',0,.04,0,.6);
  box(fixed,32.7,.05,4,road,0,.125,0,.12);
  box(fixed,4,.06,27.7,road,-5,.13,0,.12);
  box(fixed,32.6,.06,3.2,road,0,.14,-9,.12);
  box(fixed,3.2,.06,9,road,13.5,.14,-4.5,.12);
  for(const z of [-2.5,2.5])box(fixed,32.6,.18,.8,'#f0e7d7',0,.19,z,.07);
  for(const x of [-7.5,-2.5])box(fixed,.8,.18,27.5,'#f0e7d7',x,.19,0,.07);
  for(const z of [-11.1,-6.9])box(fixed,32.6,.18,.6,'#f0e7d7',0,.19,z,.05);
  for(let x=-15.5;x<16;x+=1.55)if(Math.abs(x+5)>2.5)box(fixed,.8,.018,.065,white,x,.171,0);
  for(let z=-12.5;z<13;z+=1.5)if(Math.abs(z)>2.5&&Math.abs(z+9)>2)box(fixed,.065,.018,.8,white,-5,.182,z);
  // Crosswalks and curb cuts frame the main junction.
  for(let k=0;k<7;k++){box(fixed,.17,.025,2.8,white,-8.1+k*.33,.181,0);box(fixed,2.8,.025,.17,white,-5,.182,2.9+k*.33);}
  const parapet=(g,w,h,d,color)=>{
    box(g,w,h,d,color,0,h/2+.27,0,.14);
    box(g,w+.15,.13,d+.15,white,0,h+.3,0,.08);
    box(g,w,.3,.13,color,0,h+.49,-d/2);
    box(g,w,.3,.13,color,0,h+.49,d/2);
    box(g,.13,.3,d,color,-w/2,h+.49,0);box(g,.13,.3,d,color,w/2,h+.49,0);
  };
  const facade=(g,w,h,d,floors=2)=>{
    for(let floor=0;floor<floors;floor++)for(let col=0;col<3;col++){
      const x=(col-1)*w*.27,y=.85+floor*(h-.8)/floors;
      box(g,w*.16,.63,.035,glass,x,y,d/2+.02,.025);
      box(g,w*.18,.06,.15,white,x,y-.34,d/2+.09);
    }
    for(let floor=0;floor<floors;floor++)for(let col=0;col<2;col++)box(g,.035,.6,.55,glass,w/2+.02,.85+floor*(h-.8)/floors,(col-.5)*d*.45,.02);
    box(g,.5,.95,.04,teal,0,.74,d/2+.035,.04);
    box(g,.72,.12,.46,stone,0,.3,d/2+.22,.03);
  };
  const residence=(x,z,w,h,d,accent)=>{
    const g=group(fixed,x,z);parapet(g,w,h,d,cream);facade(g,w,h,d,h>3?3:2);
    box(g,w*.9,.24,.55,accent,0,h*.48,d/2+.13,.04);
    for(let i=0;i<6;i++)box(g,.04,.31,.04,white,(i-2.5)*w*.14,h*.48+.17,d/2+.41);
    box(g,w*.9,.07,.07,white,0,h*.48+.33,d/2+.41);
    cylinder(g,.34,.34,.58,'#b3bfc0',w*.22,h+.67,-d*.24);
    const solar=box(g,w*.36,.065,d*.38,'#3e5c6b',-w*.2,h+.58,-d*.18,.025);solar.rotation.x=-.15;
    box(g,w*.37,.03,.035,white,-w*.2,h+.62,-d*.18);
    return g;
  };
  residence(-11.2,6.7,4.1,3.1,3.8,teal);
  residence(-11,11.1,3.6,2.2,3.1,'#c98462');
  residence(-11.5,-4.8,4.5,4.3,3.3,'#8d9b7e');
  residence(-11.1,-12.6,3.9,2.3,2.2,teal);
  residence(.5,-4.4,3.4,3.2,3.2,'#c58e6b');
  residence(3.6,-4.2,2.2,2.3,3.3,'#94aaa1');
  residence(1,-12.5,4.6,2.7,2.5,teal);
  // City Hall: colonnade, generous steps, teal glazed tower and civic sign.
  const hall=group(fixed,8,-5.4);
  parapet(hall,5.6,3.8,4.3,cream);
  box(hall,5.1,.17,1.2,stone,0,.27,2.75,.1);
  box(hall,4.6,.15,1,white,0,.4,2.6,.06);
  for(const x of [-2.1,-.75,.75,2.1])cylinder(hall,.14,.17,2.4,white,x,1.85,2.25,8);
  box(hall,5.8,.34,1.1,teal,0,3.17,2.25,.12);
  box(hall,3.8,2,.055,glass,0,1.8,2.16,.04);
  for(let k=-2;k<=2;k++)box(hall,.065,2,.07,white,k*.7,1.8,2.2);
  const tower=box(hall,2,2.7,2.2,teal,1.55,4.6,-.3,.13);
  box(hall,2.13,.17,2.33,white,1.55,6.03,-.3,.04);
  for(let i=0;i<3;i++)box(hall,1.7,.12,.03,mint,1.55,3.8+i*.55,.82);
  sign(hall,'ROADNA','CITY HALL',0,3.65,2.22,3.3,.9);
  cylinder(hall,.035,.035,2.3,'#82958b',-2.3,4.95,-1.4,6);
  box(hall,.75,.42,.03,teal,-1.92,5.6,-1.4,.03);
  // Small map/information center with canopy and outdoor map monument.
  const mapCenter=group(fixed,12.3,5.8);
  parapet(mapCenter,3.6,2.15,3.2,white);
  box(mapCenter,3.1,1.25,.05,glass,0,1.15,1.64,.025);
  for(const x of [-1,0,1])box(mapCenter,.06,1.3,.07,teal,x,1.15,1.7);
  box(mapCenter,4.2,.21,3.8,teal,0,2.55,.12,.16);
  sign(mapCenter,'MAP','PUBLIC REPORTS',0,2.15,1.73,1.9,.65);
  cylinder(mapCenter,.55,.75,.25,stone,-2.5,.3,.5,12);
  cylinder(mapCenter,.11,.15,1.7,teal,-2.5,1.15,.5,8);
  const mapSign=box(mapCenter,1.3,.95,.1,mint,-2.5,2.03,.5,.09);mapSign.rotation.y=-.18;
  box(mapCenter,.06,.62,.12,teal,-2.65,2.03,.58);box(mapCenter,.86,.065,.12,teal,-2.5,2.08,.58);
  // Community plaza and park.
  box(fixed,11,.12,8.2,'#b8d3a5',5.8,.17,9.1,.45);
  box(fixed,2.1,.05,8,'#f2e6d0',4.2,.255,9.1,.1);
  box(fixed,9.2,.05,1.4,'#f2e6d0',5.9,.255,9.8,.1);
  box(fixed,3.1,.05,1.1,'#f2e6d0',5.3,.255,11.8,.1);
  box(fixed,.9,.05,2.6,'#f2e6d0',6.5,.255,10.8,.1);
  const tree=(parent,x,z,r=1,animatedTree=false)=>{
    const g=group(parent,x,z);cylinder(g,.1,.16,1.1,'#97755b',0,.7,0,7);
    sphere(g,r,'#739d70',0,1.8,0);sphere(g,r*.72,'#91b17c',.32,2.25,-.14);sphere(g,r*.63,'#527f64',-.42,1.87,.15);
    if(animatedTree)environment.push(g);return g;
  };
  const environment=[];
  for(const [x,z,r] of [[.3,6.4,.9],[1.1,11.7,1.1],[7.5,6.4,1],[9.8,11.9,1.15],[7,12,1],[14.7,11.5,1],[-14.8,8,.7],[-14.8,3.5,.8],[-8.8,12.3,.8],[-15,-7,.85],[-15.1,-11.8,.8],[7,-12.5,.75],[10.5,-12.3,.75],[15,-12,.7]])tree(fixed,x,z,r);
  tree(animated,7.4,10.8,.85,true);tree(animated,-1.1,4.2,.8,true);
  const bench=(x,z,rotation=0)=>{
    const g=group(fixed,x,z);g.rotation.y=rotation;
    for(let k=0;k<3;k++)box(g,1.3,.075,.13,'#b68c63',0,.58,(k-1)*.18,.02);
    for(const x of [-.45,.45]){box(g,.07,.42,.5,teal,x,.39,0);box(g,.07,.9,.06,teal,x,.68,-.29);}
    for(let k=0;k<2;k++)box(g,1.3,.11,.06,'#b68c63',0,.83+k*.18,-.29,.02);
  };
  bench(5.9,8.7);bench(2.8,10.5,Math.PI/2);bench(10.7,10.7);
  const board=group(fixed,2,6.1);
  for(const x of [-.8,.8])box(board,.09,1.85,.1,teal,x,1.2,0);
  box(board,2.1,1.3,.19,cream,0,1.75,0,.08);
  for(const [x,y,color] of [[-.5,1.9,white],[.1,1.9,mint],[.58,1.56,orange],[-.3,1.4,white]])box(board,.42,.4,.03,color,x,y,.11,.015);
  box(board,2.3,.13,.42,teal,0,2.46,0,.04);
  sign(board,'COMMUNITY','NOTICE BOARD',0,2.17,.14,1.6,.35);
  const pavilion=group(fixed,7.7,8.3);
  cylinder(pavilion,1.4,1.4,.12,cream,0,.32,0,16);
  for(const x of [-.85,.85])for(const z of [-.85,.85])cylinder(pavilion,.065,.07,1.6,white,x,1.12,z,8);
  const roof=cylinder(pavilion,0,1.65,.7,teal,0,2.2,0,4);roof.rotation.y=Math.PI/4;
  cylinder(pavilion,.4,.4,.45,stone,0,.65,0,10);
  // Parking, traffic signals, bins, utility details and planted sidewalks.
  box(fixed,5,.055,3.3,'#849691',.9,.16,4.3,.13);
  for(let x=-1.2;x<3;x+=1.2)box(fixed,.04,.016,2.7,white,x,.197,4.3);
  const lamp=(x,z,rotation=0)=>{
    const g=group(fixed,x,z);g.rotation.y=rotation;
    cylinder(g,.035,.055,2.4,'#3d5958',0,1.45,0,7);
    box(g,.5,.065,.07,'#3d5958',.2,2.65,0,.02);
    const light=box(g,.33,.06,.21,'#ffe4a0',.39,2.6,0,.035);light.material=material('#ffe4a0',{emissive:'#9f6d25',emissiveIntensity:.25});
    cylinder(g,.17,.2,.1,stone,0,.28,0,8);
  };
  for(const x of [-14,-9,-.8,6.8,11,15]){lamp(x,2.5,Math.PI);lamp(x,-2.5);}
  for(const z of [-11.5,-5,6,12])lamp(-7.5,z,-Math.PI/2);
  for(const [x,z] of [[-7.7,2.4],[-2.4,-2.5]]){
    cylinder(fixed,.045,.06,2.3,'#4b615f',x,1.4,z,8);box(fixed,.18,.62,.17,teal,x,2.36,z,.025);
    sphere(fixed,.045,'#e8ac71',x,2.5,z+.09);sphere(fixed,.045,'#8bbc9c',x,2.27,z+.09);
  }
  for(const [x,z] of [[3,6.2],[9.5,9.8],[-9,3]]){cylinder(fixed,.22,.2,.52,teal,x,.5,z,8);cylinder(fixed,.24,.24,.07,'#3e6862',x,.8,z,8);}
  for(const x of [-12,-9,1,7,14]){box(fixed,.85,.24,.43,cream,x,.38,2.63,.07);sphere(fixed,.27,'#6e9362',x,.68,2.63);}
  // Irregular shallow pothole: broken rim and dark recess, kept clear of traffic.
  const hazard=new THREE.Group();hazard.position.set(5,.185,.8);fixed.add(hazard);
  const shape=new THREE.Shape();for(let i=0;i<11;i++){const a=i/11*Math.PI*2,r=.69+(i%3)*.075;const x=Math.cos(a)*r,z=Math.sin(a)*r*.68;i?shape.lineTo(x,z):shape.moveTo(x,z);}shape.closePath();
  const holeGeo=new THREE.ShapeGeometry(shape);holeGeo.rotateX(-Math.PI/2);const hole=new THREE.Mesh(holeGeo,material('#202a2b'));hazard.add(hole);
  for(let i=0;i<11;i++){const a=i/11*Math.PI*2;const rim=box(hazard,.24,.055,.15,'#65716c',Math.cos(a)*.83,.018,Math.sin(a)*.55,.025);rim.rotation.y=-a;}
  for(const [x,z] of [[6.35,1.42],[4,1.45]]){cylinder(fixed,.025,.16,.38,orange,x,.38,z,8);box(fixed,.32,.055,.32,'#fff0ce',x,.2,z,.02);}
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.98,.028,5,40),new THREE.MeshBasicMaterial({color:orange,transparent:true,opacity:.9}));ring.rotation.x=-Math.PI/2;ring.scale.y=.76;ring.position.set(5,.255,.8);animated.add(ring);
  const pin=new THREE.Group();pin.position.set(5,2.15,.8);animated.add(pin);
  const pinHead=sphere(pin,.38,teal,0,.32,0);pinHead.material=material(teal,{emissive:teal,emissiveIntensity:.18});
  const point=cylinder(pin,.24,0,.47,teal,0,-.05,0,5);point.rotation.z=Math.PI;
  sphere(pin,.14,white,0,.36,.34);
  const landmarks=[
    {id:'report',label:'Report an Issue',href:'../login/index.html',position:new THREE.Vector3(5,1.8,.8),center:new THREE.Vector3(5,0,.8),size:[2.8,2.7,2.5]},
    {id:'map',label:'Explore Reports',href:'../public-guest-menu/index.html',position:new THREE.Vector3(12.3,3.3,5.8),center:new THREE.Vector3(12.3,1,5.8),size:[4.4,4,4]},
    {id:'resident',label:'Resident Area',href:'../login/index.html',position:new THREE.Vector3(-11.2,4.2,6.7),center:new THREE.Vector3(-11.2,1.7,6.7),size:[5,4.7,4.5]},
    {id:'hall',label:'Municipality',href:'../login/index.html',position:new THREE.Vector3(8,7,-5.4),center:new THREE.Vector3(8,2.7,-5.4),size:[6.2,6.5,5]},
    {id:'community',label:'Community Report',href:'../report-details/index.html',position:new THREE.Vector3(2,3,6.1),center:new THREE.Vector3(2,1.2,6.1),size:[2.8,3,1.5]},
    {id:'park',label:'How RoadNa Works',href:'#how-it-works',position:new THREE.Vector3(7.7,3,8.3),center:new THREE.Vector3(7.7,1,8.3),size:[3.4,3.3,3.4]}
  ];
  const pickTargets=[];
  for(const item of landmarks){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(...item.size),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));mesh.position.copy(item.center);mesh.userData.landmark=item;animated.add(mesh);pickTargets.push(mesh);
  }
  const highlight=new THREE.Mesh(new THREE.RingGeometry(1.3,1.43,40),new THREE.MeshBasicMaterial({color:teal,transparent:true,opacity:.8,side:THREE.DoubleSide}));highlight.rotation.x=-Math.PI/2;highlight.visible=false;animated.add(highlight);
  const batches=bakeStatic(fixed);
  return {kit,fixed,animated,landmarks,pickTargets,ring,pin,environment,highlight,batches};
}
