#version 300 es
precision mediump float;

uniform sampler2D texRead;
uniform ivec2 texDimensions;
uniform vec2 invTexDimensions;
uniform int stage;
uniform int offsetExp;
uniform int offset;

layout(location=0) out vec4 FragColor;

vec4 sampleTex(int i){
    ivec2 texCoords = ivec2(i%texDimensions.x, i/texDimensions.x);
    return  texelFetch(texRead, texCoords, 0);
}

bool compare(vec2 p, vec2 q){
    // Compare hash, or id when hash are equal.W
    return (p.y==q.y) ? p.x <= q.x : p.y <= q.y;
}

void main(){
    ivec2 ifrag = ivec2(gl_FragCoord.xy);
    int i = texDimensions.x*ifrag.y + ifrag.x;
    bool b1 = (i >> stage & 1) == 0; // true: decreasing order, false: increasing order
    bool b2 = (i%(offset<<1)) >> offsetExp == 0; // true: i is who compare, false: j is who os compared. 

    vec4 hashedParticle_i = texelFetch(texRead, ifrag, 0);
    vec4 hashedParticle_j = sampleTex(b2 ? i+offset : i-offset);

    bool isInOrder = compare(hashedParticle_i.xy, hashedParticle_j.xy);

    isInOrder = b1==b2 ? isInOrder : !isInOrder;
    if(isInOrder){
        FragColor = hashedParticle_i;
    } else {
        FragColor = hashedParticle_j;
    }

}