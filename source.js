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
var expression = '20*sin(2 * t)';
var color_rgb;
var color_hsv;


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

var damp_constant = 0.995;

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

class Node {
    constructor(value, left, right) {
        this.value = value;
        this.left = left;
        this.right = right;
    }
}

class Rgb {
    constructor(r, g, b) {
        this.r = r;
        this.g = g;
        this.b = b;
    }
}

class Hsv {
    constructor(h, s, v) {
        this.h = h;
        this.s = s;
        this.v = v;
    }
}


class ExpValue {
    constructor(originalString) {
        this.originalString = originalString;
        this.hasVariables = false;
    }
    evaluate() {
        console.log('base class eval.. Why are you calling this???');
    }
}

class ExpConstant extends ExpValue {
    constructor(originalString) {
        super();
        this.originalString = originalString;
        this.value = parseFloat(originalString);
        this.hasVariables = false;
    }
    evaluate() {
        return this.value;
    }
}

class ExpFunction extends ExpValue {
    constructor(functionName, functionExpression, call, variables) {
        super();
        this.functionName = functionName;
        this.functionExpression = functionExpression;
        this.call = call;
        this.sub_expression = new Expression(functionExpression, variables);
        this.hasVariables = true;
    }

    mutateVariables(name, newValue) {
        this.sub_expression.mutateVariables(name, newValue);
    }

    evaluate() {
        return this.call(this.sub_expression.evaluate());
    }
}

class ExpVariable extends ExpValue {
    constructor(originalString, variables) {
        super();
        this.originalString = originalString;
        this.variables = variables;
        this.hasVariables = true;
    }

    mutateVariables(name, newValue) {
        this.variables[name] = newValue;
    }

    evaluate() {
        return this.variables[this.originalString];
    }
}

class ExpOperator extends ExpValue {
    constructor(originalString, call) {
        super();
        this.originalString = originalString;
        this.call = call;
        this.hasVariables = false;
    }
    evaluate(a, b) {
        return this.call(a, b);
    }
}



class Expression {
    constructor(expression, variables) {
        this.expression = expression;
        this.variables = variables;
        this.operators = {
            '+': (a, b) => { return a + b },
            '-': (a, b) => { return a - b },
            '*': (a, b) => { return a * b },
            '/': (a, b) => { return a / b },
            '^': (a, b) => { return Math.pow(a, b) },
            '%': (a, b) => { return a % b },
            '&': (a, b) => { return a & b },
            '|': (a, b) => { return a | b }
        };
        this.functions = {
            'cos': (a) => { return Math.cos(a) },
            'sin': (a) => { return Math.sin(a) },
            'exp': (a) => { return Math.exp(a) },
            'tan': (a) => { return Math.tan(a) }
        }
        this.tokens = this.tokenize();
        this.postfix = this.shuntingYardAlgorithm();
        console.log(`infix: ${this.expression}, postfix: ${this.postfix}`);
    }

    // Separate out each token
    tokenize() {
        let tokens = [];
        for (let i = 0; i < this.expression.length; i++) {
            if ((this.expression[i] <= '9' && this.expression[i] >= '0')) {
                // if we find the start of a number
                let number = this.expression[i];
                i++;
                while (this.expression[i] <= '9' && this.expression[i] >= '0') {
                    number += this.expression[i]; // collect digits of full number
                    i++;
                }
                i--; // for loop already increments at the end of this
                tokens.push(number);
            } else if (i + 1 < this.expression.length && this.isAlpha(this.expression[i]) && (this.isAlpha(this.expression[i + 1]) || this.expression[i + 1] == '(')) {
                let cnt = 0;
                let func_name = '_'; // precede all functions with this as an identifier for our algorithm later
                while (this.expression[i] != '(' && cnt <= 25) {
                    func_name += this.expression[i]; // Collect all digits of function names - inb4 I need a 25 character long function name
                    i++;
                }
                if (cnt > 25) {
                    // exception, function name too large...
                    alert("I do not currently know any function this long...\nWhat are you even doing?");
                    return null;
                }
                tokens.push(func_name);
                let stack = ['('];
                i++;
                let sub_expression = '(';
                while (stack.length != 0 && i < this.expression.length) {
                    // get expression inside function so that we can create another expression
                    sub_expression += this.expression[i];
                    if (this.expression[i] == '(')
                        stack.push('(');
                    else if (this.expression[i] == ')')
                        stack.pop();
                    i++;
                }
                i--;
                if (stack.length != 0) {
                    // exception illegal expression
                    return null;
                }
                tokens.push(sub_expression);
            } else if (this.isAlpha(this.expression[i])) {
                tokens.push(this.expression[i]);
            } else if (this.expression[i] in this.operators) {
                tokens.push(this.expression[i]);
            } else if (this.expression[i] == ')' || this.expression[i] == '(') {
                tokens.push(this.expression[i]);
            } else if (this.expression[i] != ' ' && this.expression[i] != '\r' && this.expression[i] != '\n') {
                // invalid character
                alert(`Error Illegal Value: ${this.expression[i]}`);
                return null;
            }
        }
        return tokens;
    }

