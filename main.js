'use strict';

let gl;
let canvas;
let surface;
let shProgram;
let spaceball;

let uSegments = 36;
let vSegments = 24;
let normalMappingEnabled = true;

function ShaderProgram(program) {
    this.prog = program;
    this.Use = function() { gl.useProgram(this.prog); };
}

function rebuildSurface(u, v) {
    uSegments = u;
    vSegments = v;

    const data = {};
    CreateSurfaceData(data, uSegments, vSegments);
    surface.BufferData(data.verticesF32, data.normalsF32, data.tangentsF32, data.texcoordsF32, data.indicesU16);
}

function draw(time = performance.now()) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.03, 0.03, 0.05, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const projection = m4.perspective(Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
    const trackball = spaceball.getViewMatrix();
    const rotation = m4.axisRotation([0.707, 0.707, 0], 0.7);
    const translation = m4.translation(0, 0, -7.5);

    let modelView = m4.multiply(rotation, trackball);
    modelView = m4.multiply(translation, modelView);
    const mvp = m4.multiply(projection, modelView);

    gl.uniformMatrix4fv(shProgram.iMVP, false, mvp);
    gl.uniformMatrix4fv(shProgram.iModelView, false, modelView);

    const t = time * 0.001;
    const lightWorld = [4.5 * Math.cos(t), 4.5 * Math.sin(t), 2.5];
    const lightEye = m4.transformPoint(modelView, lightWorld);
    gl.uniform3fv(shProgram.iLight, lightEye);
    gl.uniform1i(shProgram.iUseNormalMap, normalMappingEnabled ? 1 : 0);

    surface.Draw();
}

function animate(time) {
    draw(time);
    requestAnimationFrame(animate);
}

function initGL() {
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    shProgram = new ShaderProgram(program);
    shProgram.Use();

    shProgram.iVertex = gl.getAttribLocation(program, "vertex");
    shProgram.iNormal = gl.getAttribLocation(program, "normal");
    shProgram.iTangent = gl.getAttribLocation(program, "tangent");
    shProgram.iTexCoord = gl.getAttribLocation(program, "texCoord");

    shProgram.iMVP = gl.getUniformLocation(program, "ModelViewProjectionMatrix");
    shProgram.iModelView = gl.getUniformLocation(program, "ModelViewMatrix");
    shProgram.iLight = gl.getUniformLocation(program, "lightPosition");
    shProgram.iUseNormalMap = gl.getUniformLocation(program, "useNormalMap");

    gl.uniform1i(gl.getUniformLocation(program, "diffuseMap"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "specularMap"), 1);
    gl.uniform1i(gl.getUniformLocation(program, "normalMap"), 2);

    const data = {};
    CreateSurfaceData(data, uSegments, vSegments);
    surface = new Model("Variant 16");
    surface.BufferData(data.verticesF32, data.normalsF32, data.tangentsF32, data.texcoordsF32, data.indicesU16);

    surface.diffuseTexture = LoadTexture("./textures/diffuse.png", [70, 140, 190, 255]);
    surface.specularTexture = LoadTexture("./textures/specular.png", [160, 160, 160, 255]);
    surface.normalTexture = LoadTexture("./textures/normal.png", [128, 128, 255, 255]);

    gl.enable(gl.DEPTH_TEST);
}

function createProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexSource);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        throw new Error("Vertex shader: " + gl.getShaderInfoLog(vertexShader));
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        throw new Error("Fragment shader: " + gl.getShaderInfoLog(fragmentShader));
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error("Shader program: " + gl.getProgramInfoLog(program));
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
        spaceball = new TrackballRotator(canvas, draw, 0);
        requestAnimationFrame(animate);
    } catch (e) {
        console.error(e);
        document.getElementById("canvas-holder").innerHTML = "<p>WebGL initialization error: " + e + "</p>";
    }
}
