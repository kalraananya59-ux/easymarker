// src/index.ts
import express from "express";
import rateLimit from "express-rate-limit";

// ../../packages/shared/src/ssrf.ts
import { promises as dns } from "dns";
import { isIP } from "net";
var PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i
];
function isPrivateIpLiteral(ip) {
  return PRIVATE_RANGES.some((re) => re.test(ip));
}
async function isPrivateHostname(hostname) {
  const normalized = hostname.toLowerCase();
  if (normalized === "localhost") return true;
  if (isIP(hostname)) return isPrivateIpLiteral(hostname);
  try {
    const results = await dns.lookup(hostname, { all: true, verbatim: true });
    return results.length === 0 || results.some((r) => isPrivateIpLiteral(r.address));
  } catch {
    return true;
  }
}

// src/render.ts
import * as cheerio from "cheerio";

// src/anchoring-bundle.ts
var cachedBundle = null;
function getAnchoringBundle() {
  if (true) {
    return Promise.resolve('"use strict";(()=>{var St=Object.defineProperty;var h=(t,e)=>()=>(t&&(e=t(t=0)),e);var At=(t,e)=>{for(var n in e)St(t,n,{get:e[n],enumerable:!0})};function j(t,e){if(t.match(/^[a-z]+:\\/\\//i))return t;if(t.match(/^\\/\\//))return window.location.protocol+t;if(t.match(/^[a-z]+:/i))return t;let n=document.implementation.createHTMLDocument(),r=n.createElement("base"),o=n.createElement("a");return n.head.appendChild(r),n.body.appendChild(o),e&&(r.href=e),o.href=t,o.href}function f(t){let e=[];for(let n=0,r=t.length;n<r;n++)e.push(t[n]);return e}function v(t,e){let r=(t.ownerDocument.defaultView||window).getComputedStyle(t).getPropertyValue(e);return r?parseFloat(r.replace("px","")):0}function Dt(t){let e=v(t,"border-left-width"),n=v(t,"border-right-width");return t.clientWidth+e+n}function _t(t){let e=v(t,"border-top-width"),n=v(t,"border-bottom-width");return t.clientHeight+e+n}function L(t,e={}){let n=e.width||Dt(t),r=e.height||_t(t);return{width:n,height:r}}function z(){let t,e;try{e=process}catch{}let n=e&&e.env?e.env.devicePixelRatio:null;return n&&(t=parseInt(n,10),Number.isNaN(t)&&(t=1)),t||window.devicePixelRatio||1}function Q(t){(t.width>u||t.height>u)&&(t.width>u&&t.height>u?t.width>t.height?(t.height*=u/t.width,t.width=u):(t.width*=u/t.height,t.height=u):t.width>u?(t.height*=u/t.width,t.width=u):(t.width*=u/t.height,t.height=u))}function K(t,e={}){return t.toBlob?new Promise(n=>{t.toBlob(n,e.type?e.type:"image/png",e.quality?e.quality:1)}):new Promise(n=>{let r=window.atob(t.toDataURL(e.type?e.type:void 0,e.quality?e.quality:void 0).split(",")[1]),o=r.length,i=new Uint8Array(o);for(let c=0;c<o;c+=1)i[c]=r.charCodeAt(c);n(new Blob([i],{type:e.type?e.type:"image/png"}))})}function w(t){return new Promise((e,n)=>{let r=new Image;r.decode=()=>e(r),r.onload=()=>e(r),r.onerror=n,r.crossOrigin="anonymous",r.decoding="async",r.src=t})}async function Mt(t){return Promise.resolve().then(()=>new XMLSerializer().serializeToString(t)).then(encodeURIComponent).then(e=>`data:image/svg+xml;charset=utf-8,${e}`)}async function J(t,e,n){let r="http://www.w3.org/2000/svg",o=document.createElementNS(r,"svg"),i=document.createElementNS(r,"foreignObject");return o.setAttribute("width",`${e}`),o.setAttribute("height",`${n}`),o.setAttribute("viewBox",`0 0 ${e} ${n}`),i.setAttribute("width","100%"),i.setAttribute("height","100%"),i.setAttribute("x","0"),i.setAttribute("y","0"),i.setAttribute("externalResourcesRequired","true"),o.appendChild(i),i.appendChild(t),Mt(o)}var G,u,l,y=h(()=>{G=(()=>{let t=0,e=()=>`0000${(Math.random()*36**4<<0).toString(36)}`.slice(-4);return()=>(t+=1,`u${e()}${t}`)})();u=16384;l=(t,e)=>{if(t instanceof e)return!0;let n=Object.getPrototypeOf(t);return n===null?!1:n.constructor.name===e.name||l(n,e)}});function Ut(t){let e=t.getPropertyValue("content");return`${t.cssText} content: \'${e.replace(/\'|"/g,"")}\';`}function Ft(t){return f(t).map(e=>{let n=t.getPropertyValue(e),r=t.getPropertyPriority(e);return`${e}: ${n}${r?" !important":""};`}).join(" ")}function Ht(t,e,n){let r=`.${t}:${e}`,o=n.cssText?Ut(n):Ft(n);return document.createTextNode(`${r}{${o}}`)}function Z(t,e,n){let r=window.getComputedStyle(t,n),o=r.getPropertyValue("content");if(o===""||o==="none")return;let i=G();try{e.className=`${e.className} ${i}`}catch{return}let c=document.createElement("style");c.appendChild(Ht(i,n,r)),e.appendChild(c)}function N(t,e){Z(t,e,":before"),Z(t,e,":after")}var tt=h(()=>{y()});function Wt(t){let e=/\\.([^./]*?)$/g.exec(t);return e?e[1]:""}function b(t){let e=Wt(t).toLowerCase();return Ot[e]||""}var et,nt,Ot,$=h(()=>{et="application/font-woff",nt="image/jpeg",Ot={woff:et,woff2:et,ttf:"application/font-truetype",eot:"application/vnd.ms-fontobject",png:"image/png",jpg:nt,jpeg:nt,gif:"image/gif",tiff:"image/tiff",svg:"image/svg+xml",webp:"image/webp"}});function Xt(t){return t.split(/,/)[1]}function E(t){return t.search(/^(data:)/)!==-1}function U(t,e){return`data:${e};base64,${t}`}async function F(t,e,n){let r=await fetch(t,e);if(r.status===404)throw new Error(`Resource "${r.url}" not found`);let o=await r.blob();return new Promise((i,c)=>{let s=new FileReader;s.onerror=c,s.onloadend=()=>{try{i(n({res:r,result:s.result}))}catch(a){c(a)}},s.readAsDataURL(o)})}function Bt(t,e,n){let r=t.replace(/\\?.*/,"");return n&&(r=t),/ttf|otf|eot|woff2?/i.test(r)&&(r=r.replace(/.*\\//,"")),e?`[${e}]${r}`:r}async function x(t,e,n){let r=Bt(t,e,n.includeQueryParams);if(M[r]!=null)return M[r];n.cacheBust&&(t+=(/\\?/.test(t)?"&":"?")+new Date().getTime());let o;try{let i=await F(t,n.fetchRequestInit,({res:c,result:s})=>(e||(e=c.headers.get("Content-Type")||""),Xt(s)));o=U(i,e)}catch(i){o=n.imagePlaceholder||"";let c=`Failed to fetch resource: ${t}`;i&&(c=typeof i=="string"?i:i.message),c&&console.warn(c)}return M[r]=o,o}var M,S=h(()=>{M={}});async function Vt(t){let e=t.toDataURL();return e==="data:,"?t.cloneNode(!1):w(e)}async function qt(t,e){if(t.currentSrc){let i=document.createElement("canvas"),c=i.getContext("2d");i.width=t.clientWidth,i.height=t.clientHeight,c?.drawImage(t,0,0,i.width,i.height);let s=i.toDataURL();return w(s)}let n=t.poster,r=b(n),o=await x(n,r,e);return w(o)}async function Yt(t){var e;try{if(!((e=t?.contentDocument)===null||e===void 0)&&e.body)return await A(t.contentDocument.body,{},!0)}catch{}return t.cloneNode(!1)}async function jt(t,e){return l(t,HTMLCanvasElement)?Vt(t):l(t,HTMLVideoElement)?qt(t,e):l(t,HTMLIFrameElement)?Yt(t):t.cloneNode(!1)}async function zt(t,e,n){var r,o;let i=[];return Gt(t)&&t.assignedNodes?i=f(t.assignedNodes()):l(t,HTMLIFrameElement)&&(!((r=t.contentDocument)===null||r===void 0)&&r.body)?i=f(t.contentDocument.body.childNodes):i=f(((o=t.shadowRoot)!==null&&o!==void 0?o:t).childNodes),i.length===0||l(t,HTMLVideoElement)||await i.reduce((c,s)=>c.then(()=>A(s,n)).then(a=>{a&&e.appendChild(a)}),Promise.resolve()),e}function Qt(t,e){let n=e.style;if(!n)return;let r=window.getComputedStyle(t);r.cssText?(n.cssText=r.cssText,n.transformOrigin=r.transformOrigin):f(r).forEach(o=>{let i=r.getPropertyValue(o);o==="font-size"&&i.endsWith("px")&&(i=`${Math.floor(parseFloat(i.substring(0,i.length-2)))-.1}px`),l(t,HTMLIFrameElement)&&o==="display"&&i==="inline"&&(i="block"),o==="d"&&e.getAttribute("d")&&(i=`path(${e.getAttribute("d")})`),n.setProperty(o,i,r.getPropertyPriority(o))})}function Kt(t,e){l(t,HTMLTextAreaElement)&&(e.innerHTML=t.value),l(t,HTMLInputElement)&&e.setAttribute("value",t.value)}function Jt(t,e){if(l(t,HTMLSelectElement)){let n=e,r=Array.from(n.children).find(o=>t.value===o.getAttribute("value"));r&&r.setAttribute("selected","")}}function Zt(t,e){return l(e,Element)&&(Qt(t,e),N(t,e),Kt(t,e),Jt(t,e)),e}async function Nt(t,e){let n=t.querySelectorAll?t.querySelectorAll("use"):[];if(n.length===0)return t;let r={};for(let i=0;i<n.length;i++){let s=n[i].getAttribute("xlink:href");if(s){let a=t.querySelector(s),d=document.querySelector(s);!a&&d&&!r[s]&&(r[s]=await A(d,e,!0))}}let o=Object.values(r);if(o.length){let i="http://www.w3.org/1999/xhtml",c=document.createElementNS(i,"svg");c.setAttribute("xmlns",i),c.style.position="absolute",c.style.width="0",c.style.height="0",c.style.overflow="hidden",c.style.display="none";let s=document.createElementNS(i,"defs");c.appendChild(s);for(let a=0;a<o.length;a++)s.appendChild(o[a]);t.appendChild(c)}return t}async function A(t,e,n){return!n&&e.filter&&!e.filter(t)?null:Promise.resolve(t).then(r=>jt(r,e)).then(r=>zt(t,r,e)).then(r=>Zt(t,r)).then(r=>Nt(r,e))}var Gt,rt=h(()=>{tt();y();$();S();Gt=t=>t.tagName!=null&&t.tagName.toUpperCase()==="SLOT"});function ne(t){let e=t.replace(/([.*+?^${}()|\\[\\]\\/\\\\])/g,"\\\\$1");return new RegExp(`(url\\\\([\'"]?)(${e})([\'"]?\\\\))`,"g")}function re(t){let e=[];return t.replace(ot,(n,r,o)=>(e.push(o),n)),e.filter(n=>!E(n))}async function oe(t,e,n,r,o){try{let i=n?j(e,n):e,c=b(e),s;if(o){let a=await o(i);s=U(a,c)}else s=await x(i,c,r);return t.replace(ne(e),`$1${s}$3`)}catch{}return t}function ie(t,{preferredFontFormat:e}){return e?t.replace(ee,n=>{for(;;){let[r,,o]=te.exec(n)||[];if(!o)return"";if(o===e)return`src: ${r};`}}):t}function H(t){return t.search(ot)!==-1}async function I(t,e,n){if(!H(t))return t;let r=ie(t,n);return re(r).reduce((i,c)=>i.then(s=>oe(s,c,e,n)),Promise.resolve(r))}var ot,te,ee,O=h(()=>{y();$();S();ot=/url\\(([\'"]?)([^\'"]+?)\\1\\)/g,te=/url\\([^)]+\\)\\s*format\\((["\']?)([^"\']+)\\1\\)/g,ee=/src:\\s*(?:url\\([^)]+\\)\\s*format\\([^)]+\\)[,;]\\s*)+/g});async function k(t,e,n){var r;let o=(r=e.style)===null||r===void 0?void 0:r.getPropertyValue(t);if(o){let i=await I(o,null,n);return e.style.setProperty(t,i,e.style.getPropertyPriority(t)),!0}return!1}async function ce(t,e){await k("background",t,e)||await k("background-image",t,e),await k("mask",t,e)||await k("mask-image",t,e)}async function se(t,e){let n=l(t,HTMLImageElement);if(!(n&&!E(t.src))&&!(l(t,SVGImageElement)&&!E(t.href.baseVal)))return;let r=n?t.src:t.href.baseVal,o=await x(r,b(r),e);await new Promise((i,c)=>{t.onload=i,t.onerror=c;let s=t;s.decode&&(s.decode=i),s.loading==="lazy"&&(s.loading="eager"),n?(t.srcset="",t.src=o):t.href.baseVal=o})}async function ae(t,e){let r=f(t.childNodes).map(o=>W(o,e));await Promise.all(r).then(()=>t)}async function W(t,e){l(t,Element)&&(await ce(t,e),await se(t,e),await ae(t,e))}var it=h(()=>{O();y();S();$()});function ct(t,e){let{style:n}=t;e.backgroundColor&&(n.backgroundColor=e.backgroundColor),e.width&&(n.width=`${e.width}px`),e.height&&(n.height=`${e.height}px`);let r=e.style;return r!=null&&Object.keys(r).forEach(o=>{n[o]=r[o]}),t}var st=h(()=>{});async function lt(t){let e=at[t];if(e!=null)return e;let r=await(await fetch(t)).text();return e={url:t,cssText:r},at[t]=e,e}async function ut(t,e){let n=t.cssText,r=/url\\(["\']?([^"\')]+)["\']?\\)/g,i=(n.match(/url\\([^)]+\\)/g)||[]).map(async c=>{let s=c.replace(r,"$1");return s.startsWith("https://")||(s=new URL(s,t.url).href),F(s,e.fetchRequestInit,({result:a})=>(n=n.replace(c,`url(${a})`),[c,a]))});return Promise.all(i).then(()=>n)}function ft(t){if(t==null)return[];let e=[],n=/(\\/\\*[\\s\\S]*?\\*\\/)/gi,r=t.replace(n,""),o=new RegExp("((@.*?keyframes [\\\\s\\\\S]*?){([\\\\s\\\\S]*?}\\\\s*?)})","gi");for(;;){let a=o.exec(r);if(a===null)break;e.push(a[0])}r=r.replace(o,"");let i=/@import[\\s\\S]*?url\\([^)]*\\)[\\s\\S]*?;/gi,c="((\\\\s*?(?:\\\\/\\\\*[\\\\s\\\\S]*?\\\\*\\\\/)?\\\\s*?@media[\\\\s\\\\S]*?){([\\\\s\\\\S]*?)}\\\\s*?})|(([\\\\s\\\\S]*?){([\\\\s\\\\S]*?)})",s=new RegExp(c,"gi");for(;;){let a=i.exec(r);if(a===null){if(a=s.exec(r),a===null)break;i.lastIndex=s.lastIndex}else s.lastIndex=i.lastIndex;e.push(a[0])}return e}async function le(t,e){let n=[],r=[];return t.forEach(o=>{if("cssRules"in o)try{f(o.cssRules||[]).forEach((i,c)=>{if(i.type===CSSRule.IMPORT_RULE){let s=c+1,a=i.href,d=lt(a).then(m=>ut(m,e)).then(m=>ft(m).forEach(p=>{try{o.insertRule(p,p.startsWith("@import")?s+=1:o.cssRules.length)}catch(D){console.error("Error inserting rule from remote css",{rule:p,error:D})}})).catch(m=>{console.error("Error loading remote css",m.toString())});r.push(d)}})}catch(i){let c=t.find(s=>s.href==null)||document.styleSheets[0];o.href!=null&&r.push(lt(o.href).then(s=>ut(s,e)).then(s=>ft(s).forEach(a=>{c.insertRule(a,o.cssRules.length)})).catch(s=>{console.error("Error loading remote stylesheet",s)})),console.error("Error inlining remote css file",i)}}),Promise.all(r).then(()=>(t.forEach(o=>{if("cssRules"in o)try{f(o.cssRules||[]).forEach(i=>{n.push(i)})}catch(i){console.error(`Error while reading CSS rules from ${o.href}`,i)}}),n))}function ue(t){return t.filter(e=>e.type===CSSRule.FONT_FACE_RULE).filter(e=>H(e.style.getPropertyValue("src")))}async function fe(t,e){if(t.ownerDocument==null)throw new Error("Provided element is not within a Document");let n=f(t.ownerDocument.styleSheets),r=await le(n,e);return ue(r)}async function X(t,e){let n=await fe(t,e);return(await Promise.all(n.map(o=>{let i=o.parentStyleSheet?o.parentStyleSheet.href:null;return I(o.cssText,i,e)}))).join(`\n`)}async function mt(t,e){let n=e.fontEmbedCSS!=null?e.fontEmbedCSS:e.skipFonts?null:await X(t,e);if(n){let r=document.createElement("style"),o=document.createTextNode(n);r.appendChild(o),t.firstChild?t.insertBefore(r,t.firstChild):t.appendChild(r)}}var at,ht=h(()=>{y();S();O();at={}});var gt={};At(gt,{getFontEmbedCSS:()=>pe,toBlob:()=>ge,toCanvas:()=>R,toJpeg:()=>de,toPixelData:()=>me,toPng:()=>he,toSvg:()=>dt});async function dt(t,e={}){let{width:n,height:r}=L(t,e),o=await A(t,e,!0);return await mt(o,e),await W(o,e),ct(o,e),await J(o,n,r)}async function R(t,e={}){let{width:n,height:r}=L(t,e),o=await dt(t,e),i=await w(o),c=document.createElement("canvas"),s=c.getContext("2d"),a=e.pixelRatio||z(),d=e.canvasWidth||n,m=e.canvasHeight||r;return c.width=d*a,c.height=m*a,e.skipAutoScale||Q(c),c.style.width=`${d}`,c.style.height=`${m}`,e.backgroundColor&&(s.fillStyle=e.backgroundColor,s.fillRect(0,0,c.width,c.height)),s.drawImage(i,0,0,c.width,c.height),c}async function me(t,e={}){let{width:n,height:r}=L(t,e);return(await R(t,e)).getContext("2d").getImageData(0,0,n,r).data}async function he(t,e={}){return(await R(t,e)).toDataURL()}async function de(t,e={}){return(await R(t,e)).toDataURL("image/jpeg",e.quality||1)}async function ge(t,e={}){let n=await R(t,e);return await K(n)}async function pe(t,e={}){return X(t,e)}var pt=h(()=>{rt();it();st();ht();y()});var Rt=["data-testid","data-test","data-qa","data-cy"];function P(t){return Number.isNaN(t)?.5:Math.max(0,Math.min(1,t))}function Pt(t){return typeof CSS<"u"&&CSS.escape?CSS.escape(t):t.replace(/[^a-zA-Z0-9_-]/g,e=>`\\\\${e}`)}function Tt(t,e){let n=e.getAttribute("id");if(n){let o=`#${Pt(n)}`;try{if(t.querySelectorAll(o).length===1)return{el:e,selector:o,confidence:1}}catch{}}for(let o of Rt){let i=e.getAttribute(o);if(i){let c=`[${o}="${i.replace(/"/g,\'\\\\"\')}"]`;try{if(t.querySelectorAll(c).length===1)return{el:e,selector:c,confidence:1}}catch{}}}let r=e.getAttribute("role");if(r){let o=`[role="${r.replace(/"/g,\'\\\\"\')}"]`;try{if(t.querySelectorAll(o).length===1)return{el:e,selector:o,confidence:.85}}catch{}}return null}function q(t,e,n){let r=e,o=0;for(;r;){let i=Tt(t,r);if(i)return i;if(n!==null&&o>=n)return null;r=r.parentElement,o++}return null}function Ct(t){let e=t.tagName.toLowerCase(),n=t.parentElement;if(!n)return e;let r=1;for(let o of Array.from(n.children)){if(o===t)break;r++}return`${e}:nth-child(${r})`}function vt(t,e){if(t===e)return null;let n=[],r=e;for(;r&&r!==t;)n.unshift(Ct(r)),r=r.parentElement;return r!==t?null:n.join(" > ")}function Lt(t){let e=(t.textContent??"").replace(/\\s+/g," ").trim();if(e)return e.slice(0,32)}function Y(t,e,n){let r=n.elementFromPoint(t,e)??n.body,o,i,c,s=q(n,r,8);if(s)o=s.el,i=s.selector,c=s.confidence;else{let _=q(n,r,null)??{el:n.body,selector:"body",confidence:0},V=vt(_.el,r);o=r,i=V?`${_.selector} > ${V}`:_.selector,c=.6}let a=o.getBoundingClientRect(),d=a.width>0?P((t-a.left)/a.width):.5,m=a.height>0?P((e-a.top)/a.height):.5,p=n.documentElement,D=n.defaultView?.scrollX??0,bt=n.defaultView?.scrollY??0,xt=p.scrollWidth>0?P((t+D)/p.scrollWidth):.5,Et=p.scrollHeight>0?P((e+bt)/p.scrollHeight):.5;return{strategy:"dom",selector:i,offsetXPct:d,offsetYPct:m,textQuote:Lt(o),fallbackXPct:xt,fallbackYPct:Et,confidence:c}}function T(t,e,n){let r=t.getBoundingClientRect();return{x:r.left+(e??.5)*r.width,y:r.top+(n??.5)*r.height}}function $t(t){let e=t.split(" > ");return e.length<=1?null:e.slice(0,-1).join(" > ")}var It=4;function kt(t,e){let n=t.createTreeWalker(t.body,It),r=[],o=n.nextNode();for(;o;)(o.textContent??"").replace(/\\s+/g," ").includes(e)&&o.parentElement&&r.push(o.parentElement),o=n.nextNode();return r.length===1?r[0]:null}function C(t,e){if(t.strategy!=="dom")return null;if(t.selector)try{let n=e.querySelectorAll(t.selector);if(n.length===1)return{...T(n[0],t.offsetXPct,t.offsetYPct),confidence:t.confidence};if(n.length>1)return{...T(n[0],t.offsetXPct,t.offsetYPct),confidence:Math.min(t.confidence,.7)}}catch{}if(t.textQuote){let n=kt(e,t.textQuote);if(n)return{...T(n,t.offsetXPct,t.offsetYPct),confidence:.5}}if(t.selector){let n=$t(t.selector);if(n)try{let r=e.querySelectorAll(n);if(r.length===1)return{...T(r[0],t.offsetXPct,t.offsetYPct),confidence:.65}}catch{}}if(typeof t.fallbackXPct=="number"&&typeof t.fallbackYPct=="number"){let n=e.documentElement,r=e.defaultView?.scrollX??0,o=e.defaultView?.scrollY??0;return{x:t.fallbackXPct*n.scrollWidth-r,y:t.fallbackYPct*n.scrollHeight-o,confidence:0}}return null}function wt(){return window.__EASYMARKER_PARENT_ORIGIN__??null}function g(t){let e=wt();e&&window.parent.postMessage(t,e)}window.addEventListener("click",t=>{if(t.button!==0)return;t.preventDefault(),t.stopPropagation();let e=Y(t.clientX,t.clientY,document);g({type:"easymarker:pin-candidate",anchor:e,viewportX:t.clientX,viewportY:t.clientY})},!0);window.addEventListener("resize",()=>{g({type:"easymarker:viewport-changed"})});var B=!1;window.addEventListener("scroll",()=>{B||(B=!0,requestAnimationFrame(()=>{B=!1,g({type:"easymarker:viewport-changed"})}))},{passive:!0});function yt(t,e=!1){let n=C(t,document);if(!n)return;let r=80;n.x>=0&&n.x<=window.innerWidth&&n.y>=r&&n.y<=window.innerHeight-r&&!e||window.scrollTo({left:window.scrollX+n.x-window.innerWidth/2,top:window.scrollY+n.y-window.innerHeight/2,behavior:"instant"})}var ye="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";async function we(){let{toBlob:t}=await Promise.resolve().then(()=>(pt(),gt)),e=document.documentElement.clientWidth||window.innerWidth,n=window.innerHeight,r=getComputedStyle(document.body).backgroundColor,o=getComputedStyle(document.documentElement).backgroundColor,i=s=>!s||s==="transparent"||s==="rgba(0, 0, 0, 0)",c=i(r)?i(o)?"#ffffff":o:r;return t(document.documentElement,{width:e,height:n,pixelRatio:Math.min(2,window.devicePixelRatio||1),backgroundColor:c,cacheBust:!1,imagePlaceholder:ye,style:{transform:`translate(${-window.scrollX}px, ${-window.scrollY}px)`,transformOrigin:"0 0"},filter:s=>!(s instanceof HTMLScriptElement)})}window.addEventListener("message",async t=>{let e=wt();if(!e||t.origin!==e)return;let n=t.data;if(n?.type==="easymarker:resolve-anchors"&&Array.isArray(n.anchors)){let r=n.anchors.map(({id:o,anchor:i})=>({id:o,position:C(i,document)}));g({type:"easymarker:anchor-positions",positions:r});return}if(n?.type==="easymarker:scroll-to-anchor"&&n.anchor){yt(n.anchor),g({type:"easymarker:viewport-changed"});return}if(n?.type==="easymarker:capture"&&n.anchor&&n.requestId){let r=n.requestId,o=window.scrollX,i=window.scrollY;try{yt(n.anchor,!0);let c=C(n.anchor,document),s=await we();g({type:"easymarker:capture-result",requestId:r,blob:s,pinX:c?.x??null,pinY:c?.y??null,width:document.documentElement.clientWidth||window.innerWidth,height:window.innerHeight})}catch{g({type:"easymarker:capture-result",requestId:r,blob:null})}window.scrollTo({left:o,top:i,behavior:"instant"}),g({type:"easymarker:viewport-changed"})}});g({type:"easymarker:ready"});})();\n');
  }
  if (!cachedBundle) {
    cachedBundle = (async () => {
      const { build } = await import("esbuild");
      const { fileURLToPath } = await import("url");
      const path = await import("path");
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const entryPoint = path.resolve(__dirname, "..", "..", "..", "packages", "anchoring", "src", "browser-entry.ts");
      const result = await build({
        entryPoints: [entryPoint],
        bundle: true,
        format: "iife",
        target: "es2020",
        write: false,
        minify: true,
        logLevel: "silent"
      });
      const output = result.outputFiles[0];
      if (!output) throw new Error("esbuild produced no output for the anchoring bundle");
      return output.text;
    })();
  }
  return cachedBundle;
}

