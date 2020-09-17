/* Globals in setup

*/
var ctx;
var canvas;
var framerate;
var imageData;
var imageBuffer;
var time = 0;
var frequency;
var text;


/*
    Wave Equation Data
*/
var dx = 0.1
var dy = dx;

var T = 20;
var t = 0;
var CFL = 0.5;
var c = 1;
var dt = CFL * dx / c;

var wbp1;
var wbm1;
var wb;

var value = 10;

class vec2 {
    constructor(x, y) {
        this.X = x;
        this.Y = y;
    }
}




// main
window.onload = () => {
    sourceList = [];
    document.addEventListener("click", getMousePos);

    framerate = 60;
    text = document.getElementById('source');
    canvas = document.getElementById('Canvas');
    ctx = canvas.getContext('2d');
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    imageBuffer = imageData.data;

    // Wave equation init
    wb = [];
    wbp1 = [];
    wbm1 = []
    for (i = 0; i < canvas.height; i++) {
        wb.push([]);
        wbp1.push([]);
        wbm1.push([]);
        for (j = 0; j < canvas.width; j++) {
            wb[i].push(0);
            wbp1[i].push(0);
            wbm1[i].push(0);
        }
    }



    setInterval(() => {
        updateWaveEquation();
        updateImageBuffer()
    }, 1000 / framerate);
};

function getMousePos(evt) {
    var rect = canvas.getBoundingClientRect();
    let x = evt.clientX - rect.left;
    let y = evt.clientY - rect.top;
    console.log(`X:${x}, Y:${y}`);
    if (x < 0 || x > canvas.width) return;
    if (y < 0 || y > canvas.height) return;
    sourceList.push(new vec2(x, y));
}


function updateWaveEquation() {


    for (i = 0; i < wbp1.length; i++) {
        for (j = 0; j < wbp1[i].length; j++) {
            if (j == 0 || j == wbp1[i].length - 1) {
                wbp1[i][j] = 0;
            }
            if (i == 0 || i == wbp1.length - 1) {
                wbp1[i][j] = 0
            }
        }
    }

    t += dt;

    // save previous iteration
    deepCopy(wb, wbm1);
    deepCopy(wbp1, wb);

    let source = dt * dt * 10000 * Math.cos(value * Math.PI * t / T);
    text.innerHTML = source;


    //wb[20][canvas.width - 20] = source;
    //wb[canvas.height - 20][20] = source;
    //wb[canvas.height / 2][canvas.width / 2] = source;
    sourceList.forEach(element => {
        wb[element.Y][element.X] = source;
    });

    for (i = 1; i < wbp1.length - 1; i++) {
        for (j = 1; j < wbp1[i].length - 1; j++) {
            wbp1[i][j] = 2 * wb[i][j] - wbm1[i][j] + (CFL * CFL) * (wb[i + 1][j] + wb[i][j + 1] - 4 * wb[i][j] + wb[i - 1][j] + wb[i][j - 1]);
            //console.log(wbp1[i][j]);
        }
    }


    if (t > T) {
        t = 0;
    }
}

function updateImageBuffer() {
    let index = 0;

    for (i = 0; i < canvas.height; i++) {
        for (j = 0; j < canvas.width; j++) {
            index = (i * canvas.width + j) * 4;
            // setting individual rgba values
            let value = map(wb[i][j], -1.0, 1.0, 0, 255);
            //imageBuffer[index] = value & 0xa1; // R
            //imageBuffer[++index] = value & 0xd1; // G
            //imageBuffer[++index] = value & 0xff; // B

            imageBuffer[index] = map(wb[i][j], -1.0, 1.0, 0, 0xa1);
            imageBuffer[++index] = map(wb[i][j], -1.0, 1.0, 0, 0xd1);
            imageBuffer[++index] = map(wb[i][j], -1.0, 1.0, 0, 0xff);

            imageBuffer[++index] = 255; // Alpha
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function map(x, in_min, in_max, out_min, out_max) {
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

function deepCopy(src, dest) {
    for (i = 0; i < src.length; i++) {
        for (j = 0; j < src[i].length; j++) {
            dest[i][j] = src[i][j];
        }
    }
}

function changeSourceFrequency() {
    value = document.getElementById("source_freq").value;
    if (value == 0)
        value = 10;
}