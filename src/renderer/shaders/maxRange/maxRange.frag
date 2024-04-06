#version 300 es
precision mediump float;

uniform sampler2D texRead;
uniform ivec2 texDimensions;
uniform int nrParticles;
uniform int stride;

layout(location=0) out vec4 FragColor;

vec4 sampleTex(int i){
    ivec2 texCoords = ivec2(i%texDimensions.x, i/texDimensions.x);
    return  texelFetch(texRead, texCoords, 0);
}

void main(){
    ivec2 ifrag = ivec2(gl_FragCoord.xy);
    int i = texDimensions.x*ifrag.y + ifrag.x;
    vec4 v1 = sampleTex(i);
    vec4 v2 = i+stride<nrParticles ? sampleTex(i+stride) : vec4(0.0);
    FragColor = max(v1, v2);
}