// src/render.ts
var MAX_REDIRECTS = 3;
var FETCH_TIMEOUT_MS = 1e4;
var BROWSER_HEADERS = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/avif,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9"
};
var ProxyFetchError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
};
async function safeFetch(target, init) {
  let current = target;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (current.protocol !== "https:") {
      throw new ProxyFetchError("BAD_URL", "Only https:// URLs are supported.");
    }
    if (await isPrivateHostname(current.hostname)) {
      throw new ProxyFetchError("SSRF_BLOCKED", "Requests to private IP ranges are not allowed.");
    }
    const response = await fetch(current, { ...init, redirect: "manual" });
    const isRedirect = response.status >= 300 && response.status < 400;
    if (!isRedirect) return response;
    const location = response.headers.get("location");
    if (!location) return response;
    current = new URL(location, current);
    if (hop === MAX_REDIRECTS) {
      throw new ProxyFetchError("TOO_MANY_REDIRECTS", "That URL redirects too many times.");
    }
  }
  throw new ProxyFetchError("TOO_MANY_REDIRECTS", "That URL redirects too many times.");
}
async function timedFetch(target, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await safeFetch(target, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof ProxyFetchError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new ProxyFetchError("TIMEOUT", "The target site took too long to respond.");
    }
    throw new ProxyFetchError("FETCH_FAILED", "Could not reach the target site.");
  } finally {
    clearTimeout(timeout);
  }
}
var REWRITABLE_ATTRS = [
  { selector: "img[src]", attr: "src" },
  { selector: "script[src]", attr: "src" },
  { selector: "link[href]", attr: "href" },
  { selector: "source[src]", attr: "src" },
  { selector: "source[srcset]", attr: "srcset" },
  { selector: "img[srcset]", attr: "srcset" }
];
function assetProxyUrl(assetBaseUrl, absoluteUrl) {
  return `${assetBaseUrl}?url=${encodeURIComponent(absoluteUrl)}`;
}
function rewriteSrcset(value, base, assetBaseUrl) {
  return value.split(",").map((part) => {
    const trimmed = part.trim();
    const [url, descriptor] = trimmed.split(/\s+/, 2);
    if (!url) return trimmed;
    try {
      const absolute = new URL(url, base).toString();
      const rewritten = assetProxyUrl(assetBaseUrl, absolute);
      return descriptor ? `${rewritten} ${descriptor}` : rewritten;
    } catch {
      return trimmed;
    }
  }).join(", ");
}
function rewriteHtml(html, pageUrl, assetBaseUrl, anchoring) {
  const $ = cheerio.load(html, { scriptingEnabled: false });
  for (const { selector, attr } of REWRITABLE_ATTRS) {
    $(selector).each((_i, el) => {
      const value = $(el).attr(attr);
      if (!value) return;
      if (attr === "srcset") {
        $(el).attr(attr, rewriteSrcset(value, pageUrl, assetBaseUrl));
        return;
      }
      if (value.startsWith("data:") || value.startsWith("blob:")) return;
      try {
        const absolute = new URL(value, pageUrl).toString();
        $(el).attr(attr, assetProxyUrl(assetBaseUrl, absolute));
      } catch {
      }
    });
  }
  $("style").each((_i, el) => {
    const css = $(el).html();
    if (css) $(el).html(rewriteCss(css, pageUrl, assetBaseUrl));
  });
  $("[style]").each((_i, el) => {
    const style = $(el).attr("style");
    if (style) $(el).attr("style", rewriteCss(style, pageUrl, assetBaseUrl));
  });
  $("meta[http-equiv='Content-Security-Policy']").remove();
  $("base").remove();
  $("head").prepend(`<base href="${pageUrl.href}">`);
  if (anchoring) {
    const escapeForInlineScript = (s) => s.replace(/<\/script/gi, "<\\/script");
    const originScript = `window.__EASYMARKER_PARENT_ORIGIN__=${JSON.stringify(anchoring.parentOrigin)};`;
    $("body").append(`<script>${escapeForInlineScript(originScript)}</script>`);
    $("body").append(`<script>${escapeForInlineScript(anchoring.bundle)}</script>`);
  }
  return $.html();
}
var CSS_URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
function rewriteCss(css, baseUrl, assetBaseUrl) {
  return css.replace(CSS_URL_RE, (full, quote, rawUrl) => {
    const trimmed = rawUrl.trim();
    if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return full;
    try {
      const absolute = new URL(trimmed, baseUrl).toString();
      return `url(${quote}${assetProxyUrl(assetBaseUrl, absolute)}${quote})`;
    } catch {
      return full;
    }
  });
}
async function renderUrl(targetUrl, assetBaseUrl, parentOrigin) {
  const pageUrl = new URL(targetUrl);
  const response = await timedFetch(pageUrl, { headers: BROWSER_HEADERS });
  if (!response.ok) {
    throw new ProxyFetchError("FETCH_FAILED", `Target responded with status ${response.status}.`);
  }
  const contentType = response.headers.get("content-type") ?? "text/html";
  const finalUrl = new URL(response.url || targetUrl);
  if (contentType.includes("text/html")) {
    const html = await response.text();
    const anchoring = parentOrigin ? { bundle: await getAnchoringBundle(), parentOrigin } : void 0;
    return {
      html: rewriteHtml(html, finalUrl, assetBaseUrl, anchoring),
      contentType: "text/html; charset=utf-8"
    };
  }
  const text = await response.text();
  return { html: text, contentType };
}

