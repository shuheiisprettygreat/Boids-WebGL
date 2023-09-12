import {Shader} from "../Shader.js";
import {Renderer} from "../Renderer.js";
import {Camera} from "../Camera.js";
import {initVAO, initTexture, initCubeVAO} from "../init-buffers.js";

import { Json2Va } from "../json2vertexArray.js";

import {mat3, mat4, vec3} from "gl-matrix";

import vsSource from './shaders/mat1/v.vert?raw';
import fsSource from './shaders/mat1/f.frag?raw';

import skyVsSource from './shaders/skybox_grad/skybox_grad.vert?raw';
import skyFsSource from './shaders/skybox_grad/skybox_grad.frag?raw';

import quadVsSource from './shaders/NDCQuad/NDCQuad.vert?raw';
import quadFsSource from './shaders/NDCQuad/NDCQuad.frag?raw';

import updateVsSource from './shaders/update/update.vert?raw';
import updateFsSource from './shaders/update/update.frag?raw';

import hashingVsSource from './shaders/hashing/hashing.vert?raw';
import hashingFsSource from './shaders/hashing/hashing.frag?raw';

import bitonicSortVsSource from './shaders/bitonicSort/bitonicSort.vert?raw';
import bitonicSortFsSource from './shaders/bitonicSort/bitonicSort.frag?raw';

import hashToIndicesVsSource from './shaders/hashToIndices/hashToIndices.vert?raw';
import hashToIndicesFsSource from './shaders/hashToIndices/hashToIndices.frag?raw';

import copyToBufferVsSource from './shaders/copyToBuffer/copyToBuffer.vert?raw';
import copyToBufferFsSource from './shaders/copyToBuffer/copyToBuffer.frag?raw';

import drawVsSource from './shaders/draw/draw.vert?raw';
import drawFsSource from './shaders/draw/draw.frag?raw';

import { createBuffer, createFramebuffer, createTexture, createVertexArray } from "../createGLData.js";


class WebGLRenderer extends Renderer {

    //---------------------------------------
    constructor(){
        // make canvas / define callbacks.
        super();

        // set up gl
        this.gl = this.canvas.getContext("webgl2");
          
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // setup shaders
        this.shader = new Shader(this.gl, vsSource, fsSource);
        this.skyShader = new Shader(this.gl, skyVsSource, skyFsSource);
        this.quadShader = new Shader(this.gl, quadVsSource, quadFsSource);

        // shader to update datas using texture
        this.updateShader = new Shader(this.gl, updateVsSource, updateFsSource);
        this.updateShader.use();
        this.updateShader.setInt("positionTexRead", 0);
        this.updateShader.setInt("velocityTexRead", 1);
        this.setupBoidsParams(this.updateShader);

        // shader to hash position
        this.hashingShader = new Shader(this.gl, hashingVsSource, hashingFsSource);
        this.hashingShader.use();
        this.hashingShader.setInt("positionTexRead", 0);

        // shader to sort hashed values
        this.bitonicSortShader = new Shader(this.gl, bitonicSortVsSource, bitonicSortFsSource);
        this.bitonicSortShader.use();
        this.bitonicSortShader.setInt("texRead", 0);
        
        // shader to save index range sharing same hash.
        this.hash2indicesShader = new Shader(this.gl, hashToIndicesVsSource, hashToIndicesFsSource);
        this.hash2indicesShader.use();
        this.hash2indicesShader.setInt("sortedTex", 0);

        // copy data from data-texture to buffers. 
        this.copyShader = new Shader(this.gl, copyToBufferVsSource, copyToBufferFsSource, ['position', 'velocity']);
        this.copyShader.use();
        this.copyShader.setInt("positionTexRead", 0);
        this.copyShader.setInt("velocityTexRead", 1);

        // shader for drawing. 
        this.drawShader = new Shader(this.gl, drawVsSource, drawFsSource);

        // setup datas
        this.vao = initVAO(this.gl);
        this.texture = initTexture(this.gl, {
            checker_gray : "src\\images\\checker2k.png",
            checker_colored : "src\\images\\checker2kC.png"
        });
        
        // setup camera
        this.camera = new Camera(5, 3, 7, 0, 1, 0, 0, 0, 45);
        this.camera.lookAt(0, 0, 0);
        
        this.parser = new Json2Va(this.gl);

        // extensions
        const ext = this.gl.getExtension('EXT_color_buffer_float');
    }

