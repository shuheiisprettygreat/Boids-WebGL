#version 300 es
precision mediump float;

uniform sampler2D positionTexRead;
uniform sampler2D velocityTexRead;
uniform sampler2D bitangentTexRead;
uniform ivec2 texDimensions;

out vec3 position;
out vec3 velocity;
out vec3 bitangent;

void main() {
    ivec2 texCoords = ivec2(gl_VertexID%texDimensions.x, gl_VertexID/texDimensions.x);
    position = texelFetch(positionTexRead, texCoords, 0).xyz;
    velocity = texelFetch(velocityTexRead, texCoords, 0).xyz;
    bitangent = texelFetch(bitangentTexRead, texCoords, 0).xyz;
}