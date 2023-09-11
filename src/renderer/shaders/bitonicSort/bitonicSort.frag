#version 300 es
precision mediump float;

uniform sampler2D texRead;
uniform vec2 texDimensions;
uniform vec2 invTexDimensions;
uniform int stage;
uniform int offsetExp;
uniform int offset;

layout(location=0) out vec4 FragColor;

vec4 sampleTex(int i){
    vec2 texCoords;
    float fi = float(i);
    texCoords.x = mod(fi, texDimensions.x);
    texCoords.y = floor(fi * invTexDimensions.x);
    texCoords = (texCoords + 0.5) * invTexDimensions;
    return texture(texRead, texCoords);
}

void main(){
    int i = int(texDimensions.x*gl_FragCoord.y + gl_FragCoord.x);
    bool b1 = (i >> stage & 1) == 0;
    bool b2 = (i%(offset<<1)) >> offsetExp == 0;

    vec4 hashedParticle_i = texture(texRead, gl_FragCoord.xy * invTexDimensions);
    vec4 hashedParticle_j = sampleTex(b2 ? i+offset : i-offset);

    bool isInOrder = hashedParticle_i.y <= hashedParticle_j.y;
    bool isInReverseOrder = hashedParticle_i.y >= hashedParticle_j.y;

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