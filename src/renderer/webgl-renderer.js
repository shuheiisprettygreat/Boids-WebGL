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

import maxRangeVsSource from './shaders/maxRange/maxRange.vert?raw';
import maxRangeFsSource from './shaders/maxRange/maxRange.frag?raw';

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

import checker2kUrl from '/src/images/checker2k.png';
import checker2kCUrl from '/src/images/checker2kC.png';
import gradationUrl from '/src/images/gradation.png';
import groundUrl from '/src/images/ground.png';

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
        this.skyShader.use();
        this.skyShader.setInt("gradationTex", 0);
        this.quadShader = new Shader(this.gl, quadVsSource, quadFsSource);

        // initializeShaders ----------
        this.initializeShader = new Shader(this.gl, initializeVsSource, initializeFsSource);

        // shader to compute maximum range
        this.maxRangeShader = new Shader(this.gl, maxRangeVsSource, maxRangeFsSource);
        this.maxRangeShader.use();
        this.maxRangeShader.setInt("texRead", 0);
        
        // shader to hash position
        this.hashingShader = new Shader(this.gl, hashingVsSource, hashingFsSource);
        this.hashingShader.use();
        this.hashingShader.setInt("positionTexRead", 0);
        this.hashingShader.setInt("maxRangeTex", 1);
        
        // shader to sort hashed values
        this.bitonicSortShader = new Shader(this.gl, bitonicSortVsSource, bitonicSortFsSource);
        this.bitonicSortShader.use();
        this.bitonicSortShader.setInt("texRead", 0);
        
        // shader to save index range sharing same hash.
        this.hash2indicesShader = new Shader(this.gl, hashToIndicesVsSource, hashToIndicesFsSource);
        this.hash2indicesShader.use();
        this.hash2indicesShader.setInt("sortedTex", 0);
        
        // shader to update datas using texture
        this.updateShader = new Shader(this.gl, updateVsSource, updateFsSource);
        this.updateShader.use();
        this.updateShader.setInt("positionTexRead", 0);
        this.updateShader.setInt("velocityTexRead", 1);
        this.updateShader.setInt("sortedHashedIdTex", 2);
        this.updateShader.setInt("hash2indicesTex", 3);
        this.updateShader.setInt("range1Tex", 4);
        this.updateShader.setInt("range2Tex", 5);
        this.updateShader.setInt("maxRangeTex", 6);
        this.setupBoidsParams(this.updateShader);

        // copy data from data-texture to buffers. 
        this.copyShader = new Shader(this.gl, copyToBufferVsSource, copyToBufferFsSource, ['positionAndBanking', 'velocity']);
        this.copyShader.use();
        this.copyShader.setInt("positionTexRead", 0);
        this.copyShader.setInt("velocityTexRead", 1);
        
        // shader for drawing. 
        this.drawShader = new Shader(this.gl, drawVsSource, drawFsSource);

        // setup datas
        this.vao = initVAO(this.gl);
        this.texture = initTexture(this.gl, {
            checker_gray : checker2kUrl,
            checker_colored : checker2kCUrl,
            gradation : gradationUrl,
            gradationGround : groundUrl,
        });
        
        // setup camera
        this.camera = new Camera(0,0.4,0, 0, 1, 0, 0, 0, 83);
        this.camera.lookAt(1, 1, 0);
        // this.camera = new Camera(5, 5, 7, 0, 1, 0, 0, 0, 45);
        // this.camera.lookAt(0.0, 0.0, 0.0);
        
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

        this.maxPerceptionRadius = 100.0;

        shader.setFloat("v0", 10.0); // Cruise Speed [m/s]
        shader.setFloat("tau",0.8); // relaxation time [s]
        shader.setFloat("M", 0.08); // Mass [kg]
        shader.setFloat("weightRandomForce", 0.01*100.0);
        shader.setFloat("Rmax", 100.0); // max perception range [m]
        const du = 0.05; // reaction time [s]
        shader.setFloat("s", du * 0.1); // interpolation factor
        shader.setFloat("nc", 6.5); // interpolation factor [#agent]
        shader.setFloat("rh", 0.2); // radius of maximum separation [m]
        const Rsep = 4.0; // separation radius [m]
        // paramater of normal distribution. take 0.01 on Rsep.
        shader.setFloat("gammaSq", -Rsep*Rsep/Math.log(0.01));
        shader.setFloat("ws", 0.7);  // weighting factor for separation force.
        shader.setFloat("wa", 0.5);  // weighting factor for alignment force.
        shader.setFloat("wc", 1.0);  // weighting factor for cohesion force.
        shader.setVec2("roostXZ", 0.0, 0.0); // roost position
        this.roostHeight = 60.0;
        shader.setFloat("roostHeight", this.roostHeight); // roost altitude
        shader.setFloat("wRoostH", 0.035); // weighting factor horizontal attraction to the roost
        shader.setFloat("wRoostV", 0.08); // weighting factor vertical attraction to the roost
        shader.setFloat("L0", 0.78); // default lift. equals to mg [N]
        shader.setFloat("T0", 0.24) // Default thrust [N]
        const LDRatio = 3.3; // Lift drag coefficient.
        shader.setFloat("invLDRatio", 1.0/LDRatio); 
        shader.setFloat("wRollIn", 10.0);  // banking control
        shader.setFloat("wRollOut", 1.0);  // banking control
    }

    //---------------------------------------
    
    init(){
        let gl = this.gl;

        this.timestamp = 0;
        this.timedelta = 0.02;

        // scale
        this.drawScale = 0.075;

        // interaction
        this.denySphereEnabled = 0;
        this.denySpherePosition = vec3.zero;
        this.denySphereR = 200 * this.drawScale;
        this.denySphereDuration = 1.0;
        this.denySphereTimer = performance.now();

        // should be power of 2
        this.nrParticles = 2048*2.0;


        // setup data texture and framebuffers
        this.dataTextureWidth = Math.ceil(Math.sqrt(this.nrParticles));
        this.dataTextureHeight = Math.ceil(this.nrParticles / this.dataTextureWidth);
        // this.dataTextureHeight = this.dataTextureWidth;
        const positionTexture1 = createTexture(gl, null, 4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const positionTexture2 = createTexture(gl, null, 4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const velocityTexture1 = createTexture(gl, null, 4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const velocityTexture2 = createTexture(gl, null, 4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const rangeTexture1Read = createTexture(gl, null, 4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const rangeTexture2Read = createTexture(gl, null, 4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const rangeTexture1Write = createTexture(gl, null, 4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const rangeTexture2Write = createTexture(gl, null, 4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const fb1 = this.createFramebuffer_mrt(gl, [positionTexture1, velocityTexture1, rangeTexture1Read, rangeTexture2Read]);
        const fb2 = this.createFramebuffer_mrt(gl, [positionTexture2, velocityTexture2, rangeTexture1Write, rangeTexture2Write]);
        this.updateInfoRead  = {fb: fb1, position: positionTexture1, velocity: velocityTexture1, range1: rangeTexture1Read, range2: rangeTexture2Read};
        this.updateInfoWrite = {fb: fb2, position: positionTexture2, velocity: velocityTexture2, range1: rangeTexture1Write, range2: rangeTexture2Write};

        // initialize positions / velocities.
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.updateInfoWrite.fb);
            gl.viewport(0, 0, this.dataTextureWidth, this.dataTextureHeight);
            this.initializeShader.use();
            this.initializeShader.setFloat("height", this.roostHeight);
            this.renderQuad();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        [this.updateInfoRead, this.updateInfoWrite] = [this.updateInfoWrite, this.updateInfoRead];
        
        
        // setup datas for spatial hashing and bitonic sort

        // Setup max range calcurate (used for adaptive size grid sorting)
        const maxRangeTexture1 = createTexture(gl, null, 4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const maxRangeTexture2 = createTexture(gl, null, 4, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.dataTextureWidth, this.dataTextureHeight);
        const maxFb1 = this.createFramebuffer_mrt(gl, [maxRangeTexture1]);
        const maxFb2 = this.createFramebuffer_mrt(gl, [maxRangeTexture2]);
        this.maxRangeInfoRead = {fb:maxFb1, tex:maxRangeTexture1};
        this.maxRangeInfoWrite = {fb:maxFb2, tex:maxRangeTexture2};

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
        const hash2indicesTexture = createTexture(gl, null, 0, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, this.hashDimension, this.hashDimension);
        const fbIndices = createFramebuffer(gl, hash2indicesTexture);
        this.hash2indicesInfo = {fb: fbIndices, tex:hash2indicesTexture};

        // setup transform feedbacks
        const positionBuffer = createBuffer(gl, 16 * this.nrParticles, gl.STREAM_COPY);
        const velocityBuffer = createBuffer(gl, 12 * this.nrParticles, gl.STREAM_COPY);
        const tf = this.createTransformFeedback(gl, [positionBuffer, velocityBuffer]);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null);
        this.copyInfo = {tf:tf};

        // setup reflection
        const reflectionRenderRatio = 5.0;
        const reflectionTex = createTexture(gl, null, 3, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.width*reflectionRenderRatio, this.height*reflectionRenderRatio);
        const reflectionFb = this.createFramebuffer_mrt(gl, [reflectionTex]);
        this.reflectionInfo = {fb:reflectionFb, tex:reflectionTex, w:this.width*reflectionRenderRatio, h:this.height*reflectionRenderRatio};

        // setup datas to draw.
        const drawVa = this.parser.vaList[0];
        gl.bindVertexArray(drawVa);
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.enableVertexAttribArray(3);
            gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(3, 1);
            gl.bindBuffer(gl.ARRAY_BUFFER, velocityBuffer);
            gl.enableVertexAttribArray(4);
            gl.vertexAttribPointer(4, 3, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(4, 1);
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        this.drawInfo = {va:drawVa, size:this.parser.sizeList[0]};

        // for(let i=80; i>=0; i--){
        //     this.beforeFrame();
        // }
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

        this.timestamp += this.timedelta;

        // compute maximum range ==========================
        const nrIter = Math.log2(this.nrParticles);
        this.maxRangeShader.use();
        this.maxRangeShader.setInt("nrParticles", this.nrParticles);
        this.maxRangeShader.setIVec2("texDimensions", this.dataTextureWidth, this.dataTextureHeight);
        gl.viewport(0, 0, this.dataTextureWidth, this.dataTextureHeight);
        for(let i=0; i<nrIter; i++){
            if(i==0){
                this.maxRangeShader.setTexture(0, this.updateInfoRead.range2);
            } else {
                this.maxRangeShader.setTexture(0, this.maxRangeInfoRead.tex);
            }
            this.maxRangeShader.setInt("stride", Math.pow(2, i));
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.maxRangeInfoWrite.fb);
            this.renderQuad();
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            [this.maxRangeInfoRead, this.maxRangeInfoWrite] = [this.maxRangeInfoWrite, this.maxRangeInfoRead]
        }

        // compute hash of each particle. ==================================
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.sortInfoWrite.fb);
            gl.viewport(0, 0, this.dataTextureWidth, this.dataTextureHeight);
            this.hashingShader.use();
            this.hashingShader.setTexture(0, this.updateInfoRead.position);
            this.hashingShader.setTexture(1, this.maxRangeInfoRead.tex);
            this.hashingShader.setIVec2("texDimensions", this.dataTextureWidth, this.dataTextureHeight);
            this.hashingShader.setFloat("gridSize", this.maxPerceptionRadius);
            this.hashingShader.setInt("hashSize", this.hashDimension * this.hashDimension);
            this.hashingShader.setFloat("Rmax", 100.0);
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
        // write range of indices which their particles sharing same hash, using hash-sorted indices. ==============
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.hash2indicesInfo.fb);
            this.hash2indicesShader.use();
            this.hash2indicesShader.setIVec2("texDimensions", this.dataTextureWidth, this.dataTextureHeight);
            this.hash2indicesShader.setInt("nrParticles", this.nrParticles);
            this.hash2indicesShader.setInt("hashDimension", this.hashDimension);
            this.hash2indicesShader.setTexture(0, this.sortInfoRead.tex);
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
            this.updateShader.setTexture(0, this.updateInfoRead.position);
            this.updateShader.setTexture(1, this.updateInfoRead.velocity);
            this.updateShader.setTexture(2, this.sortInfoRead.tex);
            this.updateShader.setTexture(3, this.hash2indicesInfo.tex);
            this.updateShader.setTexture(4, this.updateInfoRead.range1);
            this.updateShader.setTexture(5, this.updateInfoRead.range2);
            this.updateShader.setTexture(6, this.maxRangeInfoRead.tex);
            this.updateShader.setIVec2("texDimensions", this.dataTextureWidth, this.dataTextureHeight);
            this.updateShader.setFloat("deltaTime", 0.01);
            this.updateShader.setFloat("time", this.timestamp);
            this.updateShader.setInt("nrParticle", this.nrParticles);
            this.updateShader.setInt("hashDimension", this.hashDimension);
            this.updateShader.setFloat("gridSize", this.maxPerceptionRadius);
            this.updateShader.setInt("hashSize", this.hashDimension * this.hashDimension);

            if(performance.now()/1000.0 - this.denySphereTimer > this.denySphereDuration){
                this.denySphereEnabled = 0;
            }

            this.updateShader.setInt("denySphereEnabled", this.denySphereEnabled);
            this.updateShader.setVec3("spherePosition", this.denySpherePosition[0], this.denySpherePosition[1], this.denySpherePosition[2]);
            this.updateShader.setFloat("sphereR", this.denySphereR);

            this.renderQuad();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        [this.updateInfoRead, this.updateInfoWrite] = [this.updateInfoWrite, this.updateInfoRead];


        // write pre-update position datas to buffer using transform feedback ==================================
        this.copyShader.use();
        this.copyShader.setIVec2("texDimensions", this.dataTextureWidth, this.dataTextureHeight);
        this.copyShader.setTexture(0, this.updateInfoRead.position);
        this.copyShader.setTexture(1, this.updateInfoRead.velocity);

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
    OnFrame(){

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

        //render background
        gl.viewport(0, 0, this.width, this.height);
        gl.depthMask(false);
        this.skyShader.use();
        this.skyShader.setTexture(0, this.texture.gradation);
        this.renderCube();

        
        // render instanced particles
        gl.viewport(0, 0,this.width, this.height);
        gl.depthMask(true);
        this.drawParticles();
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.reflectionInfo.fb);
        gl.clearColor(1.0,1.0,1.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, this.reflectionInfo.w, this.reflectionInfo.h);
        this.drawParticlesReflected();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        
        // render scene
        gl.viewport(0, 0, this.width, this.height);
        gl.depthMask(true);
        this.drawScene(this.shader);
        

        // render debug quads
        // let debug_w = this.width * 0.1;
        // gl.viewport(0, 0 ,debug_w, debug_w);
        // gl.depthFunc(gl.ALWAYS);
        // this.quadShader.use();
        // this.quadShader.setTexture(0, this.reflectionInfo.tex);
        // this.renderQuad();

        // gl.viewport(debug_w*1.2, 0 ,debug_w, debug_w);
        // this.quadShader.setTexture(0, this.sortInfoRead.tex);
        // this.renderQuad();

        // gl.viewport(debug_w*2.4, 0 ,debug_w, debug_w);
        // this.quadShader.setTexture(0, this.hash2indicesInfo.texBegin);
        // this.renderQuad();

    }

    OnClick(){
        let cp = this.camera.pos;
        let y = this.roostHeight*this.drawScale - cp[1];
        let f = this.camera.getFront();
        let t = y/f[1];
        if(t > 0){
            this.denySphereEnabled = 1;
            this.denySpherePosition = vec3.fromValues((cp[0]+f[0]*t)/this.drawScale, this.roostHeight, (cp[2]+f[2]*t) / this.drawScale);
            console.log(this.denySpherePosition[0], this.denySpherePosition[1],this.denySpherePosition[2]);
            this.denySphereTimer = performance.now()/1000.0;
        }
    }

    drawParticles(){
        let gl = this.gl;
        let model = mat4.create();

        // scale
        mat4.scale(model, model, vec3.fromValues(0.05, 0.05, 0.05));

        this.drawShader.use();
        this.drawShader.setMat4("model", model);
        this.drawShader.setVec3("camera", this.camera.pos[0], this.camera.pos[1], this.camera.pos[2]);
        this.drawShader.setFloat("drawScale", this.drawScale);
        this.drawShader.setInt("vertexReflection", 0);

        gl.bindVertexArray(this.drawInfo.va);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, this.drawInfo.size, this.nrParticles);
        gl.bindVertexArray(null);
    }

    drawParticlesReflected(){
        let gl = this.gl;
        let model = mat4.create();

        // scale
        mat4.scale(model, model, vec3.fromValues(0.05, 0.05, 0.05));

        this.drawShader.use();
        this.drawShader.setMat4("model", model);
        this.drawShader.setVec3("camera", this.camera.pos[0], this.camera.pos[1], this.camera.pos[2]);
        this.drawShader.setFloat("drawScale", this.drawScale);

        let n = vec3.fromValues(0, 1, 0);
        let p = vec3.fromValues(0, 0, 0);
        let reflection = mat4.fromValues(
            1-2*n[0]*n[0],  -2*n[0]*n[1],  -2*n[2]*n[0], 0,
             -2*n[0]*n[1], 1-2*n[1]*n[1],  -2*n[1]*n[2], 0,
             -2*n[2]*n[0],  -2*n[1]*n[2], 1-2*n[2]*n[2], 0,
            2*vec3.dot(n,p)*n[0], 2*vec3.dot(n,p)*n[1], 2*vec3.dot(n,p)*n[2], 1
        );
        this.drawShader.setInt("vertexReflection", 1);
        this.drawShader.setMat4("reflectionMatrix", reflection);

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
        mat4.scale(model, model, vec3.fromValues(4, 4, 4));
        shader.setMat4("model", model);
        shader.setVec2("res", this.width, this.height);
        // shader.setTexture(0, this.texture.gradationGround);
        shader.setTexture(0, this.reflectionInfo.tex);
        gl.enable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        this.renderPlane();
        gl.disable(gl.BLEND);
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