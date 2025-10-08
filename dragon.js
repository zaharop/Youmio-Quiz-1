// dragon.js (updated: larger, prettier dragons)
"use strict";

const svg = document.getElementById("svgroot");
const screen = document.getElementById("screen");
const xmlns = "http://www.w3.org/2000/svg";
const xlinkns = "http://www.w3.org/1999/xlink";

let width = svg.viewBox.baseVal.width || window.innerWidth;
let height = svg.viewBox.baseVal.height || window.innerHeight;
const pointer = { x: width/2, y: height/2 };

window.addEventListener("resize", () => {
  width = svg.viewBox.baseVal.width || window.innerWidth;
  height = svg.viewBox.baseVal.height || window.innerHeight;
});

window.addEventListener("pointermove", (e) => {
  const rect = svg.getBoundingClientRect();
  pointer.x = (e.clientX - rect.left) * (svg.viewBox.baseVal.width / rect.width);
  pointer.y = (e.clientY - rect.top) * (svg.viewBox.baseVal.height / rect.height);
});

function rand(min, max){ return Math.random() * (max - min) + min; }
function dist(a,b){ const dx = a.x-b.x, dy = a.y-b.y; return Math.hypot(dx,dy); }
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

const palettesLocal = [
  ["#FF7A7A","#FFB3B3"],
  ["#7ACBFF","#CFEFFF"],
  ["#9AFF8F","#DFFFE6"],
  ["#FFD37A","#FFF0CF"],
  ["#CFA1FF","#EBDCFF"]
];

class Dragon {
  constructor(id, colorIndex, x, y, scale) {
    this.id = id;
    this.colorIndex = colorIndex;
    this.baseColor = palettesLocal[colorIndex][0];
    this.accent = palettesLocal[colorIndex][1];
    this.x = x; this.y = y;
    this.vx = rand(-0.9,0.9); this.vy = rand(-0.6,0.6);
    this.scale = scale;
    this.segments = Math.floor(10 * scale) + 6;
    this.group = document.createElementNS(xmlns, "g");
    this.group.setAttribute("transform", `translate(${this.x},${this.y}) scale(${this.scale})`);
    this.parts = [];
    this.createParts();
    this.fighting = false;
    this.fightTimer = 0;
    this.roamTimer = rand(60, 180);
    screen.appendChild(this.group);
  }

  createParts(){
    const head = document.createElementNS(xmlns, "use");
    head.setAttributeNS(xlinkns, "xlink:href", "#Cabeza");
    head.setAttribute("fill", this.baseColor);
    head.setAttribute("stroke", "#111");
    head.setAttribute("stroke-width", 0.9 * this.scale);
    head.setAttribute("transform", "translate(0,0)");
    this.group.appendChild(head);
    this.parts.push(head);

    for(let i=0;i<this.segments;i++){
      const seg = document.createElementNS(xmlns, "use");
      seg.setAttributeNS(xlinkns, "xlink:href", "#Espina");
      seg.setAttribute("fill", this.accent);
      seg.setAttribute("opacity", clamp(1 - i*(0.02), 0.35, 1));
      seg.setAttribute("stroke", "#111");
      seg.setAttribute("stroke-width", 0.4 * this.scale);
      this.group.appendChild(seg);
      this.parts.push(seg);

      if(i%3===0){
        const fin = document.createElementNS(xmlns, "use");
        fin.setAttributeNS(xlinkns, "xlink:href", "#Aletas");
        fin.setAttribute("fill", this.baseColor);
        fin.setAttribute("opacity", 0.95);
        this.group.appendChild(fin);
        this.parts.push(fin);
      }
    }
  }

