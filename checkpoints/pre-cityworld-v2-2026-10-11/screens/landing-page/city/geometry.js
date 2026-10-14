import * as THREE from './three.js';

// Reusable geometry/materials keep the diorama small and consistent.
export function createKit() {
  const materials = new Map(), geometries = new Map();
  const material = (color, extra = {}) => {
    const key = color + JSON.stringify(extra);
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .82, ...extra }));
    return materials.get(key);
  };
  const geometry = (key, factory) => {
    if (!geometries.has(key)) geometries.set(key, factory());
    return geometries.get(key);
  };
  const add = (parent, geo, mat, x, y, z) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  };
  const box = (parent, w, h, d, color, x = 0, y = 0, z = 0, radius = 0) => {
    const key = ['box', w, h, d, radius].join(':');
    return add(parent, geometry(key, () => {
      if (!radius) return new THREE.BoxGeometry(w, h, d);
      const shape = new THREE.Shape(), r = Math.min(radius, w / 3, d / 3), a = -w / 2, b = -d / 2;
      shape.moveTo(a + r, b); shape.lineTo(a + w - r, b); shape.quadraticCurveTo(a + w, b, a + w, b + r);
      shape.lineTo(a + w, b + d - r); shape.quadraticCurveTo(a + w, b + d, a + w - r, b + d);
      shape.lineTo(a + r, b + d); shape.quadraticCurveTo(a, b + d, a, b + d - r);
      shape.lineTo(a, b + r); shape.quadraticCurveTo(a, b, a + r, b);
      const bevel = Math.min(.055, h / 4);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: h - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, steps: 1, curveSegments: 3 });
      geo.rotateX(-Math.PI / 2); geo.translate(0, -h / 2 + bevel, 0); return geo;
    }), material(color), x, y, z);
  };
  const cylinder = (parent, top, bottom, h, color, x = 0, y = 0, z = 0, sides = 10) => add(parent, geometry(['cyl',top,bottom,h,sides].join(':'), () => new THREE.CylinderGeometry(top,bottom,h,sides)), material(color),x,y,z);
  const sphere = (parent, r, color, x=0,y=0,z=0) => add(parent, geometry('ico:'+r,()=>new THREE.IcosahedronGeometry(r,1)),material(color),x,y,z);
  const sign = (parent, text, subtitle, x,y,z,w=2.6,h=.75) => {
    const canvas = document.createElement('canvas'); canvas.width=512; canvas.height=160;
    const ctx=canvas.getContext('2d'); ctx.fillStyle='#087f80';ctx.fillRect(0,0,512,160);
    ctx.textAlign='center';ctx.fillStyle='#fafaf6';ctx.font='700 58px Arial';ctx.fillText(text,256,76);
    ctx.font='500 25px Arial';ctx.fillText(subtitle,256,122);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const mesh=add(parent,new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:texture,roughness:.9}),x,y,z);mesh.castShadow=false;return mesh;
  };
  return {material,geometry,add,box,cylinder,sphere,sign,materials,geometries};
}

// Bake immobile details into material batches, preserving shadows and surfaces.
export function bakeStatic(root) {
  root.updateMatrixWorld(true);
  const groups=new Map(), remove=[];
  root.traverse(mesh=>{
    if(!mesh.isMesh || Array.isArray(mesh.material) || mesh.material.map)return;
    const geo=mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    if(!groups.has(mesh.material))groups.set(mesh.material,[]);
    groups.get(mesh.material).push(geo);remove.push(mesh);
  });
  remove.forEach(mesh=>mesh.removeFromParent());
  for(const [mat, list] of groups) {
    const merged=new THREE.BufferGeometry();
    for(const attr of ['position','normal','uv']) {
      const length=list.reduce((sum,geo)=>sum+(geo.getAttribute(attr)?.array.length||0),0);
      const values=new Float32Array(length);let offset=0;
      for(const geo of list){const source=geo.getAttribute(attr)?.array;if(source){values.set(source,offset);offset+=source.length;}}
      if(length)merged.setAttribute(attr,new THREE.BufferAttribute(values,attr==='uv'?2:3));
    }
    merged.computeBoundingSphere();const mesh=new THREE.Mesh(merged,mat);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
    list.forEach(geo=>geo.dispose());
  }
  return groups.size;
}
