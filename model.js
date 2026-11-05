'use strict';

function Vertex(p, uv) {
    this.p = p;
    this.uv = uv;
    this.normal = [0, 0, 0];
    this.tangent = [0, 0, 0];
}

function Triangle(a, b, c) {
    this.a = a;
    this.b = b;
    this.c = c;
}

function subtract(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

function normalize(v) {
    const len = Math.hypot(v[0], v[1], v[2]);
    return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 0];
}

function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iTangentBuffer = gl.createBuffer();
    this.iTexCoordBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(vertices, normals, tangents, texcoords, indices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, tangents, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texcoords, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        this.count = indices.length;
    };

    this.Draw = function() {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.diffuseTexture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.specularTexture);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.normalTexture);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iNormal);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
        gl.vertexAttribPointer(shProgram.iTangent, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iTangent);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
        gl.vertexAttribPointer(shProgram.iTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iTexCoord);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    };
}

function SurfacePoint(u, v) {
    const a = 0.8;
    const c = 2.0;
    const theta = 0.2 * Math.PI;
    const radius = a + v * Math.cos(theta) + c * v * v * Math.sin(theta);
    return [
        radius * Math.cos(u),
        radius * Math.sin(u),
        -v * Math.sin(theta) + c * v * v * Math.cos(theta)
    ];
}

function CreateSurfaceData(data, uSegments = 36, vSegments = 24) {
    const vertices = [];
    const triangles = [];
    const stride = uSegments + 1;
    const vMin = -0.8;
    const vMax = 0.8;

    // Duplicate the U seam so texture coordinates go from 0 to 1
    for (let j = 0; j <= vSegments; j++) {
        const v = vMin + (vMax - vMin) * j / vSegments;
        for (let i = 0; i <= uSegments; i++) {
            const u = 2 * Math.PI * i / uSegments;
            vertices.push(new Vertex(SurfacePoint(u, v), [i / uSegments, j / vSegments]));
        }
    }

    for (let j = 0; j < vSegments; j++) {
        for (let i = 0; i < uSegments; i++) {
            const a = j * stride + i;
            const b = a + 1;
            const c = a + stride;
            const d = c + 1;
            addTriangle(vertices, triangles, a, b, c);
            addTriangle(vertices, triangles, b, d, c);
        }
    }

    // Average both sides of the texture seam
    for (let j = 0; j <= vSegments; j++) {
        const left = vertices[j * stride];
        const right = vertices[j * stride + uSegments];
        for (let k = 0; k < 3; k++) {
            const n = left.normal[k] + right.normal[k];
            const t = left.tangent[k] + right.tangent[k];
            left.normal[k] = right.normal[k] = n;
            left.tangent[k] = right.tangent[k] = t;
        }
    }

    const positions = [];
    const normals = [];
    const tangents = [];
    const texcoords = [];
    const indices = [];

    for (const vertex of vertices) {
        positions.push(...vertex.p);
        normals.push(...normalize(vertex.normal));
        tangents.push(...normalize(vertex.tangent));
        texcoords.push(...vertex.uv);
    }
    for (const triangle of triangles) {
        indices.push(triangle.a, triangle.b, triangle.c);
    }

    data.verticesF32 = new Float32Array(positions);
    data.normalsF32 = new Float32Array(normals);
    data.tangentsF32 = new Float32Array(tangents);
    data.texcoordsF32 = new Float32Array(texcoords);
    data.indicesU16 = new Uint16Array(indices);
}

function addTriangle(vertices, triangles, a, b, c) {
    const p0 = vertices[a].p;
    const p1 = vertices[b].p;
    const p2 = vertices[c].p;
    const e1 = subtract(p1, p0);
    const e2 = subtract(p2, p0);
    const n = cross(e1, e2);

    const uv0 = vertices[a].uv;
    const uv1 = vertices[b].uv;
    const uv2 = vertices[c].uv;
    const du1 = uv1[0] - uv0[0];
    const dv1 = uv1[1] - uv0[1];
    const du2 = uv2[0] - uv0[0];
    const dv2 = uv2[1] - uv0[1];
    const det = du1 * dv2 - du2 * dv1;
    if (Math.abs(det) < 1e-10) return;

    const tangent = [
        (e1[0] * dv2 - e2[0] * dv1) / det,
        (e1[1] * dv2 - e2[1] * dv1) / det,
        (e1[2] * dv2 - e2[2] * dv1) / det
    ];
    const weight = Math.hypot(n[0], n[1], n[2]);

    // Cross product length gives the area weight
    for (const i of [a, b, c]) {
        for (let k = 0; k < 3; k++) {
            vertices[i].normal[k] += n[k];
            vertices[i].tangent[k] += tangent[k] * weight;
        }
    }
    triangles.push(new Triangle(a, b, c));
}