    setupBoidsParams(shader){
        let sep_radius = 0.05;
        let coh_radius = 0.15;
        let ali_radius = 0.25;
        // keep maximum range for grid sorting.
        this.maxPerceptionRadius = Math.max(sep_radius, coh_radius, ali_radius);

        shader.setFloat("sep_radius", sep_radius);
        shader.setFloat("coh_radius", coh_radius);
        shader.setFloat("ali_radius", ali_radius);
        shader.setFloat("sep_k", 1.0);
        shader.setFloat("coh_k", 2.0);
        shader.setFloat("ali_k", 1.5);
        shader.setFloat("maxForce", 10.0);
        shader.setFloat("maxSpeed", 2.0);
        shader.setFloat("minSpeed", 0.4);
        shader.setFloat("restrictRadius", 4.0);
        shader.setFloat("restrictStrength", 0.5);
    }

    //---------------------------------------
    
    init(){
        let gl = this.gl;

        // Initialize particles info / should be power of 2 (required for bitonic sort)
        this.nrParticles = 4096;
        let initialPosisionRadius = 1.0;
        let initialVelocityRadius = 2.0
        const positions = new Float32Array(new Array(this.nrParticles).fill(0).map(_=>this.randomInsideSphere4(initialPosisionRadius)).flat());
        const velocities = new Float32Array(new Array(this.nrParticles).fill(0).map(_=>this.randomInsideSphere4(initialVelocityRadius)).flat());

        // setup data texture and framebuffers
        this.dataTextureWidth = Math.ceil(Math.sqrt(this.nrParticles));
        this.dataTextureHeight = Math.ceil(this.nrParticles / this.dataTextureWidth);
        const positionTexture1 = createTexture(gl, positions,  4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const positionTexture2 = createTexture(gl, null,       4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const velocityTexture1 = createTexture(gl, velocities, 4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const velocityTexture2 = createTexture(gl, null,       4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const fb1 = this.createFramebuffer_2tex(gl, positionTexture1, velocityTexture1);
        const fb2 = this.createFramebuffer_2tex(gl, positionTexture2, velocityTexture2);
        this.updateInfoRead  = {fb: fb1, position: positionTexture1, velocity: velocityTexture1};
        this.updateInfoWrite = {fb: fb2, position: positionTexture2, velocity: velocityTexture2};

        // setup datas for spatial hashing and bitonic sort
        
        // setup hashing info
        // hashDimension^2 is size of hashTable.
        // resonable limit is < 4096 because of device specific limiatation, but this is ample.
        this.hashDimension = 2048;

        const sortTexture1 = createTexture(gl, null,  4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const sortTexture2 = createTexture(gl, null,  4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const fbSort1 = createFramebuffer(gl, sortTexture1);
        const fbSort2 = createFramebuffer(gl, sortTexture2);
        this.exponentNrParticle = Math.log2(this.nrParticles);
        this.sortInfoRead = {fb:fbSort1, tex:sortTexture1};
        this.sortInfoWrite = {fb:fbSort2, tex:sortTexture2};

        // setup dats for hash-to-indices table
        const hash2indicesTexture = createTexture(gl, null,  4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.hashDimension, this.hashDimension);
        const fbIndices = createFramebuffer(gl, hash2indicesTexture);
        this.hash2indicesInfo = {fb: fbIndices, tex:hash2indicesTexture};

        // setup transform feedback
        const positionBuffer = createBuffer(gl, 12 * this.nrParticles, gl.STREAM_DRAW);
        const velocityBuffer = createBuffer(gl, 12 * this.nrParticles, gl.STREAM_DRAW);
        const tf = this.createTransformFeedback(gl, positionBuffer, velocityBuffer);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null);
        this.copyInfo = {tf:tf};

        // setup datas to draw.
        const drawVa = this.parser.vaList[1];
        gl.bindVertexArray(drawVa);
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.enableVertexAttribArray(3);
            gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(3, 1);
            gl.bindBuffer(gl.ARRAY_BUFFER, velocityBuffer);
            gl.enableVertexAttribArray(4);
            gl.vertexAttribPointer(4, 3, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(4, 1);
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        this.drawInfo = {va:drawVa, size:this.parser.sizeList[1]};

    }

    // helper functions-----------------------------
    randomInsideSphere4(r){
        let result = vec3.create();
        vec3.random(result, Math.cbrt(Math.random())*r);
        return [result[0], result[1], result[2], 1];
    }

    randomInsideSphere3(r){
        let result = vec3.create();
        vec3.random(result, Math.cbrt(Math.random())*r);
        return [result[0], result[1], result[2]];
    }

    createFramebuffer_2tex(gl, tex1, tex2){
        const result = gl.createFramebuffer();
        gl.bindTexture(gl.TEXTURE_2D, tex1);
        gl.bindFramebuffer(gl.FRAMEBUFFER, result);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex1, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, tex2, 0);
        const mrtTarget = [
            gl.COLOR_ATTACHMENT0,
            gl.COLOR_ATTACHMENT1,
        ];
        gl.drawBuffers(mrtTarget);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        return result;
    }

    createTransformFeedback(gl, buffer1, buffer2){
        const tf = gl.createTransformFeedback();
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, buffer1);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, buffer2);
        return tf;
    }
    

    //---------------------------------------
    OnResize(width, height){
        this.width = width;
        this.height = height;
    }

    //---------------------------------------
    beforeFrame(){

        let gl = this.gl;

        // compute hash of each particle. ==================================
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.sortInfoWrite.fb);
            gl.viewport(0, 0, this.dataTextureWidth, this.dataTextureHeight);
            this.hashingShader.use();
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.updateInfoRead.position);
            this.hashingShader.setIVec2("texDimensions", this.dataTextureWidth, this.dataTextureHeight);
            this.hashingShader.setFloat("gridSize", this.maxPerceptionRadius);
            this.hashingShader.setFloat("hashSize", this.hashDimension * this.hashDimension);
            this.renderQuad();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        let swap = this.sortInfoRead;
        this.sortInfoRead = this.sortInfoWrite;
        this.sortInfoWrite = swap;


        // bitonic sort  ==================================
        this.bitonicSortShader.use();
        this.bitonicSortShader.setIVec2("texDimensions", this.dataTextureWidth, this.dataTextureHeight);
        this.bitonicSortShader.setVec2("invTexDimensions", 1.0/this.dataTextureWidth, 1.0/this.dataTextureHeight);
        gl.viewport(0, 0, this.dataTextureWidth, this.dataTextureHeight);
        gl.activeTexture(gl.TEXTURE0);
        for(let stage=1; stage<=this.exponentNrParticle; stage++){
            this.bitonicSortShader.setInt("stage", stage);
            for(let offsetExp = stage-1; offsetExp >= 0; offsetExp--){
                this.bitonicSortShader.setInt("offsetExp", offsetExp);
                this.bitonicSortShader.setInt("offset", 1<<offsetExp);
                gl.bindTexture(gl.TEXTURE_2D, this.sortInfoRead.tex);
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.sortInfoWrite.fb);
                this.renderQuad();
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                swap = this.sortInfoRead;
                this.sortInfoRead = this.sortInfoWrite;
                this.sortInfoWrite = swap;
            }
        }

        // write range of indices which their particles sharing same hash, using hash-sorted indices. ==============
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.hash2indicesInfo.fb);
            this.hash2indicesShader.use();
            this.hash2indicesShader.setIVec2("texDimensions", this.dataTextureWidth, this.dataTextureHeight);
            this.hash2indicesShader.setInt("nrParticles", this.nrParticles);
            this.hash2indicesShader.setInt("hashDimension", this.hashDimension);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.sortInfoRead.tex);
            gl.viewport(0, 0, this.hashDimension, this.hashDimension);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE);
            gl.clearColor(0.0, 0.0, 0.0, 0.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.POINTS, 0, this.nrParticles);
            gl.disable(gl.BLEND);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);


        //update values using update shader ==================================
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.updateInfoWrite.fb);
            gl.viewport(0, 0, this.dataTextureWidth, this.dataTextureHeight);
            this.updateShader.use();
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.updateInfoRead.position);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.updateInfoRead.velocity);
            this.updateShader.setIVec2("texDimensions", this.dataTextureWidth, this.dataTextureHeight);
            this.updateShader.setFloat("deltaTime", this.timeDelta/1000.0);
            this.updateShader.setInt("nrParticle", this.nrParticles);
            this.renderQuad();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        swap = this.updateInfoRead;
        this.updateInfoRead = this.updateInfoWrite;
        this.updateInfoWrite = swap;


        // write pre-update position datas to buffer using transform feedback ==================================
        this.copyShader.use();
        this.copyShader.setIVec2("texDimensions", this.dataTextureWidth, this.dataTextureHeight);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.updateInfoRead.position);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.updateInfoRead.velocity);

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindVertexArray(null);
        gl.enable(gl.RASTERIZER_DISCARD);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.copyInfo.tf);
        gl.beginTransformFeedback(gl.POINTS);
        gl.drawArrays(gl.POINTS, 0, this.nrParticles);
        gl.endTransformFeedback();
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

        gl.disable(gl.RASTERIZER_DISCARD);

        //print tf result
        // const results = new Float32Array(this.nrParticles);
        
        // gl.getBufferSubData(gl.ARRAY_BUFFER, 0, results);
        // console.log(results.slice(0, 6));
        

    }

    //---------------------------------------
    // Main loop function.
    OnFrame(timestamp, timeDelta){

        super.OnFrame();
        let gl = this.gl;
      
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const view = this.camera.getViewMatrix();
        const proj = mat4.create();
        mat4.perspective(proj, this.camera.fov * Math.PI / 180.0, this.width/this.height, 0.1, 100.0);

        this.shader.use();
        this.shader.setMat4("proj", proj);
        this.shader.setMat4("view", view);
        this.drawShader.use();
        this.drawShader.setMat4("proj", proj);
        this.drawShader.setMat4("view", view);
        this.skyShader.use();
        this.skyShader.setMat4("proj", proj);
        let viewTrans = mat4.fromValues(
            view[0], view[1], view[2], 0,
            view[4], view[5], view[6], 0,
            view[8], view[9], view[10], 0,
            0, 0, 0, 1
        );
        this.skyShader.setMat4("view", viewTrans);

        // render scene
        gl.viewport(0, 0, this.width, this.height);
        gl.depthMask(true);
        this.drawScene(this.shader);

        // render instanced particles
        gl.viewport(0, 0,this.width, this.height);
        gl.depthMask(true);
        this.drawParticles();

        //render background
        gl.viewport(0, 0, this.width, this.height);
        gl.depthMask(false);
        this.skyShader.use();
        this.renderCube();

        // render debug quads
        let debug_w = this.width * 0.1;
        gl.viewport(0, 0 ,debug_w, debug_w);
        gl.depthFunc(gl.ALWAYS);
        this.quadShader.use();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.updateInfoRead.position);
        this.renderQuad();

        gl.viewport(debug_w*1.2, 0 ,debug_w, debug_w);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.sortInfoRead.tex);
        this.renderQuad();

        gl.viewport(debug_w*2.4, 0 ,debug_w, debug_w);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.hash2indicesInfo.tex);
        this.renderQuad();

    }

    drawParticles(){
        let gl = this.gl;
        let model = mat4.create();

        // scale
        mat4.scale(model, model, vec3.fromValues(0.05, 0.05, 0.05));

        this.drawShader.use();
        this.drawShader.setMat4("model", model);

        gl.bindVertexArray(this.drawInfo.va);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, this.drawInfo.size, this.nrParticles);
        gl.bindVertexArray(null);
    }

    // draw geometries with given shader
    drawScene(shader){
        let gl = this.gl;
        let model = mat4.create();
        shader.use();
        
        model = mat4.create();
        mat4.translate(model, model, vec3.fromValues(0, -1.0, 0));
        mat4.scale(model, model, vec3.fromValues(5, 5, 5));
        shader.setMat4("model", model);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture.checker_gray);
        this.renderPlane();
    }

    renderCube(){
        let gl = this.gl;
        gl.bindVertexArray(this.vao.cube);
        gl.drawArrays(gl.TRIANGLES, 0, 36);
    }

    renderPlane(){
        let gl = this.gl;
        gl.bindVertexArray(this.vao.plane);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    renderQuad(){
        let gl = this.gl;
        gl.bindVertexArray(this.vao.quad);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    renderCustom(){
        let gl = this.gl;
        gl.bindVertexArray(this.parser.vaList[0]);
        gl.drawArrays(gl.TRIANGLES, 0, this.parser.sizeList[0]);
    }
}

export {WebGLRenderer}