// src/index.ts
var app = express();
app.set("trust proxy", true);
var PORT = process.env["PROXY_PORT"] ?? 4e3;
var WEB_APP_ORIGIN = process.env["WEB_APP_ORIGIN"] ?? "http://localhost:3000";
var FORBIDDEN_RESPONSE_HEADERS = /* @__PURE__ */ new Set([
  "set-cookie",
  "authorization",
  "strict-transport-security",
  "x-frame-options",
  "content-security-policy",
  "content-encoding",
  "content-length",
  "transfer-encoding"
]);
function proxyErrorResponse(res, err) {
  if (err instanceof ProxyFetchError) {
    const status = err.code === "SSRF_BLOCKED" ? 403 : err.code === "TIMEOUT" ? 504 : 502;
    res.status(status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  res.status(502).json({
    error: { code: "FETCH_FAILED", message: "Could not reach the target site." }
  });
}
function renderErrorPage(message, targetUrl) {
  const linkHtml = targetUrl ? `<a href="${targetUrl.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer">Open the site directly instead \u2192</a>` : "";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#0a0e17; color:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; padding:24px; box-sizing:border-box; }
  .box { max-width:420px; text-align:center; }
  h1 { font-size:16px; font-weight:600; margin:0 0 8px; }
  p { font-size:14px; line-height:1.6; color:#97a3b8; margin:0 0 16px; }
  a { color:#6d5ef8; font-size:13px; font-weight:600; text-decoration:none; }
  a:hover { text-decoration:underline; }
</style></head>
<body><div class="box">
  <h1>This page couldn't be loaded for review</h1>
  <p>${message}</p>
  ${linkHtml}
</div></body></html>`;
}
function sendRenderError(res, status, message, targetUrl) {
  res.status(status).set("content-type", "text/html; charset=utf-8").send(renderErrorPage(message, targetUrl));
}
var renderLimiter = rateLimit({
  windowMs: 6e4,
  max: 100,
  keyGenerator: (req) => String(req.query["token"] ?? req.ip),
  standardHeaders: true,
  legacyHeaders: false
});
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.get("/render", renderLimiter, async (req, res) => {
  const target = req.query["url"];
  const token = req.query["token"];
  if (typeof target !== "string" || !target.startsWith("https://")) {
    sendRenderError(res, 400, "The link for this review project looks malformed.");
    return;
  }
  if (typeof token !== "string" || token.length < 12) {
    sendRenderError(res, 400, "This review link is missing or invalid.");
    return;
  }
  let hostname;
  try {
    hostname = new URL(target).hostname;
  } catch {
    sendRenderError(res, 400, "The target URL for this review project couldn't be parsed.");
    return;
  }
  if (await isPrivateHostname(hostname)) {
    sendRenderError(res, 403, "This URL points to a private network address, which isn't allowed.");
    return;
  }
  const assetBaseUrl = `${req.protocol}://${req.get("host")}/asset`;
  try {
    const { html, contentType } = await renderUrl(target, assetBaseUrl, WEB_APP_ORIGIN);
    res.status(200).set("content-type", contentType).send(html);
  } catch (err) {
    if (err instanceof ProxyFetchError && err.code === "TIMEOUT") {
      sendRenderError(res, 504, "The site took too long to respond.", target);
      return;
    }
    sendRenderError(
      res,
      502,
      "This site couldn't be loaded, likely because it blocks automated visitors like this one.",
      target
    );
  }
});
app.get("/asset", async (req, res) => {
  const target = req.query["url"];
  if (typeof target !== "string" || !target.startsWith("https://")) {
    res.status(400).json({
      error: { code: "INVALID_URL", message: "A valid https:// URL is required." }
    });
    return;
  }
  let assetUrl;
  try {
    assetUrl = new URL(target);
  } catch {
    res.status(400).json({
      error: { code: "INVALID_URL", message: "Could not parse the asset URL." }
    });
    return;
  }
  if (await isPrivateHostname(assetUrl.hostname)) {
    res.status(403).json({
      error: { code: "SSRF_BLOCKED", message: "Requests to private IP ranges are not allowed." }
    });
    return;
  }
  try {
    const response = await timedFetch(assetUrl, { headers: BROWSER_HEADERS });
    if (!response.ok || !response.body) {
      res.status(502).json({
        error: { code: "FETCH_FAILED", message: `Asset responded with status ${response.status}.` }
      });
      return;
    }
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    res.status(200).set("content-type", contentType);
    response.headers.forEach((value, key) => {
      if (!FORBIDDEN_RESPONSE_HEADERS.has(key.toLowerCase()) && key.toLowerCase() !== "content-type") {
        res.set(key, value);
      }
    });
    if (contentType.includes("text/css")) {
      const assetBaseUrl = `${req.protocol}://${req.get("host")}/asset`;
      const css = await response.text();
      res.send(rewriteCss(css, assetUrl, assetBaseUrl));
      return;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    proxyErrorResponse(res, err);
  }
});
if (!process.env["VERCEL"]) {
  app.listen(PORT, () => {
    console.log("Proxy running on port " + PORT);
  });
}
var index_default = app;
export {
  index_default as default
};
