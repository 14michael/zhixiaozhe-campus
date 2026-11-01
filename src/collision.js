export function contains(box,x,z,padding=0) {return x>box.minX-padding&&x<box.maxX+padding&&z>box.minZ-padding&&z<box.maxZ+padding;}
export function safePosition(x,z,boxes) {return Math.abs(x)<76&&z>-77&&z<84&&!boxes.some(b=>b.walk!==false&&contains(b,x,z,.38));}
export function move(position,dx,dz,boxes) {
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.18));
  for(let i=0;i<steps;i++) {if(safePosition(position.x+dx/steps,position.z,boxes))position.x+=dx/steps;if(safePosition(position.x,position.z+dz/steps,boxes))position.z+=dz/steps;}
}
export function rayBox(origin,dir,box,maxDistance,padding=.4) {
  let near=0,far=maxDistance;
  for(const [axis,min,max] of [['x','minX','maxX'],['y','minY','maxY'],['z','minZ','maxZ']]) {
    const lo=box[min]-padding,hi=box[max]+padding;
    if(Math.abs(dir[axis])<1e-8){if(origin[axis]<lo||origin[axis]>hi)return maxDistance;continue;}
    let a=(lo-origin[axis])/dir[axis],b=(hi-origin[axis])/dir[axis];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return maxDistance;
  }
  return near;
}
