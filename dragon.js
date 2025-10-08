// dragon.js
"use strict";

/*
 Multiple small colored dragons roam the scene.
 When two dragons come close they briefly 'fight' (pulse, flash color, push apart).
 Designed to be lightweight and self-contained.
*/

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

// track pointer slightly so dragons may react
window.addEventListener("pointermove", (e) => {
  const rect = svg.getBoundingClientRect();
  pointer.x = (e.clientX - rect.left) * (svg.viewBox.baseVal.width / rect.width);
  pointer.y = (e.clientY - rect.top) * (svg.viewBox.baseVal.height / rect.height);
});

// utility
function rand(min, max){ return Math.random() * (max - min) + min; }
function dist(a,b){ const dx = a.x-b.x, dy = a.y-b.y; return Math.hypot(dx,dy); }
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

// dragon colors palette
const palettes = [
  ["#FF7A7A","#FFB3B3"], // pink
  ["#7ACBFF","#CFEFFF"], // blue
  ["#9AFF8F","#DFFFE6"], // green
  ["#FFD37A","#FFF0CF"], // gold
  ["#CFA1FF","#EBDCFF"]  // purple
];

// Dragon class: keeps SVG elements and movement state
class Dragon {
  constructor(id, colorIndex, x, y, scale) {
    this.id = id;
    this.colorIndex = colorIndex;
    this.baseColor = palettes[colorIndex][0];
    this.accent = palettes[colorIndex][1];
    this.x = x; this.y = y;
    this.vx = rand(-0.6,0.6); this.vy = rand(-0.3,0.3);
    this.scale = scale;
    this.segments = Math.floor(8 * scale) + 4;
    this.group = document.createElementNS(xmlns, "g");
    this.group.setAttribute("transform", `translate(${this.x},${this.y}) scale(${this.scale})`);
    // create head + spine elements
    this.parts = [];
    this.createParts();
    this.fighting = false;
    this.fightTimer = 0;
    this.roamTimer = rand(80, 240); // change course occasionally
    screen.appendChild(this.group);
  }

  createParts(){
    // head
    const head = document.createElementNS(xmlns, "use");
    head.setAttributeNS(xlinkns, "xlink:href", "#Cabeza");
    head.setAttribute("fill", this.baseColor);
    head.setAttribute("stroke", "#111");
    head.setAttribute("stroke-width", 0.6);
    head.setAttribute("transform", "translate(0,0)");
    this.group.appendChild(head);
    this.parts.push(head);

    // spine segments
    for(let i=0;i<this.segments;i++){
      const seg = document.createElementNS(xmlns, "use");
      seg.setAttributeNS(xlinkns, "xlink:href", "#Espina");
      seg.setAttribute("fill", this.accent);
      seg.setAttribute("opacity", 0.95 - i*(0.02));
      this.group.appendChild(seg);
      this.parts.push(seg);
      // occasional fin
      if(i%3===0){
        const fin = document.createElementNS(xmlns, "use");
        fin.setAttributeNS(xlinkns, "xlink:href", "#Aletas");
        fin.setAttribute("fill", this.baseColor);
        fin.setAttribute("opacity", 0.9);
        this.group.appendChild(fin);
        this.parts.push(fin);
      }
    }
  }

