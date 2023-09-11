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
    ivec2 texCoords = ivec2(i%texDimensions.x, i/int(texDimensions.x));
    return  texelFetch(texRead, texCoords, 0);
}

void main(){
    ivec2 ifrag = ivec2(gl_FragCoord.xy);
    int i = texDimensions.x*ifrag.y + ifrag.x;
    bool b1 = (i >> stage & 1) == 0; // 降順に並べる
    bool b2 = (i%(offset<<1)) >> offsetExp == 0; //compera(i, j)のどちら側か．trueでi

    vec4 hashedParticle_i = texelFetch(texRead, ifrag, 0);
    vec4 hashedParticle_j = sampleTex(b2 ? i+offset : i-offset);

    bool isInOrder = hashedParticle_i.y <= hashedParticle_j.y;
    bool isInReverseOrder = hashedParticle_j.y <= hashedParticle_i.y;

    if(isInOrder && isInReverseOrder){
        FragColor = hashedParticle_j;
        return;
    }

    isInOrder = b1==b2 ? isInOrder : !isInOrder;
    if(isInOrder){
        FragColor = hashedParticle_i;
    } else {
        FragColor = hashedParticle_j;
    }

}