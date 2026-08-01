import { SLICE_TYPES } from "./config.js";
const SVG = "http://www.w3.org/2000/svg";
const R = 100;
export class WheelRenderer {
    constructor(svgEl) {
        this.svg = svgEl;
        this.rotation = 0;
        this.spinner = null;
    }
    render(wheel) {
        this.wheel = wheel;
        this.svg.textContent = "";
        const g = document.createElementNS(SVG, "g");
        g.setAttribute("class", "wheel-spinner");
        g.style.transform = `rotate(${this.rotation}deg)`;
        this.spinner = g;
        const total = wheel.reduce((a, s) => a + s.size, 0) || 1;
        let angle=-90; //ts basically starts spinning from the top
        wheel.forEach((slice) => {
            const def = SLICE_TYPES[slice.type];
            const sweep = (slice.size / total) * 360;
            const a0 = angle;
            const a1 = angle + sweep;
            slice._a0 = a0;
            slice._a1 = a1;
            const path = document.createElementNS(SVG, "path");
            path.setAttribute("d", arcPath(a0, a1));
            path.setAttribute("fill", def.color);
            path.setAttribute("stroke", "#26190f");
            path.setAttribute("stroke-width", "2");
            g.appendChild(path);

            if (sweep > 13) {
                const mid = ((a0 + a1) / 2) * (Math.PI / 180);
                const label = document.createElementNS(SVG, "text");
                label.setAttribute("x", String(Math.cos(mid) * 62));
                label.setAttribute("y", String(Math.sin(mid) * 62));
                label.setAttribute("text-anchor", "middle");
                label.setAttribute("dominant-baseline", "middle");
                label.setAttribute("transform", `rotate(${(a0 + a1) / 2 + 90}, ${Math.cos(mid) * 62}, ${Math.sin(mid) * 62})`);
                label.setAttribute("font-size", sweep > 26 ? "11" : "9");
                label.setAttribute("font-family", "Bitter, serif");
                label.setAttribute("font-weight", "700");
                label.setAttribute("fill", isDark(def.color) ? "#f3e3bb" : "#26190f");
                label.textContent = shortLabel(def.label);
                g.appendChild(label);
            }
            angle = a1;
        });

        this.svg.appendChild(g);
        const hub = document.createElementNS(SVG, "circle");
        hub.setAttribute("r","16");
        hub.setAttribute("fill","#efdcb2");
        hub.setAttribute("stroke", "#26190f");
        hub.setAttribute("stroke-width","3");
        this.svg.appendChild(hub);
    }
    spinTo(sliceIndex, onDone) {
        const slice = this.wheel[sliceIndex];
        if (!slice) return onDone && onDone();
        const mid = (slice._a0 + slice._a1) / 2;
        const target = -90 - mid;
        const turns = 4 * 360;
        const base = Math.ceil(this.rotation / 360) * 360;
        this.rotation = base + turns + ((target % 360) + 360) % 360;
        if (this.spinner) this.spinner.style.transform = `rotate(${this.rotation}deg)`;
        const done = () => onDone && onDone();
        this.spinner
            ? this.spinner.addEventListener("transitionend", done, { once: true })
            : done();
        setTimeout(done, 2900);
    }
}

function arcPath(a0, a1) {
    const p0 = polar(a0);
    const p1 = polar(a1);
    const large = a1 - a0 > 180 ? 1 : 0;
    if (a1 - a0 >= 359.99) {
        return `M ${R} 0 A ${R} ${R} 0 1 1 ${-R} 0 A ${R} ${R} 0 1 1 ${R} 0 Z`;
    }
    return `M 0 0 L ${p0.x} ${p0.y} A ${R} ${R} 0 ${large} 1 ${p1.x} ${p1.y} Z`;
}
const polar = (deg) => ({ x: Math.cos((deg * Math.PI) / 180) * R, y: Math.sin((deg * Math.PI) / 180) * R });
const isDark = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) < 140;
};
const shortLabel = (l) => (l.length > 9 ? l.slice(0, 8) + "." : l);
