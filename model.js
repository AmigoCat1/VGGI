'use strict';

/*
    PA1 - Variant 16

    Surface of Revolution of a Parabola
    of Arbitrary Position

    Parameters from the handbook example:
    a = 0.8
    c = 2
    theta = 0.2 * PI

    In the handbook the parameters are (u, t).
    Here t is named v, because the assignment
    requires U and V polylines.
*/

function Model(name) {

    this.name = name;

    // Separate sets of WebGL buffers
    // for U-curves and V-curves.
    this.uBuffers = [];
    this.vBuffers = [];

    this.uCounts = [];
    this.vCounts = [];

    // Parameters of the analytical surface.
    this.a = 0.8;
    this.c = 2.0;
    this.theta = 0.2 * Math.PI;

    // Parameter ranges.
    this.uMin = 0;
    this.uMax = 2 * Math.PI;

    this.vMin = -0.8;
    this.vMax = 0.8;

    // Number of divisions.
    this.uSegments = 36;
    this.vSegments = 24;


    // ==========================================
    // Analytical surface
    // ==========================================

    this.Point = function(u, v) {

        const radius =
            this.a +
            v * Math.cos(this.theta) +
            this.c * v * v * Math.sin(this.theta);

        const x =
            radius * Math.cos(u);

        const y =
            radius * Math.sin(u);

        const z =
            -v * Math.sin(this.theta) +
            this.c * v * v * Math.cos(this.theta);

        return [x, y, z];
    };


    // ==========================================
    // Create one WebGL buffer
    // ==========================================

    this.CreateBuffer = function(vertices) {

        const buffer = gl.createBuffer();

        gl.bindBuffer(
            gl.ARRAY_BUFFER,
            buffer
        );

        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(vertices),
            gl.STATIC_DRAW
        );

        return buffer;
    };


    // ==========================================
    // Generate U and V polylines
    // ==========================================

    this.Generate = function() {

        this.uBuffers = [];
        this.vBuffers = [];

        this.uCounts = [];
        this.vCounts = [];


        // --------------------------------------
        // U POLYLINES
        //
        // v = const
        // u changes from 0 to 2*PI
        //
        // These curves go around the surface.
        // --------------------------------------

        for (
            let j = 0;
            j <= this.vSegments;
            j++
        ) {

            const v =
                this.vMin +
                (this.vMax - this.vMin) *
                j / this.vSegments;

            const vertices = [];

            for (
                let i = 0;
                i <= this.uSegments;
                i++
            ) {

                const u =
                    this.uMin +
                    (this.uMax - this.uMin) *
                    i / this.uSegments;

                const point =
                    this.Point(u, v);

                vertices.push(
                    point[0],
                    point[1],
                    point[2]
                );
            }

            const buffer =
                this.CreateBuffer(vertices);

            this.uBuffers.push(buffer);

            this.uCounts.push(
                vertices.length / 3
            );
        }


        // --------------------------------------
        // V POLYLINES
        //
        // u = const
        // v changes
        //
        // These curves go along the generating
        // parabola.
        // --------------------------------------

        for (
            let i = 0;
            i <= this.uSegments;
            i++
        ) {

            const u =
                this.uMin +
                (this.uMax - this.uMin) *
                i / this.uSegments;

            const vertices = [];

            for (
                let j = 0;
                j <= this.vSegments;
                j++
            ) {

                const v =
                    this.vMin +
                    (this.vMax - this.vMin) *
                    j / this.vSegments;

                const point =
                    this.Point(u, v);

                vertices.push(
                    point[0],
                    point[1],
                    point[2]
                );
            }

            const buffer =
                this.CreateBuffer(vertices);

            this.vBuffers.push(buffer);

            this.vCounts.push(
                vertices.length / 3
            );
        }

        console.log(
            "U polylines:",
            this.uBuffers.length
        );

        console.log(
            "V polylines:",
            this.vBuffers.length
        );
    };


    // ==========================================
    // Draw one polyline
    // ==========================================

    this.DrawBuffer = function(
        buffer,
        count
    ) {

        gl.bindBuffer(
            gl.ARRAY_BUFFER,
            buffer
        );

        gl.vertexAttribPointer(
            shProgram.iAttribVertex,
            3,
            gl.FLOAT,
            false,
            0,
            0
        );

        gl.enableVertexAttribArray(
            shProgram.iAttribVertex
        );

        gl.drawArrays(
            gl.LINE_STRIP,
            0,
            count
        );
    };


    // ==========================================
    // Draw complete wireframe
    // ==========================================

    this.Draw = function() {

        // Draw U-polylines
        for (
            let i = 0;
            i < this.uBuffers.length;
            i++
        ) {

            this.DrawBuffer(
                this.uBuffers[i],
                this.uCounts[i]
            );
        }


        // Draw V-polylines
        for (
            let i = 0;
            i < this.vBuffers.length;
            i++
        ) {

            this.DrawBuffer(
                this.vBuffers[i],
                this.vCounts[i]
            );
        }
    };
}