  // update position + parts transforms
  update() {
    // if fighting, apply fight behaviour
    if(this.fighting){
      this.fightTimer--;
      // pulse scale effect via transform on group
      const pulse = 1 + 0.08 * Math.sin((this.fightTimer%20)/3);
      this.group.setAttribute("transform", `translate(${this.x},${this.y}) scale(${this.scale * pulse})`);
      // flash color by toggling filter and fill
      const flashOn = (this.fightTimer % 10) < 5;
      this.parts.forEach((p,i) => {
        if(flashOn) p.setAttribute("filter","url(#glow)");
        else p.removeAttribute("filter");
      });
      if(this.fightTimer <= 0){
        this.fighting = false;
        this.parts.forEach(p => p.removeAttribute("filter"));
      }
      // during fight, small jitter velocities
      this.x += this.vx * 0.6 + rand(-0.8,0.8);
      this.y += this.vy * 0.6 + rand(-0.6,0.6);
    } else {
      // normal roaming: slight attraction to pointer sometimes
      if(Math.random() < 0.008) {
        // small nudge towards pointer
        this.vx += (pointer.x - this.x) * 0.0009;
        this.vy += (pointer.y - this.y) * 0.0009;
      }
      // roam timer influences random course changes
      this.roamTimer--;
      if(this.roamTimer <= 0){
        this.vx += rand(-0.8,0.8) * 0.2;
        this.vy += rand(-0.6,0.6) * 0.2;
        this.roamTimer = rand(80, 240);
      }
      // friction & clamp
      this.vx *= 0.985;
      this.vy *= 0.985;
      this.vx = clamp(this.vx, -4, 4);
      this.vy = clamp(this.vy, -3, 3);

      this.x += this.vx;
      this.y += this.vy;

      // keep inside bounds with soft bounce
      if(this.x < 30){ this.x = 30; this.vx *= -0.6; }
      if(this.y < 30){ this.y = 30; this.vy *= -0.6; }
      if(this.x > width-30){ this.x = width-30; this.vx *= -0.6; }
      if(this.y > height-30){ this.y = height-30; this.vy *= -0.6; }

      // slight wagging head/spine movement
      this.group.setAttribute("transform", `translate(${this.x},${this.y}) scale(${this.scale})`);
    }

    // update each part's transform to create tail curvature
    // simple procedural spacing behind head
    let px = 0, py = 0;
    let angle = Math.atan2(this.vy || 0.0001, this.vx || 0.0001);
    let spread = 12 * this.scale;
    let idx = 0;
    for(let i=0;i<this.parts.length;i++){
      const p = this.parts[i];
      // alternate segments as spine/fin/head
      const dx = Math.cos(angle + (i*0.18)) * (spread + i*1.2);
      const dy = Math.sin(angle + (i*0.18)) * (spread + i*0.6);
      const tx = px - dx;
      const ty = py - dy;
      p.setAttribute("transform", `translate(${tx.toFixed(2)}, ${ty.toFixed(2)}) rotate(${(angle*180/Math.PI).toFixed(2)})`);
      // slightly change stroke/fill during fight
      if(this.fighting){
        p.setAttribute("opacity", 1);
      } else {
        p.setAttribute("opacity", clamp(1 - i*0.02, 0.4, 1));
      }
      idx++;
    }
  }

  // trigger a brief fight: flash + push
  startFight(withDragon) {
    if(this.fighting) return;
    this.fighting = true;
    this.fightTimer = 40 + Math.floor(rand(0,40));
    // push apart
    const dx = this.x - withDragon.x || rand(-1,1);
    const dy = this.y - withDragon.y || rand(-1,1);
    const d = Math.hypot(dx,dy) || 1;
    const push = 3.5 * this.scale;
    this.vx += (dx/d) * push;
    this.vy += (dy/d) * push;
    // play a brief color swap by setting fill to white-ish then back (handled in update via filter)
    this.parts.forEach(p => {
      p.setAttribute("fill", this.accent);
    });
  }
}

// create multiple dragons
const dragons = [];
const DRAGON_COUNT = 7; // change this value to increase/decrease dragons
for(let i=0;i<DRAGON_COUNT;i++){
  const ci = Math.floor(rand(0, palettes.length || 5));
  const s = rand(0.45, 0.85); // smaller dragons
  const x = rand(60, (svg.viewBox.baseVal.width || window.innerWidth) - 60);
  const y = rand(60, (svg.viewBox.baseVal.height || window.innerHeight) - 60);
  // safe palette reference for the file-local copy (we need palettes here too)
  // recreate palette constants locally to keep file independent
  const palettesLocal = [
    ["#FF7A7A","#FFB3B3"],
    ["#7ACBFF","#CFEFFF"],
    ["#9AFF8F","#DFFFE6"],
    ["#FFD37A","#FFF0CF"],
    ["#CFA1FF","#EBDCFF"]
  ];
  // temporarily override global palettes by creating Dragon then recolor
  const d = new Dragon(i, i % palettesLocal.length, x, y, s);
  // manually set fill colors from palettesLocal to ensure correct colors
  d.baseColor = palettesLocal[i % palettesLocal.length][0];
  d.accent = palettesLocal[i % palettesLocal.length][1];
  d.parts.forEach((p, idx) => {
    // head uses baseColor, spines use accent
    if(idx === 0) p.setAttribute("fill", d.baseColor);
    else if((idx % 3) === 1) p.setAttribute("fill", d.accent);
    else p.setAttribute("fill", d.baseColor);
  });
  dragons.push(d);
}

// collision / fight detection loop
function checkFights(){
  for(let i=0;i<dragons.length;i++){
    for(let j=i+1;j<dragons.length;j++){
      const a = dragons[i], b = dragons[j];
      const d = dist(a, b);
      const threshold = 26 * (a.scale + b.scale); // scale with size
      if(d < threshold){
        // if close and not already fighting, start fight both ways
        if(!a.fighting && !b.fighting){
          a.startFight(b);
          b.startFight(a);
        }
      }
    }
  }
}

// main animation
function animate(){
  requestAnimationFrame(animate);
  dragons.forEach(d => d.update());
  checkFights();
}
animate();

// expose for debug if loaded in iframe
window._dragonState = { dragons };
