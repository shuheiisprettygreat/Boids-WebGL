import jsonText1 from './json/torus.json?raw';

class Json2Va{
    
    constructor(gl){
        this.gl = gl;

        const jsons = [jsonText1];
        this.vaList = [];
        this.sizeList = [];

        jsons.forEach(text => {
            const data = JSON.parse(text);
            const va = this.data2va(data);
            this.sizeList.push(data["mVertexPoints"].length);
            this.vaList.push(va);
        });

    }

    data2va(data){
        let gl = this.gl;
        const result = gl.createVertexArray();
        gl.bindVertexArray(result);

        const vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data["mVertexPoints"]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        const nBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data["mVertexNormals"]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

        const tBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data["mTextureCoords"]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);

        gl.bindVertexArray(null);

        return result;
    }
}

export {Json2Va}