    // Wow this was not worth it, but it works great!
    shuntingYardAlgorithm() {
        let output = [];
        let stack = [];
        for (let i = 0; i < this.tokens.length; i++) {
            if (this.tokens[i] in this.operators) {
                // we have an operator
                // we also have a massive fucking condition; seriously, I need to use shorter names for things
                let isLeftAssociativeAndPrecedenceLessEq = (this.tokens[i] != '^' && this.getOperatorPrecedence(this.tokens[i]) <= this.getOperatorPrecedence(stack[stack.length - 1]));
                let isRightAssociativeAndPrecedenceLess = (this.tokens[i] == '^' && this.getOperatorPrecedence(this.tokens[i]) < this.getOperatorPrecedence(stack[stack.length - 1]));

                while (stack.length != 0 && (isLeftAssociativeAndPrecedenceLessEq || isRightAssociativeAndPrecedenceLess)) { // move all operators with higher precedence than x to the output
                    let op_y = stack.pop();
                    output.push(new ExpOperator(op_y, this.operators[op_y]));
                    isLeftAssociativeAndPrecedenceLessEq = (this.tokens[i] != '^' && this.getOperatorPrecedence(this.tokens[i]) <= this.getOperatorPrecedence(stack[stack.length - 1]));
                    isRightAssociativeAndPrecedenceLess = this.tokens[i] == '^' && this.getOperatorPrecedence(this.tokens[i]) < this.getOperatorPrecedence(stack[stack.length - 1]);
                }
                stack.push(this.tokens[i]); // push operator x onto stack
            } else if (this.tokens[i] == '(') {
                stack.push(this.tokens[i]); // push parenthesis onto stack
            } else if (this.tokens[i] == ')') {
                while (stack.length != 0 && stack[stack.length - 1] != '(') {
                    let op_y = stack.pop(); // until we reach the left parenthesis, move all elements from stack to output
                    output.push(new ExpOperator(op_y, this.operators[op_y]));
                }
                stack.pop(); // pop the left parenthesis but don't add it to the buffer
            } else {
                // Handle constants, variables, and functions here
                if (this.tokens[i][0] == '_') {
                    // type is a function
                    let name = this.tokens[i].replace('_', '');
                    if (!(name in this.functions)) {
                        alert(`${name} is not a defined function`);
                    }
                    output.push(new ExpFunction(name, this.tokens[i + 1], this.functions[name], this.variables));
                } else if (this.tokens[i][0] <= '9' && this.tokens[i][0] >= '0') {
                    // type is constant
                    output.push(new ExpConstant(this.tokens[i]));
                } else if (this.isAlpha(this.tokens[i][0])) {
                    // type is variable
                    output.push(new ExpVariable(this.tokens[i], this.variables));
                }
                //output.push(this.tokens[i]);
            }
        }
        while (stack.length != 0) {
            let op_y = stack.pop();
            output.push(new ExpOperator(op_y, this.operators[op_y])); // pop all remaining operator tokens from stack to output
        }
        return output;

    }

    evaluate() {
        if (this.postfix === null) {
            return 0;
        }
        let stack = [];
        for (let i = 0; i < this.postfix.length; i++) {
            console.log(this.postfix[i]);
            if (this.postfix[i].originalString in this.operators) { // if operator, pop two operands from stack and evaluate
                let a = stack.pop();
                let b = stack.pop();
                stack.push(this.postfix[i].evaluate(b, a));
            } else { // push all operands to stack
                stack.push(this.postfix[i].evaluate());
            }
        }
        return stack.pop();
    }

    mutateVariables(name, newValue) {
        this.variables[name] = newValue;
        // go through each variables holder and mutate it as well
        for (let i = 0; i < this.postfix.length; i++) {
            if (this.postfix.hasVariables) {
                this.mutateVariables(name, newValue);
            }
        }
    }

    isAlpha(c) {
        if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'))
            return true;
        return false;
    }

    getOperatorPrecedence(op) {
        switch (op) {
            case '^': // only this operator has right associativity...
                return 10;
            case '*':
                return 5;
            case '/':
                return 5;
            case '%':
                return 5;
            case '&':
                return 5;
            case '|':
                return 5;
            case '+':
                return 0;
            case '-':
                return 0;
        }
    }

}

class SourceEquation {
    constructor(expression, vec2d) {
        this.vec2d = vec2d;
        // differentials
        this.dx = 0.1;
        this.dy = this.dx;
        this.CFL = 0.5;
        this.c = 1;
        this.dt = CFL * dx / c;
        // time
        this.frequency = 10;

        this.vars = {
            'd': this.dt,
            'v': this.frequency,
            't': 1, // need to alter t depending on timer
            'p': Math.PI,
            'T': 20
        };
        // ((d * d) * (aC(((v * p) * t)/h)))
        this.equation = new Expression(expression, this.vars);
    }

