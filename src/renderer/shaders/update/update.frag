#version 300 es
precision mediump float;

uniform sampler2D positionTexRead;
uniform sampler2D velocityTexRead;
uniform sampler2D bitangentTexRead;
uniform sampler2D sortedHashedIdTex;
uniform sampler2D hash2indicesBeginTex;
uniform sampler2D hash2indicesEndTex;
uniform sampler2D range1Tex;
uniform sampler2D range2Tex;

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
uniform float nc;
uniform float rh;
uniform float gammaSq;
uniform float ws;

uniform int hashDimension;

uniform float gridSize;
uniform int hashSize;

layout(location=0) out vec4 positionColor;
layout(location=1) out vec4 VelocityColor;
layout(location=2) out vec4 bitangentColor;
layout(location=3) out vec4 rangeColor1;
layout(location=4) out vec4 rangeColor2;

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

vec3 getSeparationVector(vec3 d){
    float l = min(0.0, length(d) - rh);
    float g = exp(-l*l/gammaSq);
    return d*g;
}

void main(){
    vec3 position = texelFetch(positionTexRead, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 velocity = texelFetch(velocityTexRead, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 bitangent = texelFetch(bitangentTexRead, ivec2(gl_FragCoord.xy), 0).xyz;
    vec4 range1 = texelFetch(range1Tex, ivec2(gl_FragCoord.xy), 0);
    vec4 range2 = texelFetch(range2Tex, ivec2(gl_FragCoord.xy), 0);

    vec3 force = vec3(0);
    force += computeCruiseForce(velocity);
    force += computeRandomForce(position);

    // topological interaction
    // NOTE : range2.x is range updated on 5 frame before.
    float neighborRange = range2.x; 
    int neighborCount = 0;

    vec3 separationVectorSum = vec3(0.0);

    // Compute neighborhood.
    ivec3 grid = pos2grid(position);
    for(int dx=-1; dx<2; dx++){ for(int dy=-1; dy<2; dy++){ for(int dz=-1; dz<2; dz++){
        ivec3 neighborGrid = grid2positiveGrid(grid + ivec3(dx, dy, dz));
        int neighborHash = grid2hash(neighborGrid);

        ivec2 indexRangeBegin = ivec2(
            sampleAs1D(hash2indicesBeginTex, ivec2(hashDimension, hashDimension), neighborHash).xy
        );
        ivec2 indexRangeEnd = ivec2(
            sampleAs1D(hash2indicesEndTex, ivec2(hashDimension, hashDimension), neighborHash).xy
        );

        ivec2 indexRange;
        if(indexRangeBegin.y != 0){
            indexRange = indexRangeBegin;
        } else {
            indexRange = ivec2(indexRangeBegin.x, indexRangeEnd.y);
        }

        for(int i=indexRange.x; i<indexRange.y; i++){
            int otherId = int(sampleAs1D(sortedHashedIdTex, texDimensions, i).x);
            vec3 posOther = sampleAs1D(positionTexRead, texDimensions, otherId).xyz;
            vec3 velOther = sampleAs1D(velocityTexRead, texDimensions, otherId).xyz;
            
            vec3 diff = posOther - position;
            float distSq = dot(diff, diff);
            
            // this indivisual is inside parception range!
            if(distSq < neighborRange*neighborRange){
                neighborCount++;
                separationVectorSum += getSeparationVector(diff);
            }
        }
    }}}

    vec3 separationForce = -ws/float(neighborCount)*separationVectorSum;

    force += separationForce;

    if(length(position) > 100.0)
        force += -position * 0.1;

    // Update Neighbor Range
    float newNeighborRange = (1.0-s)*neighborRange + s*Rmax*(1.0 - float(neighborCount)/nc);
    newNeighborRange = clamp(newNeighborRange, 0.0, Rmax);
    range2 = vec4(range1.w, range2.xyz);
    range1 = range1.xxyz;
    range1.x = newNeighborRange;

    // debug can be done with range texture's latter entries.
    // range2.w = float(neighborCount);

    velocity += force/M * deltaTime;
    position += velocity * deltaTime;

    positionColor = vec4(position, 1.0);
    VelocityColor = vec4(velocity, 1.0);
    bitangentColor = vec4(bitangent, 1.0);
    rangeColor1 = range1;
    rangeColor2 = range2;
}