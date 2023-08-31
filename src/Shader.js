class Shader{

    constructor(gl, vsSource, fsSource, transformFeedbackVar){
        this.gl = gl;

        const vert = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const frag = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        
        this.id = gl.createProgram();
        gl.attachShader(this.id, vert);
        gl.attachShader(this.id, frag);


        if(transformFeedbackVar){
            gl.transformFeedbackVaryings(this.id, transformFeedbackVar, gl.SEPARATE_ATTRIBS);
        }

        gl.linkProgram(this.id);

        if(!gl.getProgramParameter(this.id, gl.LINK_STATUS)){
            alert(`failed initialize shader program ${gl.getProgramInfoLog(this.id)}`);
            return null;
        }

        gl.deleteShader(vert);
        gl.deleteShader(frag);
    }

    use(){
        this.gl.useProgram(this.id);
    }

    setBool(name, value){
        let gl = this.gl;
        gl.uniform1i(gl.getUniformLocation(this.id, name), Math.floor(value));
    }

    setInt(name, value){
        let gl = this.gl;
        gl.uniform1i(gl.getUniformLocation(this.id, name), value);
    }

    setFloat(name, value){
        let gl = this.gl;
        gl.uniform1f(gl.getUniformLocation(this.id, name), value);
    }

    setVec2(name, x, y) {
        let gl = this.gl;
        gl.uniform2f(gl.getUniformLocation(this.id, name), x, y);
    }

    setVec3(name, x, y, z) {
        let gl = this.gl;
        gl.uniform3f(gl.getUniformLocation(this.id, name), x, y, z);
    }

    setMat4(name, mat){
        let gl = this.gl;
        gl.uniformMatrix4fv(gl.getUniformLocation(this.id, name), false, mat);
    }
    
}


function loadShader(gl, type, source){
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
        alert(`failed compile shader: ${gl.getShaderInfoLog(shader)}`);
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

export {Shader}