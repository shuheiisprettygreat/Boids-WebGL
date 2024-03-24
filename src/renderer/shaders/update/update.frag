#version 300 es
precision mediump float;

uniform sampler2D positionTexRead;
uniform sampler2D velocityTexRead;
uniform sampler2D bitangentTexRead;
uniform ivec2 texDimensions;
uniform float deltaTime;
uniform int nrParticle;

uniform float v0;
uniform float M;

uniform sampler2D sortedHashedIdTex;
uniform sampler2D hash2indicesBeginTex;
uniform sampler2D hash2indicesEndTex;
uniform int hashDimension;



uniform float gridSize;
uniform int hashSize;

layout(location=0) out vec4 positionColor;
layout(location=1) out vec4 VelocityColor;
layout(location=2) out vec4 bitangentColor;

// ------------ 3d hash ------------
#define P1 842167
#define P2 881477
#define P3 742219

#define PI 3.1415926

ivec3 grid2positiveGrid(ivec3 grid){
    grid.x = grid.x<0 ? -grid.x*2 : grid.x*2+1;
    grid.y = grid.y<0 ? -grid.y*2 : grid.y*2+1;
    grid.z = grid.z<0 ? -grid.z*2 : grid.z*2+1;
    return grid;
}

ivec3 pos2grid(vec3 v){
    return ivec3(floor(v / gridSize));
}

int grid2hash(ivec3 grid){
    return ((grid.x*P1) ^ (grid.y*P2) ^ (grid.z*P3)) % hashSize;
}

// ------------ main ------------

vec4 sampleAs1D(sampler2D tex, ivec2 dim, int i){
    ivec2 texCoord = ivec2(i%dim.x, i/dim.x);
    return texelFetch(tex, texCoord, 0);
}

vec3 limit(vec3 v, float cap){
    if(length(v) > cap){
        return normalize(v)*cap;
    }
    return v;
}



void main(){
    vec3 position = texelFetch(positionTexRead, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 velocity = texelFetch(velocityTexRead, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 bitangent = texelFetch(bitangentTexRead, ivec2(gl_FragCoord.xy), 0).xyz;

    position += velocity * deltaTime;

    positionColor = vec4(position, 1.0);
    VelocityColor = vec4(velocity, 1.0);
    bitangentColor = vec4(bitangent, 1.0);
}