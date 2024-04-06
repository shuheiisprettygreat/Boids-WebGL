#version 300 es
precision mediump float;

uniform sampler2D sortedTex;
uniform ivec2 texDimensions;
uniform int nrParticles;
uniform int hashDimension;

out vec2 iIndices;

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

    int hash = int(hashAndIndecis.y);

    int x = hash%hashDimension;
    int y = hash/hashDimension;

    vec2 pos = vec2(2*x-hashDimension, 2*y-hashDimension) + 0.5;
    gl_Position = vec4(pos/float(hashDimension), 0.0, 1.0);
    gl_PointSize = 1.0;

    // cast to float
    iIndices = vec2(0.0, 0.0);
    iIndices.x += b1 ? float(gl_VertexID) : 0.0;
    iIndices.y += b2 ? float(gl_VertexID+1) : 0.0;
}