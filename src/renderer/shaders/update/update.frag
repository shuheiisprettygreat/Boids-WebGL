#version 300 es
precision mediump float;

uniform sampler2D positionTexRead;
uniform sampler2D velocityTexRead;
uniform sampler2D bitangentTexRead;
uniform ivec2 texDimensions;
uniform float deltaTime;
uniform int nrParticle;

uniform float v0;
uniform float tau;
uniform float M;
uniform float weightRandomForce;
uniform float Rmax;
uniform float du;
uniform float s;

uniform sampler2D sortedHashedIdTex;
uniform sampler2D hash2indicesBeginTex;
uniform sampler2D hash2indicesEndTex;
uniform int hashDimension;

uniform float gridSize;
uniform int hashSize;

layout(location=0) out vec4 positionColor;
layout(location=1) out vec4 VelocityColor;
layout(location=2) out vec4 bitangentColor;

#define TAU 6.28318531

// === ======= ===
// === 3d hash ===
// === ======= ===
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

// === ==== ===
// === hash ===
// === ==== ===

float hash1(uint n){
    // integer hash copied from Hugo Elias
	n = (n << 13U) ^ n;
    n = n * (n * n * 15731U + 789221U) + 1376312589U;
    return float( n & uint(0x7fffffffU))/float(0x7fffffff);
}

// iq hash 2 - uintx3 => float01x3
#define HASHPARAM 1103515245U
vec3 hash(uvec3 x){
    x = ((x>>8U)^x.yzx)*HASHPARAM;
    x = ((x>>8U)^x.yzx)*HASHPARAM;
    x = ((x>>8U)^x.yzx)*HASHPARAM;
    
    return vec3(x)*(1.0/float(0xffffffffU));
}

// === ==== ===
// === main ===
// === ==== ===

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

vec3 randomInsideSphere(uvec3 seed){
    vec3 rand = hash(seed);
    float r = pow(rand.x, 0.3333);
    float t = TAU * rand.y;
    float p = acos(2.0*rand.z - 1.0);
    float sp = sin(p);
    return vec3(r*sp*cos(t), r*sp*sin(t), r*cos(p));
}

vec3 computeCruiseForce(vec3 velocity){
    float l = length(velocity);
    vec3 tangent = velocity / l;

    vec3 result = tangent * (M*(v0-l)/tau);
    return result;
}

vec3 computeRandomForce(vec3 p){
    vec3 randSphere = randomInsideSphere(floatBitsToUint(p));
    return randSphere * weightRandomForce; 
}

void main(){
    vec3 position = texelFetch(positionTexRead, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 velocity = texelFetch(velocityTexRead, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 bitangent = texelFetch(bitangentTexRead, ivec2(gl_FragCoord.xy), 0).xyz;

    vec3 force = vec3(0);
    force += computeCruiseForce(velocity);
    force += computeRandomForce(position);

    // topological interaction
    // float r = updateRange(position, )

    velocity += force/M * deltaTime;
    position += velocity * deltaTime;

    positionColor = vec4(position, 1.0);
    VelocityColor = vec4(velocity, 1.0);
    bitangentColor = vec4(bitangent, 1.0);
}