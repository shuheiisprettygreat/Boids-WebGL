#version 300 es
precision mediump float;

uniform sampler2D positionTexRead;
uniform sampler2D velocityTexRead;
uniform ivec2 texDimensions;

out vec4 positionAndBanking;
out vec3 velocity;

void main() {
    ivec2 texCoords = ivec2(gl_VertexID%texDimensions.x, gl_VertexID/texDimensions.x);
    positionAndBanking = texelFetch(positionTexRead, texCoords, 0);
    velocity = texelFetch(velocityTexRead, texCoords, 0).xyz;
}