    callSource(timer) {
        this.equation.mutateVariables('t', timer);
        return this.equation.evaluate();
    }
}




// main
window.onload = () => {
    sourceList = [];
    document.addEventListener("click", getMousePos);

    // colors
    color_hsv = new Hsv(20, 0, 0);
    color_rgb = new Rgb(0, 0, 0);


    framerate = 60;
    text = document.getElementById('source');
    canvas = document.getElementById('Canvas');
    ctx = canvas.getContext('2d');
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    imageBuffer = imageData.data;
    let source = .1 * .1 * 10000 * Math.cos(10 * Math.PI * 2 / 20);
    expression = '20*sin(2 * t)';
    vars = {
        'd': .1,
        'v': 10,
        't': 1, // need to alter t depending on timer
        'p': Math.PI,
        'T': 20
    };
    let a = new Expression(expression, vars);
    a.mutateVariables('t', 2);
    console.log(`alg: ${a.evaluate()} against real: ${source}`);

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

    text.innerHTML = `Dampening Constant: ${damp_constant} <br> Expression Used: ${expression}`;

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
    sourceList.push(new SourceEquation(expression, new vec2(x, y)));
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




    //wb[20][canvas.width - 20] = source;
    //wb[canvas.height - 20][20] = source;
    //wb[canvas.height / 2][canvas.width / 2] = source;
    sourceList.forEach(element => {
        wb[element.vec2d.Y][element.vec2d.X] = element.callSource(t);
    });

    for (i = 1; i < wbp1.length - 1; i++) {
        for (j = 1; j < wbp1[i].length - 1; j++) {
            wbp1[i][j] = 2 * wb[i][j] - wbm1[i][j] + (CFL * CFL) * (wb[i + 1][j] + wb[i][j + 1] - 4 * wb[i][j] + wb[i - 1][j] + wb[i][j - 1]);
            wbp1[i][j] *= damp_constant;
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

            //imageBuffer[index] = map(wb[i][j], -1.0, 1.0, 0, 0xa1);
            //imageBuffer[++index] = map(wb[i][j], -1.0, 1.0, 0, 0xd1);
            //imageBuffer[++index] = map(wb[i][j], -1.0, 1.0, 0, 0xff);

            let hue = map(wb[i][j], -5.0, 5.0, 0, 360) / 360.0;
            color_hsv.h = hue
            color_hsv.s = 0.6;
            color_hsv.v = 0.7;
            HSVtoRGB();
            imageBuffer[index] = color_rgb.r;
            imageBuffer[++index] = color_rgb.g;
            imageBuffer[++index] = color_rgb.b;

            imageBuffer[++index] = 255; // Alpha
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function map(x, in_min, in_max, out_min, out_max) {
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}


// args 0 / 360, 1, 1
function HSVtoRGB() {
    var hsv = color_hsv;
    var r, g, b, i, f, p, q, t;

    i = Math.floor(hsv.h * 6);
    f = hsv.h * 6 - i;
    p = hsv.v * (1 - hsv.s);
    q = hsv.v * (1 - f * hsv.s);
    t = hsv.v * (1 - (1 - f) * hsv.s);
    switch (i % 6) {
        case 0:
            r = hsv.v, g = t, b = p;
            break;
        case 1:
            r = q, g = hsv.v, b = p;
            break;
        case 2:
            r = p, g = hsv.v, b = t;
            break;
        case 3:
            r = p, g = q, b = hsv.v;
            break;
        case 4:
            r = t, g = p, b = hsv.v;
            break;
        case 5:
            r = hsv.v, g = p, b = q;
            break;
    }
    color_rgb.r = Math.round(r * 255);
    color_rgb.g = Math.round(g * 255);
    color_rgb.b = Math.round(b * 255)
}

function deepCopy(src, dest) {
    for (i = 0; i < src.length; i++) {
        for (j = 0; j < src[i].length; j++) {
            dest[i][j] = src[i][j];
        }
    }
}


// change the expression string used for sources
function changeSourceExpression() {
    expression = document.getElementById('expression').value;
    if (expression.length == 0)
        expression = 'cos(v * p * t / T)';
    text.innerHTML = `Dampening Constant: ${damp_constant} <br> Expression Used: ${expression}`;
}

// change the expression string used for sources
function changeDampening() {
    damp_constant = parseFloat(document.getElementById('dampening').value);
    if (damp_constant < 0)
        damp_constant = 1;
    text.innerHTML = `Dampening Constant: ${damp_constant} <br> Expression Used: ${expression}`;
}


// removes all sources, previous states of the canvas are kept
function clearAllSources() {
    while (this.sourceList.length)
        this.sourceList.pop();
}


// clears all sources and resets the canvas
function clearAll() {
    for (i = 0; i < wbp1.length; i++) {
        for (j = 0; j < wbp1[i].length; j++) {
            wb[i][j] = 0;
            wbm1[i][j] = 0;
            wbp1[i][j] = 0;
        }
    }
    clearAllSources();
}
