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
uniform float wa;
uniform float wc;
uniform vec2 roostXZ;
uniform float roostHeight;
uniform float wRoostH;
uniform float wRoostV;

uniform int hashDimension;

uniform float gridSize;
uniform int hashSize;

layout(location=0) out vec4 positionColor;
layout(location=1) out vec4 VelocityColor;
layout(location=2) out vec4 bitangentColor;
layout(location=3) out vec4 rangeColor1;
layout(location=4) out vec4 rangeColor2;

#define TAU 6.28318531

#define BLINDANGLE (TAU*0.25)
#define COSBLINDANGLE cos(TAU*0.5 - BLINDANGLE*0.5)

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
    ivec2 ifrag = ivec2(gl_FragCoord.xy);
    int thisId = ifrag.x + ifrag.y*texDimensions.x;
    vec3 position = texelFetch(positionTexRead, ifrag, 0).xyz;
    vec3 velocity = texelFetch(velocityTexRead, ifrag, 0).xyz;
    vec3 bitangent = texelFetch(bitangentTexRead, ifrag, 0).xyz;
    vec4 range1 = texelFetch(range1Tex, ifrag, 0);
    vec4 range2 = texelFetch(range2Tex, ifrag, 0);

    vec3 tangent = normalize(velocity);
    bitangent = normalize(cross(tangent, vec3(0,1,0)));

    vec3 force = vec3(0);
    
    // topological interaction
    // NOTE : range2.x is range updated on 5 frame before.
    float neighborRange = range2.x; 
    int neighborCount = 0;
    int neighborVisibleCount = 0;
    int centralityNeighborCount = 0;

    vec3 separationVectorSum = vec3(0.0);
    vec3 cohesionVectorSum = vec3(0.0);
    vec3 centralityVectorSum = vec3(0.0);
    vec3 alignmentVectorSum = vec3(0.0);

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
            
            vec3 d = posOther - position; 
            float dMag = d!=vec3(0.0) ? length(d) : 0.0;
            
            // this indivisual is inside perception range!
            float insideRange = 1.0 - step(neighborRange, dMag);

            // this indivisual is inside visible perception range!
            float visible = step(dMag*COSBLINDANGLE, dot(tangent, d));

            neighborCount += int(insideRange);
            neighborVisibleCount += int(insideRange) * int(visible);

            separationVectorSum += insideRange * getSeparationVector(d);
            cohesionVectorSum += insideRange * visible * step(rh,dMag) * d;

            float centralityCheck = 1.0 - step(2.0*neighborRange, dMag);
            centralityNeighborCount += int(centralityCheck);
            centralityVectorSum += d*centralityCheck;

            alignmentVectorSum += insideRange * visible * (normalize(velOther) - tangent);
        }
    }}}

    // compute social forces
    vec3 separationForce = neighborCount== 0 ? vec3(0.0) : -ws/float(neighborCount)*separationVectorSum;

    float centralityFactor = centralityNeighborCount==0 ? 0.0 : length(centralityVectorSum) / float(centralityNeighborCount);
    vec3 cohesionForce =  neighborVisibleCount==0 ? vec3(0.0) : centralityFactor*wc/float(neighborVisibleCount)*cohesionVectorSum;

    vec3 alignmentForce = neighborVisibleCount==0 ? vec3(0.0) : wa*normalize(alignmentVectorSum);

    vec3 socialForce = separationForce + cohesionForce + alignmentForce;

    // roost attraction
    vec3 n = normalize(position - vec3(roostXZ.x, 0.0, roostXZ.y));
    float multiplier = mix(-1.0, 1.0, step(0.0, n.x*tangent.z - n.z*tangent.x));
    vec3 roostForceH = wRoostH * (0.5 + 0.5*dot(n, tangent)) * bitangent * multiplier;
    vec3 roostForceV = wRoostV * (roostHeight - position.y) * vec3(0.0, 1.0, 0.0);

    force += socialForce;
    force += roostForceH;
    force += roostForceV;
    force += computeCruiseForce(velocity);
    force += computeRandomForce(position);

    // force += -position * 0.1 * step(200.0, length(position));

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