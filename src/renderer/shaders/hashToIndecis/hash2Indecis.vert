#version 300 es
precision mediump float;

layout (location = 0) in vec2 aPos;
layout (location = 1) in vec2 aTex;

uniform sampler2D sortedTex;
uniform ivec2 texDimensions;
uniform int nrParticle;

out vec3 velocity;

vec4 sampleTex(int i){
    ivec2 texCoords = ivec2(i%texDimensions.x, i/texDimensions.x);
    return  texelFetch(sortedTex, texCoords, 0);
}

void main() {
    
    vec2 hashAndIndecis = sampleTex(gl_InstanceID).xy;
    vec2 hashAndIndecis_prev = sampleTex(gl_InstanceID !=0 ? gl_InstanceID-1 : nrParticle-1).xy;
    vec2 hashAndIndecis_next = sampleTex(gl_InstanceID != nrParticle-1 ? gl_InstanceID+1 : 0).xy;

    if(hashAndIndecis.y != hashAndIndecis_prev){
        
    }

    position = texelFetch(positionTexRead, texCoords, 0).xyz;
    velocity = texelFetch(velocityTexRead, texCoords, 0).xyz;
}