'use strict';

let gl;
let canvas;
let surface;
let shProgram;
let spaceball;

let uSegments = 36;
let vSegments = 24;

function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;

    this.iAttribVertex = -1;
    this.iAttribNormal = -1;

    this.iModelViewProjectionMatrix = -1;
    this.iModelViewMatrix = -1;
    this.iLightPosition = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    };
}

function rebuildSurface(u, v) {
    uSegments = u;
    vSegments = v;

    const data = {};
    CreateSurfaceData(data, uSegments, vSegments);

    surface.BufferData(data.verticesF32, data.normalsF32, data.indicesU16);
}

function draw(time = performance.now()) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.03, 0.03, 0.05, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const aspect = canvas.width / canvas.height;
    const projection = m4.perspective(Math.PI / 4, aspect, 0.1, 100);

    const trackball = spaceball.getViewMatrix();
    const rotation = m4.axisRotation([0.707, 0.707, 0], 0.7);
    const translation = m4.translation(0, 0, -7.5);

    let modelView = m4.multiply(rotation, trackball);
    modelView = m4.multiply(translation, modelView);

    const mvp = m4.multiply(projection, modelView);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, mvp);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, modelView);

    const t = time * 0.001;
    const r = 4.5;

    const lightWorld = [
        r * Math.cos(t),
        r * Math.sin(t),
        2.5
    ];

    // Light position is passed in view coordinates
    const lightEye = m4.transformPoint(modelView, lightWorld);
    gl.uniform3fv(shProgram.iLightPosition, lightEye);

    surface.Draw();
}

function animate(time) {
    draw(time);
    requestAnimationFrame(animate);
}

function initGL() {
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram("Gouraud", program);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(program, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(program, "normal");

    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(program, "ModelViewProjectionMatrix");
    shProgram.iModelViewMatrix = gl.getUniformLocation(program, "ModelViewMatrix");
    shProgram.iLightPosition = gl.getUniformLocation(program, "lightPosition");

    const data = {};
    CreateSurfaceData(data, uSegments, vSegments);

    surface = new Model("Variant 16");
    surface.BufferData(data.verticesF32, data.normalsF32, data.indicesU16);

    gl.enable(gl.DEPTH_TEST);
}

function createProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexSource);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        throw new Error(
            "Vertex shader error: " + gl.getShaderInfoLog(vertexShader)
        );
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        throw new Error(
            "Fragment shader error: " + gl.getShaderInfoLog(fragmentShader)
        );
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(
            "Shader program error: " + gl.getProgramInfoLog(program)
        );
    }

    return program;
}

function init() {
    canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");

    if (!gl) {
        document.getElementById("canvas-holder").innerHTML = "<p>WebGL is not supported.</p>";
        return;
    }

    try {
        initGL();
    } catch (e) {
        console.error(e);

        document.getElementById("canvas-holder").innerHTML = "<p>WebGL initialization error.</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);
    requestAnimationFrame(animate);
}