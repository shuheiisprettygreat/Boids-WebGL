#version 300 es
precision mediump float;

uniform sampler2D sortedTex;
uniform int texDimensionsX;
uniform int nrParticles;
uniform int hashDimension;

out float iTarget;
out vec2 iIndices;

vec4 sampleTex(int i){
    ivec2 texCoords = ivec2(i%texDimensionsX, i/texDimensionsX);
    return  texelFetch(sortedTex, texCoords, 0);
}

void main() {
    
    vec2 hashAndIndecis = sampleTex(gl_VertexID).xy;
    float hash_prev = sampleTex(gl_VertexID !=0 ? gl_VertexID-1 : nrParticles-1).y;
    float hash_next = sampleTex(gl_VertexID != nrParticles-1 ? gl_VertexID+1 : 0).y;

    bool b1 = hashAndIndecis.y != hash_prev;
    bool b2 = hashAndIndecis.y != hash_next;

    int hash = int(hashAndIndecis.y);

    int x = hash%hashDimension;
    int y = hash/hashDimension;

    vec2 pos = vec2(2*x-hashDimension, 2*y-hashDimension) + 0.5;
    gl_Position = vec4(pos/float(hashDimension), 0.0, 1.0);

    if(b1 && b2){
        // only this particle has this hash
        iIndices = vec2(gl_VertexID, gl_VertexID+1);
        iTarget = 0.0;
    } 
    else if(b1){
        iIndices = vec2(gl_VertexID, 0.0);
        iTarget = 0.0;
    }
    else if(b2){
        iIndices = vec2(0.0, gl_VertexID+1);
        iTarget = 1.0;
    }else{
        iIndices = vec2(0.0, 0.0);
        iTarget = -1.0;
    }

}