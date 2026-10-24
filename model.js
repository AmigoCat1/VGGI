'use strict';

function Vertex(p) {
    this.p = p;
    this.normal = [0, 0, 0];
    this.triangles = [];
}

function Triangle(v0, v1, v2) {
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    this.normal = [0, 0, 0];
}

function subtract(a, b) {
    return [
        a[0] - b[0],
        a[1] - b[1],
        a[2] - b[2]
    ];
}

function cross(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

function normalize(v) {
    const len = Math.sqrt(
        v[0] * v[0] +
        v[1] * v[1] +
        v[2] * v[2]
    );

    if (len === 0) return [0, 0, 0];

    return [
        v[0] / len,
        v[1] / len,
        v[2] / len
    ];
}

function Model(name) {
    this.name = name;

    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer();

    this.count = 0;

    this.BufferData = function (vertices, normals, indices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        this.count = indices.length;
    };

    this.Draw = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    };
}

function SurfacePoint(u, v) {
    const a = 0.8;
    const c = 2.0;
    const theta = 0.2 * Math.PI;

    const radius =
        a +
        v * Math.cos(theta) +
        c * v * v * Math.sin(theta);

    const x = radius * Math.cos(u);
    const y = radius * Math.sin(u);
    const z = -v * Math.sin(theta) + c * v * v * Math.cos(theta);

    return [x, y, z];
}

function CreateSurfaceData(data, uSegments = 36, vSegments = 24) {
    const vertices = [];
    const triangles = [];

    const vMin = -0.8;
    const vMax = 0.8;

    for (let j = 0; j <= vSegments; j++) {
        const v = vMin + (vMax - vMin) * j / vSegments;

        for (let i = 0; i < uSegments; i++) {
            const u = 2 * Math.PI * i / uSegments;
            vertices.push(new Vertex(SurfacePoint(u, v)));
        }
    }

    for (let j = 0; j < vSegments; j++) {
        for (let i = 0; i < uSegments; i++) {
            const next = (i + 1) % uSegments;

            const v00 = j * uSegments + i;
            const v10 = j * uSegments + next;
            const v01 = (j + 1) * uSegments + i;
            const v11 = (j + 1) * uSegments + next;

            addTriangle(vertices, triangles, v00, v10, v01);
            addTriangle(vertices, triangles, v10, v11, v01);
        }
    }

    // Area weighted vertex normals
    for (let i = 0; i < vertices.length; i++) {
        const sum = [0, 0, 0];

        for (const triangleIndex of vertices[i].triangles) {
            const n = triangles[triangleIndex].normal;

            sum[0] += n[0];
            sum[1] += n[1];
            sum[2] += n[2];
        }

        vertices[i].normal = normalize(sum);
    }

    const positions = [];
    const normals = [];
    const indices = [];

    for (const vertex of vertices) {
        positions.push(vertex.p[0], vertex.p[1], vertex.p[2]);
        normals.push(
            vertex.normal[0],
            vertex.normal[1],
            vertex.normal[2]
        );
    }

    for (const triangle of triangles) {
        indices.push(
            triangle.v0,
            triangle.v1,
            triangle.v2
        );
    }

    data.verticesF32 = new Float32Array(positions);
    data.normalsF32 = new Float32Array(normals);
    data.indicesU16 = new Uint16Array(indices);
}

function addTriangle(vertices, triangles, v0, v1, v2) {
    const triangle = new Triangle(v0, v1, v2);

    const p0 = vertices[v0].p;
    const p1 = vertices[v1].p;
    const p2 = vertices[v2].p;

    const edge1 = subtract(p1, p0);
    const edge2 = subtract(p2, p0);

    // Keep the length because it gives the facet area weight
    triangle.normal = cross(edge1, edge2);

    const index = triangles.length;
    triangles.push(triangle);

    vertices[v0].triangles.push(index);
    vertices[v1].triangles.push(index);
    vertices[v2].triangles.push(index);
}