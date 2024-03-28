import {Shader} from "../Shader.js";
import {Renderer} from "../Renderer.js";
import {Camera} from "../Camera.js";
import {initVAO, initTexture, initCubeVAO, initQuadVAO} from "../init-buffers.js";

import { Json2Va } from "../json2vertexArray.js";

import {mat3, mat4, vec3, vec2} from "gl-matrix";

import vsSource from './shaders/mat1/v.vert?raw';
import fsSource from './shaders/mat1/f.frag?raw';

import skyVsSource from './shaders/skybox_grad/skybox_grad.vert?raw';
import skyFsSource from './shaders/skybox_grad/skybox_grad.frag?raw';

import quadVsSource from './shaders/NDCQuad/NDCQuad.vert?raw';
import quadFsSource from './shaders/NDCQuad/NDCQuad.frag?raw';

import initializeVsSource from './shaders/initialize/initialize.vert?raw';
import initializeFsSource from './shaders/initialize/initialize.frag?raw';

import updateVsSource from './shaders/update/update.vert?raw';
import updateFsSource from './shaders/update/update.frag?raw';

import hashingVsSource from './shaders/hashing/hashing.vert?raw';
import hashingFsSource from './shaders/hashing/hashing.frag?raw';

import bitonicSortVsSource from './shaders/bitonicSort/bitonicSort.vert?raw';
import bitonicSortFsSource from './shaders/bitonicSort/bitonicSort.frag?raw';

