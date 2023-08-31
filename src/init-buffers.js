function initVAO(gl){
    const cube = initCubeVAO(gl);
    const plane = initPlaneVAO(gl);
    const quad = initQuadVAO(gl);
    return {cube: cube, plane: plane, quad: quad};
}

function initTexture(gl, pathHash){
    let result = {};
    for(let key in pathHash){
        result[key] = gl.createTexture();
    }

    for(let key in pathHash){
        const img = new Image();
        img.onload = function(){handleTextureLoaded(gl, img, result[key]);}
        img.src = pathHash[key];
    }
    
    return result;
}

function handleTextureLoaded(gl, img, texture){
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

function initCubeVAO(gl){
    const arr = [
        // back face
        -1, -1, -1,  0,  0, -1, 0, 0, // bottom-left
         1,  1, -1,  0,  0, -1, 1, 1, // top-right
         1, -1, -1,  0,  0, -1, 1, 0, // bottom-right         
         1,  1, -1,  0,  0, -1, 1, 1, // top-right
        -1, -1, -1,  0,  0, -1, 0, 0, // bottom-left
        -1,  1, -1,  0,  0, -1, 0, 1, // top-left
        // front face
        -1, -1,  1,  0,  0,  1, 0, 0, // bottom-left
         1, -1,  1,  0,  0,  1, 1, 0, // bottom-right
         1,  1,  1,  0,  0,  1, 1, 1, // top-right
         1,  1,  1,  0,  0,  1, 1, 1, // top-right
        -1,  1,  1,  0,  0,  1, 0, 1, // top-left
        -1, -1,  1,  0,  0,  1, 0, 0, // bottom-left
        // left face
        -1,  1,  1, -1,  0,  0, 1, 0, // top-right
        -1,  1, -1, -1,  0,  0, 1, 1, // top-left
        -1, -1, -1, -1,  0,  0, 0, 1, // bottom-left
        -1, -1, -1, -1,  0,  0, 0, 1, // bottom-left
        -1, -1,  1, -1,  0,  0, 0, 0, // bottom-right
        -1,  1,  1, -1,  0,  0, 1, 0, // top-right
        // // right face
         1,  1,  1,  1,  0,  0, 1, 0, // top-left
         1, -1, -1,  1,  0,  0, 0, 1, // bottom-right
         1,  1, -1,  1,  0,  0, 1, 1, // top-right         
         1, -1, -1,  1,  0,  0, 0, 1, // bottom-right
         1,  1,  1,  1,  0,  0, 1, 0, // top-left
         1, -1,  1,  1,  0,  0, 0, 0, // bottom-left     
        // bottom face
        -1, -1, -1,  0, -1,  0, 0, 1, // top-right
         1, -1, -1,  0, -1,  0, 1, 1, // top-left
         1, -1,  1,  0, -1,  0, 1, 0, // bottom-left
         1, -1,  1,  0, -1,  0, 1, 0, // bottom-left
        -1, -1,  1,  0, -1,  0, 0, 0, // bottom-right
        -1, -1, -1,  0, -1,  0, 0, 1, // top-right
        // top face
        -1,  1, -1,  0,  1,  0, 0, 1, // top-left
         1,  1 , 1,  0,  1,  0, 1, 0, // bottom-right
         1,  1, -1,  0,  1,  0, 1, 1, // top-right     
         1,  1,  1,  0,  1,  0, 1, 0, // bottom-right
        -1,  1, -1,  0,  1,  0, 0, 1, // top-left
        -1,  1,  1,  0,  1,  0, 0, 0  // bottom-left            
    ];

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 8*4, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 8*4, 3*4);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 8*4, 6*4);
    
    gl.bindVertexArray(null);

    return vao;
}

function initPlaneVAO(gl){
    const arr = [
        //vertex, normal, texCoord
        1, 0,  1, 0, 1, 0, 1, 0,
        -1, 0,  1, 0, 1, 0, 0, 0,
        -1, 0, -1, 0, 1, 0, 0, 1,
    
         1, 0,  1, 0, 1, 0, 1, 0,
        -1, 0, -1, 0, 1, 0, 0, 1,
         1, 0, -1, 0, 1, 0, 1, 1         
    ];

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 8*4, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 8*4, 3*4);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 8*4, 6*4);
    
    gl.bindVertexArray(null);

    return vao;
}

function initQuadVAO(gl){
    const arr = [
        //vertex(2), texCoord(2)
        -1,  1,  0, 1,
        -1, -1,  0, 0,
         1, -1,  1, 0,

        -1,  1,  0, 1,
         1, -1,  1, 0,
         1,  1,  1, 1     
    ];

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4*4, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 4*4, 2*4);
    
    gl.bindVertexArray(null);

    return vao;
}

export {initVAO, initTexture}