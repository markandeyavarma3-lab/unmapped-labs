import { LogoMark } from "@/components/brand/Logo";
import { site } from "@/config/site";
import { IntroSkip } from "./IntroSkip";

/**
 * Runs before first paint. Shows the intro only on a first visit to the home
 * page, never with reduced motion. Everything else renders with no delay.
 */
export const introGateScript = `(function(){try{
var d=document.documentElement,k='ul:intro-seen';d.classList.add('js');
if(location.pathname!=='/'||matchMedia('(prefers-reduced-motion: reduce)').matches||localStorage.getItem(k))return;
d.dataset.intro='on';localStorage.setItem(k,'1');
}catch(e){}})();`;

/**
 * Particle assembly, plain 2D canvas, inline so it starts before hydration:
 * dust streams in and settles onto the logo's grid lines (0–1.1s), holds while
 * the crisp mark resolves, then bursts toward the viewer as the overlay wipes.
 */
const introCanvasScript = `(function(){
var d=document.documentElement;if(d.dataset.intro!=='on')return;
var c=document.getElementById('intro-canvas');if(!c||!c.getContext)return;
var S=360,dpr=Math.min(window.devicePixelRatio||1,2);c.width=S*dpr;c.height=S*dpr;
var g=c.getContext('2d');g.scale(dpr,dpr);
var U=96/33,O=(S-96)/2;
var segs=[[21,3,3,3,0],[3,3,3,30,0],[3,30,30,30,0],[30,30,30,12,0],[12,3,12,30,1],[21,12,21,30,1],[3,12,21,12,1],[3,21,30,21,1],[12,21,21,12,2],[21,12,26.6,6.4,2]];
var L=0,i;for(i=0;i<segs.length;i++){var s=segs[i];s.push(Math.hypot(s[2]-s[0],s[3]-s[1]));L+=s[5];}
var N=620,P=[];
function rnd(a){return Math.random()*a;}
for(i=0;i<N;i++){var tx,ty,kind;
 if(i<40){var a=rnd(6.283),r=rnd(2.3);tx=28.4+Math.cos(a)*r;ty=4.6+Math.sin(a)*r;kind=2;}
 else{var pick=rnd(L),j=0;while(pick>segs[j][5]){pick-=segs[j][5];j++;}var s2=segs[j],f=pick/s2[5];tx=s2[0]+(s2[2]-s2[0])*f;ty=s2[1]+(s2[3]-s2[1])*f;kind=s2[4];}
 var ang=rnd(6.283),rad=120+rnd(160);
 P.push({sx:S/2+Math.cos(ang)*rad,sy:S/2+Math.sin(ang)*rad,tx:O+tx*U,ty:O+ty*U,k:kind,d:rnd(0.35),z:0.6+rnd(0.8),bx:Math.cos(ang),by:Math.sin(ang)});}
var t0=performance.now();
function ease(t){return 1-Math.pow(1-t,3);}
function frame(now){var t=(now-t0)/1000;g.clearRect(0,0,S,S);
 if(t>2.4||d.dataset.introDone){return;}
 for(var n=0;n<N;n++){var p=P[n],x,y,a,sz;
  var e=ease(Math.min(1,Math.max(0,(t-p.d)/0.85)));
  x=p.sx+(p.tx-p.sx)*e;y=p.sy+(p.ty-p.sy)*e;a=0.15+0.85*e;sz=p.k===2?1.5:1.1;
  if(t>1.5){var b=Math.min(1,(t-1.5)/0.7),bb=b*b;x+=p.bx*bb*260*p.z;y+=p.by*bb*260*p.z;sz*=1+bb*3*p.z;a*=1-b;}
  else if(t>1.05){a*=1-Math.min(1,(t-1.05)/0.35)*0.65;}
  g.fillStyle=p.k===2?'rgba(101,228,232,'+a+')':(p.k===1?'rgba(242,241,235,'+(a*0.55)+')':'rgba(242,241,235,'+a+')');
  g.fillRect(x-sz/2,y-sz/2,sz,sz);}
 requestAnimationFrame(frame);}
requestAnimationFrame(frame);
})();`;

export function Intro() {
  return (
    <div
      className="intro fixed inset-0 z-[var(--z-intro)] flex flex-col items-center justify-center bg-[color:var(--color-ink)]"
      role="presentation"
    >
      <div className="relative flex flex-col items-center gap-7">
        <div className="relative flex h-[96px] w-[96px] items-center justify-center">
          <canvas
            id="intro-canvas"
            aria-hidden
            suppressHydrationWarning
            className="pointer-events-none absolute top-1/2 left-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2"
          />
          <script dangerouslySetInnerHTML={{ __html: introCanvasScript }} />
          <LogoMark className="intro-mark relative h-[96px] w-[96px] text-[color:var(--color-fg)]" />
        </div>
        <p className="intro-tagline text-lg font-medium tracking-[-0.02em] text-[color:var(--color-fg)] sm:text-xl">{site.tagline}</p>
        <div className="intro-meter flex w-56 items-center gap-3">
          <span className="label tabular-nums text-[color:var(--color-fg-2)]">
            <span className="intro-count" />
          </span>
          <span className="relative h-px flex-1 overflow-hidden bg-[color:var(--color-line)]">
            <span className="intro-bar absolute inset-y-0 left-0 bg-[color:var(--color-cyan)]" />
          </span>
          <span className="label text-[color:var(--color-fg-3)]">Survey</span>
        </div>
      </div>
      <IntroSkip />
    </div>
  );
}
