/**
 * Create Vertex Array. Each buffer should be packed (i.e. non-interleaved).
 * @param {*} gl gl context
 * @param {*} nameBufferSizePairs Nx3 array [[name1,buffer1,size1], [name2, buffer2,size2], ...]
 */
function createVertexArray(gl, nameBufferSizePairs){
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    for(const [name, buffer, size] of nameBufferSizePairs){
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(name);
        gl.vertexAttribPointer(name, size, gl.FLOAT, false, 0, 0);
    }
    return vao;
}

/**
 * Create buffer.
 */
function createBuffer(gl, sizeOrData, usage){
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, sizeOrData, usage);
    return buf;
}

/**
 * Create texture object, without mipmap.
 */
function createTexture(gl, data, sizePerPixel, internalFormat, format, type, width, height, filter, wrap){

    if(!filter){
        filter = gl.NEAREST;
    }

    if(!wrap){
         wrap = gl.CLAMP_TO_EDGE;
    }

    if(data){
        const _data = new Float32Array(width*height*sizePerPixel);
        _data.set(data, 0);
        data = _data;
    }

    const result = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, result);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return result;
}

/**
 * Create minimum framebuffer, attaching texture to COLOR_ARRACHMENT0
 */
function createFramebuffer(gl, tex){
    const result = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, result);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return result;
}

export{
    createVertexArray,
    createBuffer,
    createTexture,
    createFramebuffer
}


