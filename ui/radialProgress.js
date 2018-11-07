/**
 * This script was copied from: https://fdossena.com/?p=html5cool/radprog/i.frag
 * Written by the user/mod? adolf_intel at fdossena.com.
 */
window.rp_requestAnimationFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    (callback => setTimeout(callback, 1000 / 60));

/**
 *
 * @param {HTMLElement} container
 * @param {Object} cfg
 * @constructor
 */
function RadialProgress(
    container, {
        colorBg = "#404040",
        colorFg = "#007FFF",
        colorText = "#0c0c0c",
        indeterminate = false,
        round = false,
        thick = 20,
        progress = 0,
        noAnimations = 0,
        fixedTextSize = true,
        animationSpeed = 1,
        noPercentage = false,
        spin = false,
        noInitAnimation
    } = {}) {

    container.innerHTML = "";
    let nc = document.createElement("div");
    nc.style.width = "5em";
    nc.style.height = "5em";
    nc.style.position = "relative";
    container.appendChild(nc);
    container = nc;
    this.colorBg = colorBg;
    this.colorFg = colorFg;
    this.colorText = colorText;
    this.indeterminate = indeterminate;
    this.round = round;
    this.thick = thick;
    this.progress = progress;
    this.noAnimations = noAnimations;
    this.fixedTextSize = fixedTextSize;
    this.animationSpeed = animationSpeed > 0 ? animationSpeed : 1;
    this.noPercentage = noPercentage;
    this.spin = spin;
    if (noInitAnimation) this.aniP = this.progress; else this.aniP = 0;
    let c = document.createElement("canvas");
    c.style.position = "absolute";
    c.style.top = "0";
    c.style.left = "0";
    c.style.width = "100%";
    c.style.height = "100%";
    c.className = "rp_canvas";
    container.appendChild(c);
    this.canvas = c;
    let tcc = document.createElement("div");
    tcc.style.position = "absolute";
    tcc.style.display = "table";
    tcc.style.width = "100%";
    tcc.style.height = "100%";
    let tc = document.createElement("div");
    tc.style.display = "table-cell";
    tc.style.verticalAlign = "middle";
    let t = document.createElement("div");
    t.style.color = this.colorText;
    t.style.textAlign = "center";
    t.style.overflow = "visible";
    t.style.whiteSpace = "nowrap";
    t.className = "rp_text";
    tc.appendChild(t);
    tcc.appendChild(tc);
    container.appendChild(tcc);
    this.text = t;
    this.prevW = 0;
    this.prevH = 0;
    this.prevP = 0;
    this.indetA = 0;
    this.indetB = 0.2;
    this.rot = 0;
    this.draw = function (f) {
        if (!f) {
            rp_requestAnimationFrame(this.draw);
        }
        let c = this.canvas;
        let dp = window.devicePixelRatio || 1;
        c.width = c.clientWidth * dp;
        c.height = c.clientHeight * dp;

        if (!f && !this.spin && !this.indeterminate && (Math.abs(this.prevP - this.progress) < 1 && this.prevW === c.width && this.prevH === c.height)) {
            return;
        }
        
        let centerX = c.width / 2;
        let centerY = c.height / 2;
        let bw = (c.clientWidth / 100.0);
        let radius = c.height / 2 - (this.thick * bw * dp) / 2;
        this.text.style.fontSize = (this.fixedTextSize ? (c.clientWidth * this.fixedTextSize) : (c.clientWidth * 0.26 - this.thick)) + "px";

        if (this.noAnimations) {
            this.aniP = this.progress;
        } else {
            let aniF = Math.pow(0.93, this.animationSpeed);
            this.aniP = this.aniP * aniF + this.progress * (1 - aniF);
        }
        c = c.getContext("2d");
        c.beginPath();
        c.strokeStyle = this.colorBg;
        c.lineWidth = this.thick * bw * dp;
        c.arc(centerX, centerY, radius, -Math.PI / 2, 2 * Math.PI);
        c.stroke();
        c.beginPath();
        c.strokeStyle = this.colorFg;
        c.lineWidth = this.thick * bw * dp;
        if (this.round) c.lineCap = "round";
        if (this.indeterminate) {
            this.indetA = (this.indetA + 0.07 * this.animationSpeed) % (2 * Math.PI);
            this.indetB = (this.indetB + 0.14 * this.animationSpeed) % (2 * Math.PI);
            c.arc(centerX, centerY, radius, this.indetA, this.indetB);
            if (!this.noPercentage) {
                this.text.innerHTML = "";
            }
        } else {
            if (this.spin && !this.noAnimations) {
                this.rot = (this.rot + 0.07 * this.animationSpeed) % (2 * Math.PI)
            }
            c.arc(centerX, centerY, radius, this.rot - Math.PI / 2, this.rot + this.aniP * (2 * Math.PI) - Math.PI / 2);

            if (!this.noPercentage) {
                this.text.innerHTML = Math.round(100 * this.aniP) + " %";
            }
        }
        c.stroke();
        this.prevW = c.width;
        this.prevH = c.height;
        this.prevP = this.aniP;
    }.bind(this);
    this.draw();
}

RadialProgress.prototype = {
    constructor: RadialProgress,
    setValue: function (p) {
        this.progress = p < 0 ? 0 : p > 1 ? 1 : p;
    },
    setIndeterminate: function (i) {
        this.indeterminate = i;
    },
    setText: function (t) {
        this.text.innerHTML = t;
    }
};