import hashToIndicesVsSource from './shaders/hashToIndices/hashToIndices.vert?raw';
import hashToIndicesFsSourceBegin from './shaders/hashToIndices/hashToIndices_begin.frag?raw';
import hashToIndicesFsSourceEnd from './shaders/hashToIndices/hashToIndices_end.frag?raw';

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

        // setup shaders ---------
        this.shader = new Shader(this.gl, vsSource, fsSource);
        this.skyShader = new Shader(this.gl, skyVsSource, skyFsSource);
        this.quadShader = new Shader(this.gl, quadVsSource, quadFsSource);

        // initializeShaders ----------
        this.initializeShader = new Shader(this.gl, initializeVsSource, initializeFsSource);
        
        // shader to hash position
        this.hashingShader = new Shader(this.gl, hashingVsSource, hashingFsSource);
        this.hashingShader.use();
        this.hashingShader.setInt("positionTexRead", 0);
        
        // shader to sort hashed values
        this.bitonicSortShader = new Shader(this.gl, bitonicSortVsSource, bitonicSortFsSource);
        this.bitonicSortShader.use();
        this.bitonicSortShader.setInt("texRead", 0);
        
        // shader to save index range sharing same hash.
        this.hash2indicesBeginShader = new Shader(this.gl, hashToIndicesVsSource, hashToIndicesFsSourceBegin);
        this.hash2indicesBeginShader.use();
        this.hash2indicesBeginShader.setInt("sortedTex", 0);
        this.hash2indicesEndShader = new Shader(this.gl, hashToIndicesVsSource, hashToIndicesFsSourceEnd);
        this.hash2indicesEndShader.use();
        this.hash2indicesEndShader.setInt("sortedTex", 0);
        
        // shader to update datas using texture
        this.updateShader = new Shader(this.gl, updateVsSource, updateFsSource);
        this.updateShader.use();
        this.updateShader.setInt("positionTexRead", 0);
        this.updateShader.setInt("velocityTexRead", 1);
        this.updateShader.setInt("bitangentTexRead", 2);
        this.updateShader.setInt("sortedHashedIdTex", 3);
        this.updateShader.setInt("hash2indicesBeginTex", 4);
        this.updateShader.setInt("hash2indicesEndTex", 5);
        this.setupBoidsParams(this.updateShader);

        // copy data from data-texture to buffers. 
        this.copyShader = new Shader(this.gl, copyToBufferVsSource, copyToBufferFsSource, ['position', 'velocity', 'bitangent']);
        this.copyShader.use();
        this.copyShader.setInt("positionTexRead", 0);
        this.copyShader.setInt("velocityTexRead", 1);
        this.copyShader.setInt("bitangentTexRead", 2);
        
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

        // show some gl information
        const maxTextureUnits = this.gl.getParameter(this.gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
        const maxVertexShaderTextureUnits = this.gl.getParameter(this.gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
        const maxFragmentShaderTextureUnits = this.gl.getParameter(this.gl.MAX_TEXTURE_IMAGE_UNITS);
        const maxTextureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);

        console.log("maxTextureUnits", maxTextureUnits);
        console.log("maxVertexShaderTextureUnits:", maxVertexShaderTextureUnits );
        console.log("maxFragmentShaderTextureUnits:", maxFragmentShaderTextureUnits);
        console.log("maxTextureSize:", maxTextureSize);

        console.log("enum: ", this.gl.COLOR_ATTACHMENT0);
        console.log("enum+1: ", this.gl.COLOR_ATTACHMENT0+1);

        if(!ext){
            console.log("color buffer float extension not found");
        }
    }

    setupBoidsParams(shader){
        shader.use();

        shader.setFloat("v0", 10.0); // Cruise Speed
        shader.setFloat("tau", 3.0); // relaxation time
        shader.setFloat("M", 0.08); // Mass
        shader.setFloat("weightRandomForce", 0.01); 
        shader.setFloat("Rmax", 100.0); // max perception range
        shader.setFloat("du", 50.0); // reaction time
        shader.setFloat("s", 50.0 * 0.1) // interpolation factor
    }

    //---------------------------------------
    
    init(){
        let gl = this.gl;

        this.nrParticles = 5000;

        // setup data texture and framebuffers
        this.dataTextureWidth = Math.ceil(Math.sqrt(this.nrParticles));
        this.dataTextureHeight = Math.ceil(this.nrParticles / this.dataTextureWidth);
        const positionTexture1 = createTexture(gl, null, 4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const positionTexture2 = createTexture(gl, null, 4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const velocityTexture1 = createTexture(gl, null, 4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const velocityTexture2 = createTexture(gl, null, 4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const bitangentTexture1 = createTexture(gl, null, 4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const bitangentTexture2 = createTexture(gl, null, 4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const fb1 = this.createFramebuffer_mrt(gl, [positionTexture1, velocityTexture1, bitangentTexture1]);
        const fb2 = this.createFramebuffer_mrt(gl, [positionTexture2, velocityTexture2, bitangentTexture2]);
        this.updateInfoRead  = {fb: fb1, position: positionTexture1, velocity: velocityTexture1, bitangent: bitangentTexture1};
        this.updateInfoWrite = {fb: fb2, position: positionTexture2, velocity: velocityTexture2, bitangent: bitangentTexture2};

        // initialize positions / velocities.
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.updateInfoWrite.fb);
            gl.viewport(0, 0, this.dataTextureWidth, this.dataTextureHeight);
            this.initializeShader.use();
            this.renderQuad();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        [this.updateInfoRead, this.updateInfoWrite] = [this.updateInfoWrite, this.updateInfoRead];

        // setup lazy-updated range values.
        const textureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
        

        // setup datas for spatial hashing and bitonic sort
        // setup hashing info
        // hashDimension^2 is size of hashTable.
        // resonable limit is < 4096, because of device specific limiatation, which is ample.
        this.hashDimension = 2048;

        const sortTexture1 = createTexture(gl, null,  2, gl.RG32F, gl.RG, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const sortTexture2 = createTexture(gl, null,  2, gl.RG32F, gl.RG, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const fbSort1 = createFramebuffer(gl, sortTexture1);
        const fbSort2 = createFramebuffer(gl, sortTexture2);
        this.exponentNrParticle = Math.log2(this.nrParticles);
        this.sortInfoRead = {fb:fbSort1, tex:sortTexture1};
        this.sortInfoWrite = {fb:fbSort2, tex:sortTexture2};

        // setup dats for hash-to-indices table
        const hash2indicesTexture_begin = createTexture(gl, null,  4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.hashDimension, this.hashDimension);
        const hash2indicesTexture_end   = createTexture(gl, null,  4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.hashDimension, this.hashDimension);
        const fbIndicesBegin = createFramebuffer(gl, hash2indicesTexture_begin);
        const fbIndicesEnd = createFramebuffer(gl, hash2indicesTexture_end);
        this.hash2indicesInfo = {fbBegin: fbIndicesBegin, fbEnd:fbIndicesEnd, texBegin:hash2indicesTexture_begin, texEnd:hash2indicesTexture_end};

        // setup transform feedbacks
        const positionBuffer = createBuffer(gl, 12 * this.nrParticles, gl.STREAM_COPY);
        const velocityBuffer = createBuffer(gl, 12 * this.nrParticles, gl.STREAM_COPY);
        const bitangentBuffer = createBuffer(gl, 12 * this.nrParticles, gl.STREAM_COPY);
        const tf = this.createTransformFeedback(gl, [positionBuffer, velocityBuffer, bitangentBuffer]);
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
            gl.bindBuffer(gl.ARRAY_BUFFER, bitangentBuffer);
            gl.enableVertexAttribArray(5);
            gl.vertexAttribPointer(5, 3, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(5, 1);
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        this.drawInfo = {va:drawVa, size:this.parser.sizeList[1]};

    }

    // helper functions-----------------------------
    createFramebuffer_mrt(gl, textures){
        const result = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, result);
        const mrtTarget = new Array(textures.length);
        for (let i = 0; i < textures.length; i++) {
            gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0+i, gl.TEXTURE_2D, textures[i], 0);
            mrtTarget[i] = gl.COLOR_ATTACHMENT0+i;
        }
        gl.drawBuffers(mrtTarget);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        return result;
    }

    createTransformFeedback(gl, buffers){
        const tf = gl.createTransformFeedback();
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
        for(let i=0; i<buffers.length; i++){
            gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, i, buffers[i]);    
        }
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
            this.hashingShader.setTexture(0, this.updateInfoRead.possition);
            this.hashingShader.setIVec2("texDimensions", this.dataTextureWidth, this.dataTextureHeight);
            this.hashingShader.setFloat("gridSize", this.maxPerceptionRadius);
            this.hashingShader.setInt("hashSize", this.hashDimension * this.hashDimension);
            this.renderQuad();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        [this.sortInfoRead, this.sortInfoWrite] = [this.sortInfoWrite, this.sortInfoRead];

        // bitonic sort  ==================================
        this.bitonicSortShader.use();
        this.bitonicSortShader.setIVec2("texDimensions", this.dataTextureWidth, this.dataTextureHeight);
        this.bitonicSortShader.setVec2("invTexDimensions", 1.0/this.dataTextureWidth, 1.0/this.dataTextureHeight);
        gl.viewport(0, 0, this.dataTextureWidth, this.dataTextureHeight);
        for(let stage=1; stage<=this.exponentNrParticle; stage++){
            this.bitonicSortShader.setInt("stage", stage);
            for(let offsetExp = stage-1; offsetExp >= 0; offsetExp--){
                this.bitonicSortShader.setInt("offsetExp", offsetExp);
                this.bitonicSortShader.setInt("offset", 1<<offsetExp);
                this.bitonicSortShader.setTexture(0, this.sortInfoRead.tex);
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.sortInfoWrite.fb);
                this.renderQuad();
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                [this.sortInfoRead, this.sortInfoWrite] = [this.sortInfoWrite, this.sortInfoRead];
            }
        }

        // ios doesnt work with way above because of blending. 
        // below is version without blending.
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.hash2indicesInfo.fbBegin);
            this.hash2indicesBeginShader.use();
            this.hash2indicesBeginShader.setInt("texDimensionsX", this.dataTextureWidth);
            this.hash2indicesBeginShader.setInt("nrParticles", this.nrParticles);
            this.hash2indicesBeginShader.setInt("hashDimension", this.hashDimension);
            this.hash2indicesBeginShader.setTexture(0, this.sortInfoRead.tex);
            gl.viewport(0, 0, this.hashDimension, this.hashDimension);
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.bindVertexArray(null);
            gl.drawArrays(gl.POINTS, 0, this.nrParticles);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.hash2indicesInfo.fbEnd);
            this.hash2indicesEndShader.use();
            this.hash2indicesEndShader.setInt("texDimensionsX", this.dataTextureWidth);
            this.hash2indicesEndShader.setInt("nrParticles", this.nrParticles);
            this.hash2indicesEndShader.setInt("hashDimension", this.hashDimension);
            this.hash2indicesEndShader.setTexture(0, this.sortInfoRead.tex);
            gl.viewport(0, 0, this.hashDimension, this.hashDimension);
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.bindVertexArray(null);
            gl.drawArrays(gl.POINTS, 0, this.nrParticles);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);



        //update values using update shader ==================================
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.updateInfoWrite.fb);
            // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            // gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.viewport(0, 0, this.dataTextureWidth, this.dataTextureHeight);
            this.updateShader.use();
            this.updateShader.setTexture(0, this.updateInfoRead.position);
            this.updateShader.setTexture(1, this.updateInfoRead.velocity);
            this.updateShader.setTexture(2, this.updateInfoRead.bitangent);
            this.updateShader.setTexture(3, this.sortInfoRead.tex);
            this.updateShader.setTexture(4, this.hash2indicesInfo.texBegin);
            this.updateShader.setTexture(5, this.hash2indicesInfo.texEnd);
            this.updateShader.setIVec2("texDimensions", this.dataTextureWidth, this.dataTextureHeight);
            this.updateShader.setFloat("deltaTime", this.timeDelta/1000.0);
            this.updateShader.setInt("nrParticle", this.nrParticles);
            this.updateShader.setInt("hashDimension", this.hashDimension);
            this.updateShader.setFloat("gridSize", this.maxPerceptionRadius);
            this.updateShader.setInt("hashSize", this.hashDimension * this.hashDimension);
            this.renderQuad();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        [this.updateInfoRead, this.updateInfoWrite] = [this.updateInfoWrite, this.updateInfoRead];


        // write pre-update position datas to buffer using transform feedback ==================================
        this.copyShader.use();
        this.copyShader.setIVec2("texDimensions", this.dataTextureWidth, this.dataTextureHeight);
        this.copyShader.setTexture(0, this.updateInfoRead.position);
        this.copyShader.setTexture(1, this.updateInfoRead.velocity);
        this.copyShader.setTexture(2, this.updateInfoRead.bitangent);

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
        this.quadShader.setTexture(0, this.updateInfoRead.position);
        this.renderQuad();

        gl.viewport(debug_w*1.2, 0 ,debug_w, debug_w);
        this.quadShader.setTexture(0, this.sortInfoRead.tex);
        this.renderQuad();

        gl.viewport(debug_w*2.4, 0 ,debug_w, debug_w);
        this.quadShader.setTexture(0, this.hash2indicesInfo.texBegin);
        this.renderQuad();

    }

    drawParticles(){
        let gl = this.gl;
        let model = mat4.create();

        // scale
        mat4.scale(model, model, vec3.fromValues(0.05, 0.05, 0.05));

        this.drawShader.use();
        this.drawShader.setMat4("model", model);
        this.drawShader.setVec3("camera", this.camera.pos[0], this.camera.pos[1], this.camera.pos[2]);

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
        mat4.translate(model, model, vec3.fromValues(0, 0, 0));
        mat4.scale(model, model, vec3.fromValues(5, 5, 5));
        shader.setMat4("model", model);
        shader.setTexture(0, this.texture.checker_gray);
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