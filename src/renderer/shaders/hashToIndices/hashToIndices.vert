#version 300 es
precision mediump float;

uniform sampler2D sortedTex;
uniform ivec2 texDimensions;
uniform int nrParticles;
uniform float hashDimension;

out vec2 iIndices;
out float iHash;

vec4 sampleTex(int i){
    ivec2 texCoords = ivec2(i%texDimensions.x, i/texDimensions.x);
    return  texelFetch(sortedTex, texCoords, 0);
}

void main() {
    
    vec2 hashAndIndecis = sampleTex(gl_VertexID).xy;
    float hash_prev = sampleTex(gl_VertexID !=0 ? gl_VertexID-1 : nrParticles-1).y;
    float hash_next = sampleTex(gl_VertexID != nrParticles-1 ? gl_VertexID+1 : 0).y;

    bool b1 = hashAndIndecis.y != hash_prev;
    bool b2 = hashAndIndecis.y != hash_next;

    float x = 2.0*mod(hashAndIndecis.y, hashDimension) / hashDimension - 1.0;
    float y = 2.0*floor(hashAndIndecis.y/hashDimension) / hashDimension - 1.0;

    gl_Position = vec4(x, y, 0, 1);
    gl_PointSize = 1.0;

    if(b1 && b2){
        // only this particle has this hash
        iIndices = vec2(hashAndIndecis.x, hashAndIndecis.x+1.0);
        iHash = hashAndIndecis.y;
    } 
    else if(b1){
        iIndices = vec2(hashAndIndecis.x, 0.0);
        iHash = hashAndIndecis.y;
    }
    else if(b2){
        iIndices = vec2(0.0, hashAndIndecis.x+1.0);
        iHash = hashAndIndecis.y;
    }else{
        iIndices = vec2(0.0, 0.0);
    }
}