  update() {
    if(this.fighting){
      this.fightTimer--;
      const pulse = 1 + 0.12 * Math.sin((this.fightTimer%24)/3);
      this.group.setAttribute("transform", `translate(${this.x},${this.y}) scale(${this.scale * pulse})`);
      const flashOn = (this.fightTimer % 12) < 6;
      this.parts.forEach((p) => {
        if(flashOn) p.setAttribute("filter","url(#glow)");
        else p.removeAttribute("filter");
      });
      if(this.fightTimer <= 0){
        this.fighting = false;
        this.parts.forEach(p => p.removeAttribute("filter"));
      }
      this.x += this.vx * 0.8 + rand(-1.2,1.2);
      this.y += this.vy * 0.8 + rand(-0.9,0.9);
    } else {
      if(Math.random() < 0.01) {
        this.vx += (pointer.x - this.x) * 0.0008;
        this.vy += (pointer.y - this.y) * 0.0008;
      }
      this.roamTimer--;
      if(this.roamTimer <= 0){
        this.vx += rand(-1.2,1.2) * 0.25;
        this.vy += rand(-0.9,0.9) * 0.25;
        this.roamTimer = rand(60, 180);
      }
      this.vx *= 0.982;
      this.vy *= 0.982;
      this.vx = clamp(this.vx, -4.5, 4.5);
      this.vy = clamp(this.vy, -3.5, 3.5);
      this.x += this.vx;
      this.y += this.vy;
      if(this.x < 40){ this.x = 40; this.vx *= -0.6; }
      if(this.y < 40){ this.y = 40; this.vy *= -0.6; }
      if(this.x > width-40){ this.x = width-40; this.vx *= -0.6; }
      if(this.y > height-40){ this.y = height-40; this.vy *= -0.6; }
      this.group.setAttribute("transform", `translate(${this.x},${this.y}) scale(${this.scale})`);
    }

    let angle = Math.atan2(this.vy || 0.0001, this.vx || 0.0001);
    let spread = 16 * this.scale;
    for(let i=0;i<this.parts.length;i++){
      const p = this.parts[i];
      const dx = Math.cos(angle + (i*0.14)) * (spread + i*1.6);
      const dy = Math.sin(angle + (i*0.14)) * (spread + i*0.9);
      const tx = -dx;
      const ty = -dy;
      p.setAttribute("transform", `translate(${tx.toFixed(2)}, ${ty.toFixed(2)}) rotate(${(angle*180/Math.PI).toFixed(2)})`);
      if(this.fighting) p.setAttribute("opacity", 1);
      else p.setAttribute("opacity", clamp(1 - i*0.015, 0.35, 1));
    }
  }

  startFight(withDragon) {
    if(this.fighting) return;
    this.fighting = true;
    this.fightTimer = 50 + Math.floor(rand(0,40));
    const dx = this.x - withDragon.x || rand(-1,1);
    const dy = this.y - withDragon.y || rand(-1,1);
    const d = Math.hypot(dx,dy) || 1;
    const push = 5.2 * this.scale;
    this.vx += (dx/d) * push;
    this.vy += (dy/d) * push;
    this.parts.forEach(p => p.setAttribute("fill", this.accent));
  }
}

const dragons = [];
const DRAGON_COUNT = 5;
for(let i=0;i<DRAGON_COUNT;i++){
  const ci = i % palettesLocal.length;
  const s = rand(0.9, 1.5); // noticeably larger
  const x = rand(120, (svg.viewBox.baseVal.width || window.innerWidth) - 120);
  const y = rand(120, (svg.viewBox.baseVal.height || window.innerHeight) - 120);
  const d = new Dragon(i, ci, x, y, s);
  d.parts.forEach((p, idx) => {
    if(idx === 0) p.setAttribute("fill", d.baseColor);
    else if((idx % 3) === 1) p.setAttribute("fill", d.accent);
    else p.setAttribute("fill", d.baseColor);
  });
  dragons.push(d);
}

function checkFights(){
  for(let i=0;i<dragons.length;i++){
    for(let j=i+1;j<dragons.length;j++){
      const a = dragons[i], b = dragons[j];
      const d = dist(a, b);
      const threshold = 48 * (a.scale + b.scale) * 0.6; // larger threshold for bigger dragons
      if(d < threshold){
        if(!a.fighting && !b.fighting){
          a.startFight(b);
          b.startFight(a);
        }
      }
    }
  }
}

function animate(){
  requestAnimationFrame(animate);
  dragons.forEach(d => d.update());
  checkFights();
}
animate();

window._dragonState = { dragons };
